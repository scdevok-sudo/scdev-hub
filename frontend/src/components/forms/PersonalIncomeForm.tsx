import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { ApiError } from '@/lib/api'
import { createPersonalIncome, updatePersonalIncome } from '@/hooks/useFinance'
import { todayISO } from '@/lib/utils'
import type { PersonalIncome } from '@/types'

/** Mes (YYYY-MM) al que cuenta el ingreso por defecto: el siguiente si es a mes vencido. */
function defaultMesAplicacion(fecha: string, aMesVencido: boolean): string {
  const [y, m] = fecha.split('-').map(Number)
  if (!y || !m) return ''
  const shift = aMesVencido ? m : m - 1 // m es 1-based; Date usa 0-based
  const d = new Date(y, shift, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

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
  const [aMesVencido, setAMesVencido] = useState(false)
  const [mesAplicacion, setMesAplicacion] = useState('')
  // Si el usuario toco el mes a mano, dejamos de recalcularlo al cambiar fecha/checkbox.
  const [mesEditado, setMesEditado] = useState(false)
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
    const vencido = income?.a_mes_vencido ?? false
    const initialFecha = income?.fecha ?? todayISO()
    const initialMes = income ? income.mes_aplicacion.slice(0, 7) : defaultMesAplicacion(initialFecha, vencido)
    setAMesVencido(vencido)
    setMesAplicacion(initialMes)
    setMesEditado(initialMes !== defaultMesAplicacion(initialFecha, vencido))
  }, [open, income])

  const updateFecha = (next: string) => {
    setFecha(next)
    if (!mesEditado) setMesAplicacion(defaultMesAplicacion(next, aMesVencido))
  }

  const updateVencido = (next: boolean) => {
    setAMesVencido(next)
    if (!mesEditado) setMesAplicacion(defaultMesAplicacion(fecha, next))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      concepto,
      monto: Number(monto),
      fecha,
      recurrente,
      fuente: fuente || null,
      a_mes_vencido: aMesVencido,
      mes_aplicacion: mesAplicacion ? `${mesAplicacion}-01` : null,
    }
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
              onChange={(e) => updateFecha(e.target.value)}
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

        <label className="flex items-center gap-2 text-sm text-txt2">
          <input
            type="checkbox"
            checked={aMesVencido}
            onChange={(e) => updateVencido(e.target.checked)}
            className="size-4 rounded border-line bg-graphite2 accent-red"
          />
          A mes vencido (sueldo: cuenta para el mes siguiente al cobro)
        </label>

        <Field label="Cuenta para el balance de">
          <input
            className={inputClass}
            type="month"
            value={mesAplicacion}
            required
            onChange={(e) => {
              setMesAplicacion(e.target.value)
              setMesEditado(true)
            }}
          />
        </Field>

        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
