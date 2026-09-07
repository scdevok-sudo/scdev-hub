import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { ApiError } from '@/lib/api'
import type { Project, ProjectInput, ProjectStatus } from '@/types'

interface ProjectFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: ProjectInput) => Promise<unknown>
  project?: Project | null
}

const EMPTY: ProjectInput = {
  name: '',
  client_name: '',
  description: '',
  status: 'active',
  structure_pct: 0.25,
  billed_amount: 0,
  estimated_hours: null,
}

export function ProjectForm({ open, onClose, onSubmit, project }: ProjectFormProps) {
  const [form, setForm] = useState<ProjectInput>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      project
        ? {
            name: project.name,
            client_name: project.client_name,
            description: project.description ?? '',
            status: project.status,
            structure_pct: Number(project.structure_pct),
            billed_amount: Number(project.billed_amount ?? 0),
            estimated_hours: project.estimated_hours != null ? Number(project.estimated_hours) : null,
          }
        : EMPTY,
    )
  }, [open, project])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(form)
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
      title={project ? 'Editar proyecto' : 'Nuevo proyecto'}
      description={project ? project.client_name : 'Solo los admin pueden crear proyectos'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="project-form" type="submit" loading={saving}>
            {project ? 'Guardar cambios' : 'Crear proyecto'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="space-y-4">
        <Field label="Nombre" required>
          <input
            className={inputClass}
            value={form.name}
            required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Landing institucional"
          />
        </Field>

        <Field label="Cliente" required>
          <input
            className={inputClass}
            value={form.client_name}
            required
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            placeholder="Acme SA"
          />
        </Field>

        <Field label="Descripcion">
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Estado">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
            >
              <option value="active">Activo</option>
              <option value="paused">Pausado</option>
              <option value="completed">Completado</option>
            </select>
          </Field>

          <Field label="Horas estimadas" hint="Opcional">
            <input
              className={inputClass}
              type="number"
              min={0}
              step={0.25}
              value={form.estimated_hours ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  estimated_hours: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="% estructura SCdev" hint="0.25 = 25%">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={form.structure_pct ?? 0.25}
              onChange={(e) => setForm({ ...form, structure_pct: Number(e.target.value) })}
            />
          </Field>

          <Field label="Facturado" hint="Habilita el tab Reparto">
            <input
              className={inputClass}
              type="number"
              min={0}
              step={1000}
              value={form.billed_amount ?? 0}
              onChange={(e) => setForm({ ...form, billed_amount: Number(e.target.value) })}
            />
          </Field>
        </div>

        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
