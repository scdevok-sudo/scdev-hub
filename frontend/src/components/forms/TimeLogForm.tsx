import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { ApiError, api } from '@/lib/api'
import { clampHours, todayISO } from '@/lib/utils'
import type { Project, Task, TimeLog, TimeLogInput } from '@/types'

interface TimeLogFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  projects: Project[]
  lockedProjectId?: string
  log?: TimeLog | null
}

export function TimeLogForm({
  open,
  onClose,
  onSaved,
  projects,
  lockedProjectId,
  log,
}: TimeLogFormProps) {
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState(1)
  const [tasks, setTasks] = useState<Task[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setProjectId(log?.project_id ?? lockedProjectId ?? projects[0]?.id ?? '')
    setTaskId(log?.task_id ?? '')
    setDate(log?.logged_date ?? todayISO())
    setDescription(log?.description ?? '')
    setHours(log ? Number(log.hours) : 1)
  }, [open, log, lockedProjectId, projects])

  useEffect(() => {
    if (!open || !projectId) {
      setTasks([])
      return
    }
    let alive = true
    api
      .get<Task[]>(`/projects/${projectId}/tasks`)
      .then((data) => {
        if (alive) setTasks(data)
      })
      .catch(() => {
        if (alive) setTasks([])
      })
    return () => {
      alive = false
    }
  }, [open, projectId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload: TimeLogInput = {
      project_id: projectId,
      task_id: taskId || null,
      description,
      hours,
      logged_date: date,
    }
    try {
      if (log) {
        await api.patch(`/time-logs/${log.id}`, {
          task_id: payload.task_id,
          description: payload.description,
          hours: payload.hours,
          logged_date: payload.logged_date,
        })
      } else {
        await api.post('/time-logs', payload)
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
      title={log ? 'Editar horas' : 'Cargar horas'}
      description="Minimo 0.25 h, en pasos de 15 minutos"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="time-log-form" type="submit" loading={saving}>
            {log ? 'Guardar' : 'Cargar'}
          </Button>
        </>
      }
    >
      <form id="time-log-form" onSubmit={submit} className="space-y-4">
        <Field label="Proyecto" required>
          <select
            className={inputClass}
            value={projectId}
            required
            disabled={Boolean(lockedProjectId) || Boolean(log)}
            onChange={(e) => {
              setProjectId(e.target.value)
              setTaskId('')
            }}
          >
            <option value="" disabled>
              Elegi un proyecto
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} - {project.client_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tarea" hint="Opcional: vincula las horas a una tarea del Kanban">
          <select
            className={inputClass}
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">Sin tarea</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha" required>
            <input
              className={inputClass}
              type="date"
              value={date}
              max={todayISO()}
              required
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <Field label="Horas" required hint="0.25 a 24">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Restar 15 minutos"
                onClick={() => setHours((h) => clampHours(h - 0.25))}
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-graphite2 text-txt2 transition-colors hover:text-txt"
              >
                <Minus className="size-4" />
              </button>
              <input
                className={`${inputClass} text-center`}
                type="number"
                min={0.25}
                max={24}
                step={0.25}
                value={hours}
                required
                onChange={(e) => setHours(Number(e.target.value))}
                onBlur={() => setHours((h) => clampHours(h))}
              />
              <button
                type="button"
                aria-label="Sumar 15 minutos"
                onClick={() => setHours((h) => clampHours(h + 0.25))}
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-graphite2 text-txt2 transition-colors hover:text-txt"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </Field>
        </div>

        <Field label="Descripcion" required>
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            value={description}
            required
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Que hiciste en esas horas"
          />
        </Field>

        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
