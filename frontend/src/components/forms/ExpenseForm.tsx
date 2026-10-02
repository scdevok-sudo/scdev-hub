import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { ApiError } from '@/lib/api'
import { createExpenseLog, createRecurringExpense } from '@/hooks/useFinance'
import { todayISO } from '@/lib/utils'
import { RecurringCalendarFields } from '@/components/forms/RecurringCalendarFields'
import type { CalendarSync, GastoTipo } from '@/types'

interface ExpenseFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  tipo: GastoTipo
}

export function ExpenseForm({ open, onClose, onSaved, tipo }: ExpenseFormProps) {
  const [concepto, setConcepto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [monto, setMonto] = useState<number | ''>('')
  const [frecuencia, setFrecuencia] = useState<'recurrente' | 'puntual'>('puntual')
  const [fecha, setFecha] = useState(todayISO())
  const [dia, setDia] = useState<number | ''>('')
  const [calendarSync, setCalendarSync] = useState<CalendarSync>('off')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setConcepto('')
    setCategoria('')
    setMonto('')
    setFrecuencia('puntual')
    setFecha(todayISO())
    setDia('')
    setCalendarSync('off')
  }, [open])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (frecuencia === 'recurrente') {
        await createRecurringExpense({
          concepto,
          categoria: categoria || null,
          monto: Number(monto),
          tipo,
          dia_vencimiento: dia === '' ? null : dia,
          calendar_sync: dia === '' ? 'off' : calendarSync,
        })
      } else {
        await createExpenseLog({
          fecha,
          concepto,
          categoria: categoria || null,
          monto: Number(monto),
          tipo,
        })
      }
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
      open={open}
      onClose={onClose}
      title="Nuevo gasto"
      description={tipo === 'agencia' ? 'Gasto de agencia' : 'Gasto personal'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="expense-form" type="submit" loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4">
        <Field label="Concepto" required>
          <input className={inputClass} value={concepto} required onChange={(e) => setConcepto(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria">
            <input className={inputClass} value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          </Field>
          <Field label="Monto" required>
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              value={monto}
              required
              onChange={(e) => setMonto(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Tipo" required>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFrecuencia('puntual')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                frecuencia === 'puntual'
                  ? 'border-red bg-red-dim text-red'
                  : 'border-line text-txt2 hover:text-txt'
              }`}
            >
              Puntual
            </button>
            <button
              type="button"
              onClick={() => setFrecuencia('recurrente')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                frecuencia === 'recurrente'
                  ? 'border-red bg-red-dim text-red'
                  : 'border-line text-txt2 hover:text-txt'
              }`}
            >
              Recurrente
            </button>
          </div>
        </Field>

        {frecuencia === 'puntual' && (
          <Field label="Fecha" required>
            <input
              className={inputClass}
              type="date"
              value={fecha}
              required
              onChange={(e) => setFecha(e.target.value)}
            />
          </Field>
        )}

        {frecuencia === 'recurrente' && (
          <RecurringCalendarFields
            dia={dia}
            onDiaChange={setDia}
            calendarSync={calendarSync}
            onCalendarSyncChange={setCalendarSync}
          />
        )}

        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
