const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

/**
 * El JWT vive en localStorage y viaja en Authorization: Bearer.
 * No se usan cookies HttpOnly: en Vercel serverless el frontend y el backend
 * quedan cross-site y la cookie no sobrevive el round trip.
 */
const TOKEN_KEY = 'scdev_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Modo privado o storage bloqueado: la sesion dura lo que dure la pestana.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nada que limpiar.
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | undefined | null>
}

async function request<T>(path: string, { method = 'GET', body, params }: Options = {}): Promise<T> {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, BASE_URL)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Token vencido o invalido: descartarlo para no reintentar con basura.
  if (res.status === 401 && token) clearToken()

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const data: unknown = text ? JSON.parse(text) : null

  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail) && detail.length > 0
          ? String((detail[0] as { msg?: string }).msg ?? 'Error de validacion')
          : `Error ${res.status}`
    throw new ApiError(res.status, message)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, params?: Options['params']) => request<T>(path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  loginUrl: () => new URL('/auth/google/login', BASE_URL).toString(),
}
