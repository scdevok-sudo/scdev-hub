import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { clearToken, setToken } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

/**
 * Aterrizaje del OAuth: el backend redirige aca con ?token=<JWT>.
 * Guarda el token, lo saca de la URL y manda al dashboard.
 */
export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    // StrictMode monta dos veces en dev; el token se procesa una sola.
    if (handled.current) return
    handled.current = true

    const token = params.get('token')
    if (!token) {
      navigate('/login?error=oauth', { replace: true })
      return
    }

    setToken(token)
    // El token no queda en el historial ni se filtra por Referer.
    window.history.replaceState({}, '', '/auth/callback')

    void useAuthStore
      .getState()
      .fetchMe()
      .then(() => {
        if (useAuthStore.getState().user) {
          navigate('/dashboard', { replace: true })
        } else {
          clearToken()
          navigate('/login?error=oauth', { replace: true })
        }
      })
  }, [params, navigate])

  return (
    <div className="grid min-h-screen place-items-center bg-onix">
      <div className="flex items-center gap-3 text-sm text-txt2">
        <Loader2 className="size-5 animate-spin text-red" />
        Iniciando sesion...
      </div>
    </div>
  )
}
