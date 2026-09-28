import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { ApiError } from '@/lib/api'
import { createPersonalIncome, updatePersonalIncome } from '@/hooks/useFinance'
import { todayISO } from '@/lib/utils'
import type { PersonalIncome } from '@/types'

interface PersonalIncomeFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  income?: PersonalIncome | null
}

export function PersonalIncomeForm({ open, onClose, onSaved, income }: PersonalIncomeFormProps) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState<number | ''>('')
  const [fecha, setFecha] = useState(todayISO())
  const [recurrente, setRecurrente] = useState(false)
  const [fuente, setFuente] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setConcepto(income?.concepto ?? '')
    setMonto(income?.monto ?? '')
    setFecha(income?.fecha ?? todayISO())
    setRecurrente(income?.recurrente ?? false)
    setFuente(income?.fuente ?? '')
  }, [open, income])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { concepto, monto: Number(monto), fecha, recurrente, fuente: fuente || null }
    try {
      if (income) await updatePersonalIncome(income.id, payload)
      else await createPersonalIncome(payload)
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
      title={income ? 'Editar ingreso' : 'Nuevo ingreso'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="personal-income-form" type="submit" loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="personal-income-form" onSubmit={submit} className="space-y-4">
        <Field label="Concepto" required>
          <input
            className={inputClass}
            value={concepto}
            required
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Sueldo pasantia, etc."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
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
          <Field label="Fecha" required>
            <input
              className={inputClass}
              type="date"
              value={fecha}
              required
              onChange={(e) => setFecha(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Fuente">
          <input className={inputClass} value={fuente} onChange={(e) => setFuente(e.target.value)} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-txt2">
          <input
            type="checkbox"
            checked={recurrente}
            onChange={(e) => setRecurrente(e.target.checked)}
            className="size-4 rounded border-line bg-graphite2 accent-red"
          />
          Es un ingreso recurrente (mes a mes)
        </label>

        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
