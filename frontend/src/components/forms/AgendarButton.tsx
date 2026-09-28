import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { ApiError, api } from '@/lib/api'

interface AgendarButtonProps {
  /** Endpoint POST que crea el evento, ej. `/tasks/{id}/agendar`. */
  path: string
  onDone: () => void
}

/** Boton "Agendar" para calendar_sync='manual': crea el evento una vez.
 * Mismo componente en los 4 lugares (tasks, invoices, client-services, hitos). */
export function AgendarButton({ path, onDone }: AgendarButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const agendar = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.post(path)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo agendar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void agendar()}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-medium text-txt2 transition-colors hover:text-txt disabled:opacity-50"
      >
        <CalendarPlus className="size-3.5" />
        {loading ? 'Agendando...' : 'Agendar'}
      </button>
      {error && <span className="text-[11px] text-red">{error}</span>}
    </div>
  )
}
