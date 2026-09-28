import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { ApiError } from '@/lib/api'
import { createClient, updateClient } from '@/hooks/useFinance'
import type { Client, EstadoPago } from '@/types'

interface ClientFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  client?: Client | null
}

const ESTADOS: { value: EstadoPago; label: string }[] = [
  { value: 'al_dia', label: 'Al dia' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'atrasado', label: 'Atrasado' },
]

export function ClientForm({ open, onClose, onSaved, client }: ClientFormProps) {
  const [name, setName] = useState('')
  const [rubro, setRubro] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [web, setWeb] = useState('')
  const [estadoPago, setEstadoPago] = useState<EstadoPago>('al_dia')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setName(client?.name ?? '')
    setRubro(client?.rubro ?? '')
    setUbicacion(client?.ubicacion ?? '')
    setTelefono(client?.telefono ?? '')
    setEmail(client?.email ?? '')
    setInstagram(client?.instagram ?? '')
    setWeb(client?.web ?? '')
    setEstadoPago(client?.estado_pago ?? 'al_dia')
    setNotas(client?.notas ?? '')
  }, [open, client])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      name,
      rubro: rubro || null,
      ubicacion: ubicacion || null,
      telefono: telefono || null,
      email: email || null,
      instagram: instagram || null,
      web: web || null,
      estado_pago: estadoPago,
      notas: notas || null,
    }
    try {
      if (client) await updateClient(client.id, payload)
      else await createClient(payload)
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
      title={client ? 'Editar cliente' : 'Nuevo cliente'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="client-form" type="submit" loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} className="space-y-4">
        <Field label="Nombre" required>
          <input className={inputClass} value={name} required onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Rubro">
            <input className={inputClass} value={rubro} onChange={(e) => setRubro(e.target.value)} />
          </Field>
          <Field label="Ubicacion">
            <input className={inputClass} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Telefono">
            <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Instagram">
            <input className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </Field>
          <Field label="Web">
            <input className={inputClass} value={web} onChange={(e) => setWeb(e.target.value)} />
          </Field>
        </div>

        <Field label="Estado de pago" required>
          <select
            className={inputClass}
            value={estadoPago}
            onChange={(e) => setEstadoPago(e.target.value as EstadoPago)}
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
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
