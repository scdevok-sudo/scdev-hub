import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { CalendarSyncField } from '@/components/forms/CalendarSyncField'
import { ApiError } from '@/lib/api'
import { createClientService, updateClientService } from '@/hooks/useFinance'
import type { CalendarSync, ClientService, Recurrencia, ServiceEstado } from '@/types'

interface ClientServiceFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clientId: string | null
  service?: ClientService | null
}

export function ClientServiceForm({ open, onClose, onSaved, clientId, service }: ClientServiceFormProps) {
  const [servicio, setServicio] = useState('')
  const [monto, setMonto] = useState<number | ''>('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [proximaFecha, setProximaFecha] = useState('')
  const [recurrencia, setRecurrencia] = useState<Recurrencia>('mensual')
  const [estado, setEstado] = useState<ServiceEstado>('activo')
  const [calendarSync, setCalendarSync] = useState<CalendarSync>('off')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setServicio(service?.servicio ?? '')
    setMonto(service?.monto_mensual ?? '')
    setFechaInicio(service?.fecha_inicio ?? '')
    setProximaFecha(service?.proxima_fecha_vencimiento ?? '')
    setRecurrencia(service?.recurrencia ?? 'mensual')
    setEstado(service?.estado ?? 'activo')
    setCalendarSync(service?.calendar_sync ?? 'off')
  }, [open, service])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      servicio,
      monto_mensual: monto === '' ? null : monto,
      fecha_inicio: fechaInicio || null,
      proxima_fecha_vencimiento: proximaFecha || null,
      recurrencia,
      estado,
      calendar_sync: calendarSync,
    }
    try {
      if (service) await updateClientService(service.id, payload)
      else if (clientId) await createClientService(clientId, payload)
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
      title={service ? 'Editar servicio' : 'Nuevo servicio'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="client-service-form" type="submit" loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="client-service-form" onSubmit={submit} className="space-y-4">
        <Field label="Servicio" required>
          <input
            className={inputClass}
            value={servicio}
            required
            onChange={(e) => setServicio(e.target.value)}
            placeholder="Mantenimiento web, hosting, etc."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto mensual">
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Field>
          <Field label="Recurrencia" required>
            <select
              className={inputClass}
              value={recurrencia}
              onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
            >
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
              <option value="unico">Unico</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha inicio">
            <input
              className={inputClass}
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </Field>
          <Field label="Proximo vencimiento">
            <input
              className={inputClass}
              type="date"
              value={proximaFecha}
              onChange={(e) => setProximaFecha(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Estado" required>
          <select
            className={inputClass}
            value={estado}
            onChange={(e) => setEstado(e.target.value as ServiceEstado)}
          >
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Field>

        <CalendarSyncField
          value={calendarSync}
          onChange={setCalendarSync}
          hasDate={Boolean(proximaFecha)}
        />

        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
