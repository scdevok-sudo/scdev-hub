import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { ApiError } from '@/lib/api'
import { createInvoice, updateInvoice } from '@/hooks/useFinance'
import { todayISO } from '@/lib/utils'
import type { Client, Invoice, InvoiceEstado } from '@/types'

interface InvoiceFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clients: Client[]
  invoice?: Invoice | null
}

export function InvoiceForm({ open, onClose, onSaved, clients, invoice }: InvoiceFormProps) {
  const [clientId, setClientId] = useState('')
  const [servicio, setServicio] = useState('')
  const [monto, setMonto] = useState<number | ''>('')
  const [anticipo, setAnticipo] = useState<number | ''>(0)
  const [estado, setEstado] = useState<InvoiceEstado>('pendiente')
  const [fecha, setFecha] = useState(todayISO())
  const [fechaSeguimiento, setFechaSeguimiento] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setClientId(invoice?.client_id ?? clients[0]?.id ?? '')
    setServicio(invoice?.servicio ?? '')
    setMonto(invoice?.monto ?? '')
    setAnticipo(invoice?.anticipo ?? 0)
    setEstado(invoice?.estado ?? 'pendiente')
    setFecha(invoice?.fecha ?? todayISO())
    setFechaSeguimiento(invoice?.fecha_seguimiento ?? '')
    setNotas(invoice?.notas ?? '')
  }, [open, invoice, clients])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (invoice) {
        await updateInvoice(invoice.id, {
          servicio: servicio || null,
          monto: monto === '' ? undefined : monto,
          anticipo: anticipo === '' ? undefined : anticipo,
          estado,
          fecha,
          fecha_seguimiento: fechaSeguimiento || null,
          notas: notas || null,
        })
      } else {
        await createInvoice({
          client_id: clientId,
          servicio: servicio || null,
          monto: Number(monto),
          anticipo: anticipo === '' ? 0 : Number(anticipo),
          estado,
          fecha,
          fecha_seguimiento: fechaSeguimiento || null,
          notas: notas || null,
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
      title={invoice ? 'Editar factura' : 'Nueva factura'}
      description="El IIBB (5%) y el neto se calculan solos"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="invoice-form" type="submit" loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={submit} className="space-y-4">
        <Field label="Cliente" required>
          <select
            className={inputClass}
            value={clientId}
            required
            disabled={Boolean(invoice)}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="" disabled>
              Elegi un cliente
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Servicio">
          <input className={inputClass} value={servicio} onChange={(e) => setServicio(e.target.value)} />
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
          <Field label="Anticipo">
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              value={anticipo}
              onChange={(e) => setAnticipo(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha" required>
            <input
              className={inputClass}
              type="date"
              value={fecha}
              required
              onChange={(e) => setFecha(e.target.value)}
            />
          </Field>
          <Field label="Fecha de seguimiento" hint="Opcional, para el pipeline">
            <input
              className={inputClass}
              type="date"
              value={fechaSeguimiento}
              onChange={(e) => setFechaSeguimiento(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Estado" required>
          <select
            className={inputClass}
            value={estado}
            onChange={(e) => setEstado(e.target.value as InvoiceEstado)}
          >
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="cobrado">Cobrado</option>
          </select>
        </Field>

        <Field label="Notas">
          <textarea
            className={`${inputClass} min-h-16 resize-y`}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </Field>

        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
