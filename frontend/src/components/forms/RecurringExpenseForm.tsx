import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { RecurringCalendarFields } from '@/components/forms/RecurringCalendarFields'
import { ApiError } from '@/lib/api'
import { updateRecurringExpense } from '@/hooks/useFinance'
import type { CalendarSync, RecurringExpense } from '@/types'

interface RecurringExpenseFormProps {
  expense: RecurringExpense | null
  onClose: () => void
  onSaved: () => void
}

/** Edita el recordatorio de vencimiento (dia + Google Calendar) de un gasto recurrente existente. */
export function RecurringExpenseForm({ expense, onClose, onSaved }: RecurringExpenseFormProps) {
  const [dia, setDia] = useState<number | ''>('')
  const [calendarSync, setCalendarSync] = useState<CalendarSync>('off')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expense) return
    setError(null)
    setDia(expense.dia_vencimiento ?? '')
    setCalendarSync(expense.calendar_sync ?? 'off')
  }, [expense])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!expense) return
    setSaving(true)
    setError(null)
    try {
      await updateRecurringExpense(expense.id, {
        dia_vencimiento: dia === '' ? null : dia,
        calendar_sync: dia === '' ? 'off' : calendarSync,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={expense !== null}
      onClose={onClose}
      title="Vencimiento"
      description={expense?.concepto}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="recurring-expense-form" type="submit" loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="recurring-expense-form" onSubmit={submit} className="space-y-4">
        <RecurringCalendarFields
          dia={dia}
          onDiaChange={setDia}
          calendarSync={calendarSync}
          onCalendarSyncChange={setCalendarSync}
        />
        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
