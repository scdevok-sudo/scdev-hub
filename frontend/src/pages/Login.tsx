import { useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'

const ERRORS: Record<string, string> = {
  oauth: 'No se pudo completar el login con Google. Intentá de nuevo.',
  email: 'Google no devolvió un email verificado.',
  not_allowed: 'Ese email no está habilitado. SCdev Hub es solo para el equipo.',
}

export default function Login() {
  const [params] = useSearchParams()
  const error = params.get('error')

  return (
    <main className="grid min-h-screen place-items-center bg-onix px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <img src="/favicon.png" alt="SCdev" width={64} height={64} className="size-16" />
        </div>

        <h1 className="text-xl font-normal text-txt">Bienvenido de vuelta</h1>
        <p className="mt-2 text-sm text-txt2">
          Acceso restringido al equipo de SCdev.
        </p>

        {error && (
          <p className="mt-6 rounded-lg border border-red/30 bg-red-dim px-4 py-3 text-xs text-red">
            {ERRORS[error] ?? 'Ocurrió un error al iniciar sesión.'}
          </p>
        )}

        <a
          href={api.loginUrl()}
          className="mt-8 flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-line bg-graphite text-sm font-medium text-txt transition-colors hover:border-txt3 hover:bg-graphite2"
        >
          <GoogleMark />
          Continuar con Google
        </a>

        <p className="mt-6 text-[11px] text-txt3">
          Solo los emails del equipo tienen acceso. No hay registro público.
        </p>
      </div>
    </main>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 7l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.4z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  )
}
