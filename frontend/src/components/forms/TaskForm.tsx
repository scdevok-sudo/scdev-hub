import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { CalendarSyncField } from '@/components/forms/CalendarSyncField'
import { ApiError } from '@/lib/api'
import type { CalendarSync, Task, TaskInput, TaskPriority, TaskStatus, User } from '@/types'

interface TaskFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: TaskInput) => Promise<unknown>
  users: User[]
  task?: Task | null
  defaultStatus?: TaskStatus
  /** Los pendientes admin (Parte C) no tienen integracion de Calendar todavia. */
  variant?: 'project' | 'admin'
}

const EMPTY: TaskInput = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assigned_to: null,
  due_date: null,
  calendar_sync: 'off',
}

export function TaskForm({
  open,
  onClose,
  onSubmit,
  users,
  task,
  defaultStatus = 'todo',
  variant = 'project',
}: TaskFormProps) {
  const [form, setForm] = useState<TaskInput>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      task
        ? {
            title: task.title,
            description: task.description ?? '',
            status: task.status,
            priority: task.priority,
            assigned_to: task.assigned_to,
            due_date: task.due_date,
            calendar_sync: task.calendar_sync ?? 'off',
          }
        : { ...EMPTY, status: defaultStatus },
    )
  }, [open, task, defaultStatus])

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
      title={task ? 'Editar tarea' : 'Nueva tarea'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="task-form" type="submit" loading={saving}>
            {task ? 'Guardar' : 'Crear tarea'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-4">
        <Field label="Titulo" required>
          <input
            className={inputClass}
            value={form.title}
            required
            autoFocus
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Migrar auth a JWT"
          />
        </Field>

        <Field label="Descripcion">
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Estado">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
            >
              <option value="todo">Por hacer</option>
              <option value="in_progress">En progreso</option>
              <option value="done">Listo</option>
            </select>
          </Field>

          <Field label="Prioridad">
            <select
              className={inputClass}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </Field>

          <Field label="Asignado a">
            <select
              className={inputClass}
              value={form.assigned_to ?? ''}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value || null })}
            >
              <option value="">Sin asignar</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {variant === 'project' && (
          <>
            <Field label="Fecha limite">
              <input
                className={inputClass}
                type="date"
                value={form.due_date ?? ''}
                onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
              />
            </Field>

            <CalendarSyncField
              value={form.calendar_sync ?? 'off'}
              onChange={(v: CalendarSync) => setForm({ ...form, calendar_sync: v })}
              hasDate={Boolean(form.due_date)}
            />
          </>
        )}

        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
