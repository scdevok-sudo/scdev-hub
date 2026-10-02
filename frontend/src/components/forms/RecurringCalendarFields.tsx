import { Field, inputClass } from '@/components/ui/Field'
import { CalendarSyncField } from '@/components/forms/CalendarSyncField'
import type { CalendarSync } from '@/types'

interface RecurringCalendarFieldsProps {
  dia: number | ''
  onDiaChange: (dia: number | '') => void
  calendarSync: CalendarSync
  onCalendarSyncChange: (value: CalendarSync) => void
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

/** Dia de vencimiento + sync con Google Calendar de un gasto recurrente (ej. Monotributo). */
export function RecurringCalendarFields({
  dia,
  onDiaChange,
  calendarSync,
  onCalendarSyncChange,
}: RecurringCalendarFieldsProps) {
  return (
    <>
      <Field
        label="Dia de vencimiento"
        hint={
          typeof dia === 'number' && dia > 28
            ? 'En los meses mas cortos vence el ultimo dia del mes.'
            : 'Dia del mes en que vence cada pago.'
        }
      >
        <select
          className={inputClass}
          value={dia}
          onChange={(e) => onDiaChange(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">Sin dia</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>

      <CalendarSyncField
        value={calendarSync}
        onChange={onCalendarSyncChange}
        hasDate={dia !== ''}
        manualHint="Se crea el evento mensual una sola vez al guardar y no se vuelve a tocar: si cambia el dia, ajustalo en Calendar."
      />
    </>
  )
}
