import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarCheck2, CalendarX2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { api, getToken } from '@/lib/api'

interface CalendarStatus {
  connected: boolean
  reason: 'not_connected' | 'revoked' | 'missing_scope' | 'error' | null
}

const REASON_TEXT: Record<string, string> = {
  not_connected: 'Todavia no autorizaste el acceso a tu Google Calendar.',
  revoked: 'El acceso fue revocado o vencio. Volve a conectarlo.',
  missing_scope: 'Falta el permiso de Calendar: en la pantalla de Google dejalo tildado.',
  error: 'No se pudo verificar la conexion con Google. Reintenta en un momento.',
}

const RESULT_TEXT: Record<string, { text: string; ok: boolean }> = {
  connected: { text: 'Google Calendar conectado.', ok: true },
  missing_scope: { text: 'No se otorgo el permiso de Calendar. Volve a intentar y dejalo tildado.', ok: false },
  forbidden: { text: 'Solo un admin puede conectar Google Calendar con su propia cuenta.', ok: false },
  error: { text: 'Google no completo la autorizacion. Intenta de nuevo.', ok: false },
}

/** Admin-only: el login no pide Calendar; este boton dispara el consentimiento aparte. */
export function CalendarConnectCard() {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [params, setParams] = useSearchParams()
  const result = RESULT_TEXT[params.get('calendar') ?? '']

  useEffect(() => {
    let cancelled = false
    api
      .get<CalendarStatus>('/auth/calendar/status')
      .then((data) => !cancelled && setStatus(data))
      .catch(() => !cancelled && setStatus({ connected: false, reason: 'error' }))
    return () => {
      cancelled = true
    }
  }, [])

  const connect = () => {
    const token = getToken()
    if (!token) return
    window.location.href = api.calendarConnectUrl(token)
  }

  const connected = status?.connected === true

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-txt3">Google Calendar</h2>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-graphite p-4">
        {connected ? (
          <CalendarCheck2 className="size-5 shrink-0 text-emerald-400" />
        ) : (
          <CalendarX2 className="size-5 shrink-0 text-txt3" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-txt">
            {status === null ? 'Verificando conexion...' : connected ? 'Conectado' : 'No conectado'}
          </p>
          <p className="text-[11px] text-txt3">
            {connected
              ? 'Los vencimientos con sincronizacion se crean en tu calendario principal.'
              : status?.reason
                ? REASON_TEXT[status.reason]
                : 'Necesario para sincronizar vencimientos de Monotributo y mantenimientos.'}
          </p>
          {result && (
            <p className={`mt-1 text-[11px] ${result.ok ? 'text-emerald-400' : 'text-red'}`}>
              {result.text}{' '}
              <button className="underline" onClick={() => setParams({}, { replace: true })}>
                Cerrar
              </button>
            </p>
          )}
        </div>
        {status !== null && (
          <Button size="sm" variant={connected ? 'outline' : 'primary'} onClick={connect}>
            {connected ? 'Reconectar' : 'Conectar Google Calendar'}
          </Button>
        )}
      </div>
    </section>
  )
}
