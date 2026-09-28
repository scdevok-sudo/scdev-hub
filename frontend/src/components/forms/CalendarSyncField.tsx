import { CalendarOff, CalendarCheck2, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalendarSync } from '@/types'

interface CalendarSyncFieldProps {
  value: CalendarSync
  onChange: (value: CalendarSync) => void
  /** Solo tiene sentido elegir sync si ya hay una fecha cargada. */
  hasDate: boolean
}

const OPTIONS: { value: CalendarSync; label: string; icon: typeof CalendarOff }[] = [
  { value: 'off', label: 'No sincronizar', icon: CalendarOff },
  { value: 'manual', label: 'Manual', icon: CalendarClock },
  { value: 'automatic', label: 'Automatico', icon: CalendarCheck2 },
]

/** Parte E, fase 3: un solo componente reusado en TaskForm, InvoiceForm,
 * ClientServiceForm y MilestoneForm -- mismo criterio en los 4 lugares con
 * `calendar_sync`. Aparece en cuanto hay una fecha cargada en el formulario. */
export function CalendarSyncField({ value, onChange, hasDate }: CalendarSyncFieldProps) {
  if (!hasDate) return null

  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-txt2">
        Google Calendar
      </span>
      <div className="flex gap-2">
        {OPTIONS.map(({ value: optValue, label, icon: Icon }) => (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
              value === optValue
                ? 'border-red bg-red-dim text-red'
                : 'border-line text-txt2 hover:text-txt',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
      {value === 'manual' && (
        <p className="mt-1.5 text-[11px] text-txt3">
          Se agenda con el boton "Agendar" -- no se crea el evento solo.
        </p>
      )}
      {value === 'automatic' && (
        <p className="mt-1.5 text-[11px] text-txt3">
          Se crea y actualiza el evento en Calendar cada vez que guardes.
        </p>
      )}
    </div>
  )
}
