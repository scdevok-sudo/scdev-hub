import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Plus, Send, Trash2, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import {
  AvailableBadge,
  ClaimPendingBadge,
  PriorityBadge,
  TaskStatusBadge,
} from '@/components/ui/Badge'
import { inputClass } from '@/components/ui/Field'
import { AgendarButton } from '@/components/forms/AgendarButton'
import { useComments, useNotes, useSubtasks } from '@/hooks/useTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ApiError } from '@/lib/api'
import { cn, formatDateTime } from '@/lib/utils'
import type { Task, TaskInput, TaskStatus, User } from '@/types'

interface TaskDrawerProps {
  task: Task | null
  users: User[]
  /** Parte C, fase 3: los pendientes admin no tienen subtareas/notas/comentarios
   * ni integracion de Calendar todavia. */
  variant?: 'project' | 'admin'
  onClose: () => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => Promise<void>
  onUpdate: (task: Task, patch: Partial<TaskInput>) => Promise<void>
  onClaim: (task: Task) => void
  onAgendado?: () => void
  /** Se crearon/cambiaron/borraron subtareas desde el drawer. */
  onSubtasksChanged?: () => void
}

export function TaskDrawer({
  task,
  users,
  variant = 'project',
  onClose,
  onEdit,
  onDelete,
  onUpdate,
  onClaim,
  onAgendado,
  onSubtasksChanged,
}: TaskDrawerProps) {
  const { user, isAdmin } = useCurrentUser()
  const linkedDataEnabled = variant === 'project'
  const { data: comments, loading, addComment } = useComments(linkedDataEnabled ? task?.id : undefined)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setDraft('')
    setError(null)
    setConfirmDelete(false)
  }, [task?.id])

  useEffect(() => {
    if (!task) return
    const onKey = (event: KeyboardEvent) => {
      // Escape dentro de un campo cancela ese campo, no cierra el drawer.
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [task, onClose])

  if (!task) return null

  const canDelete = isAdmin || task.created_by === user?.id

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.trim()) return
    setSending(true)
    setError(null)
    try {
      await addComment(draft.trim())
      setDraft('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo comentar')
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        className="absolute inset-0 flex w-full flex-col border-line bg-graphite shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-w-[440px] sm:border-l"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-medium leading-snug text-txt">{task.title}</h2>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => onEdit(task)}
              aria-label="Editar tarea"
              className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-graphite2 hover:text-txt"
            >
              <Pencil className="size-4" />
            </button>
            {canDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                aria-label="Borrar tarea"
                className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-red-dim hover:text-red"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-graphite2 hover:text-txt"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <TaskStatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.claim_status === 'pending' ? (
                <ClaimPendingBadge
                  label={
                    isAdmin
                      ? 'Solicitud pendiente'
                      : task.claimed_by === user?.id
                        ? 'Solicitada por vos'
                        : 'Solicitada'
                  }
                />
              ) : (
                task.assigned_to === null && <AvailableBadge />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-txt3">Asignado a</span>
              {task.assignee ? (
                <span className="flex items-center gap-2 text-txt">
                  <Avatar user={task.assignee} size="xs" />
                  {task.assignee.name}
                </span>
              ) : task.claim_status === 'pending' && task.claimer ? (
                <span className="flex items-center gap-2 text-txt2">
                  <Avatar user={task.claimer} size="xs" />
                  {task.claimer.name} la solicito
                </span>
              ) : !isAdmin ? (
                <Button size="sm" variant="outline" onClick={() => onClaim(task)}>
                  Solicitar
                </Button>
              ) : (
                <span className="text-txt3">Sin asignar</span>
              )}
            </div>

            {task.description && (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-txt2">
                {task.description}
              </p>
            )}

            {linkedDataEnabled && task.due_date && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-txt3">Fecha limite</span>
                <div className="flex items-center gap-2">
                  <span className="text-txt2">{task.due_date}</span>
                  {task.calendar_sync === 'manual' && !task.google_event_id && (
                    <AgendarButton path={`/tasks/${task.id}/agendar`} onDone={() => onAgendado?.()} />
                  )}
                  {task.google_event_id && (
                    <span className="text-[11px] text-emerald-400">En Calendar</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {linkedDataEnabled && <NotesSection task={task} />}

          <DetailsSection task={task} onUpdate={onUpdate} />

          {linkedDataEnabled && !task.parent_task_id && (
            <SubtasksSection task={task} users={users} onChanged={onSubtasksChanged} />
          )}

          {linkedDataEnabled && (
            <div className="px-5 py-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-txt3">
                Comentarios
              </h3>

              {loading && <p className="text-xs text-txt3">Cargando...</p>}

              {!loading && comments?.length === 0 && (
                <p className="text-xs text-txt3">Todavia no hay comentarios.</p>
              )}

              <ul className="space-y-3">
                {comments?.map((comment) => (
                  <li key={comment.id} className="flex gap-2.5">
                    <Avatar user={comment.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2 text-[11px]">
                        <span className="font-medium text-txt">{comment.user?.name ?? 'Alguien'}</span>
                        <span className="text-txt3">{formatDateTime(comment.created_at)}</span>
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-txt2">
                        {comment.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {linkedDataEnabled && (
          <form onSubmit={send} className="border-t border-line px-5 py-3">
            {error && <p className="mb-2 text-[11px] text-red">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                className={`${inputClass} min-h-10 resize-none py-2`}
                rows={2}
                value={draft}
                placeholder="Escribi un comentario"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    void send(e as unknown as React.FormEvent)
                  }
                }}
              />
              <Button type="submit" size="sm" loading={sending} disabled={!draft.trim()}>
                <Send className="size-3.5" />
              </Button>
            </div>
          </form>
        )}

        {confirmDelete && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 px-6">
            <div className="w-full rounded-xl border border-line bg-graphite p-5 text-center">
              <p className="text-sm text-txt">Borrar esta tarea?</p>
              <p className="mt-1 text-xs text-txt3">No se puede deshacer.</p>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    void onDelete(task).then(onClose)
                  }}
                >
                  Borrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  )
}

interface SectionProps {
  task: Task
  onUpdate: (task: Task, patch: Partial<TaskInput>) => Promise<void>
}

function DetailsSection({ task, onUpdate }: SectionProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(task.details ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al cambiar de tarea el drawer no se desmonta: hay que resincronizar el borrador.
  useEffect(() => {
    setEditing(false)
    setValue(task.details ?? '')
    setError(null)
  }, [task.id, task.details])

  const save = async () => {
    const next = value.trim()
    if (next === (task.details ?? '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onUpdate(task, { details: next || null })
      setEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="border-b border-line px-5 py-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-txt3">Detalle</h3>

      {error && <p className="mb-2 text-[11px] text-red">{error}</p>}

      {editing ? (
        <div className="space-y-2">
          <textarea
            className={`${inputClass} min-h-[140px] resize-y text-xs leading-relaxed`}
            value={value}
            autoFocus
            placeholder="Contexto, links, criterios de aceptacion..."
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setValue(task.details ?? '')
                setEditing(false)
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save()
            }}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" loading={saving} onClick={() => void save()}>
              Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setValue(task.details ?? '')
                setEditing(false)
              }}
            >
              Cancelar
            </Button>
            <span className="text-[10px] text-txt3">Ctrl+Enter guarda · Esc cancela</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cn(
            'w-full rounded-lg border border-transparent px-2 py-1.5 text-left text-xs leading-relaxed',
            'transition-colors hover:border-line hover:bg-graphite2',
            task.details ? 'whitespace-pre-wrap text-txt2' : 'text-txt3',
          )}
        >
          {task.details || 'Sin detalle. Hace click para escribir.'}
        </button>
      )}
    </section>
  )
}

const SUBTASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Listo' },
]

/** Parte A, fase 3: subtareas reales (reemplaza el checklist jsonb viejo).
 * Cada subtarea es una fila propia de `tasks`, con su propio estado y
 * asignado. Simplificacion consciente respecto al Kanban de primer nivel:
 * el cambio de estado va por un control de 3 botones en vez de drag & drop
 * (mismo criterio que ya se uso para mobile en las Fases 2e/2f) -- anidar
 * un drag & drop completo dentro del drawer no daba la complejidad extra. */
function SubtasksSection({
  task,
  users,
  onChanged,
}: {
  task: Task
  users: User[]
  onChanged?: () => void
}) {
  const {
    data: subtasks,
    loading,
    createSubtask,
    updateSubtask: patchSubtask,
    deleteSubtask: removeSubtask,
  } = useSubtasks(task.id)
  const updateSubtask = async (...args: Parameters<typeof patchSubtask>) => {
    await patchSubtask(...args)
    onChanged?.()
  }
  const deleteSubtask = async (...args: Parameters<typeof removeSubtask>) => {
    await removeSubtask(...args)
    onChanged?.()
  }
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft('')
    setError(null)
  }, [task.id])

  const items = subtasks ?? []
  const done = items.filter((t) => t.status === 'done').length

  const add = async () => {
    const title = draft.trim()
    if (!title) return
    setSaving(true)
    setError(null)
    try {
      await createSubtask(task.project_id, title)
      onChanged?.()
      setDraft('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la subtarea')
    } finally {
      setSaving(false)
      inputRef.current?.focus()
    }
  }

  return (
    <section className="border-b border-line px-5 py-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-txt3">Subtareas</h3>
        {items.length > 0 && (
          <span className="text-[11px] text-txt3">
            {done} de {items.length} listas
          </span>
        )}
      </div>

      {loading && <p className="text-xs text-txt3">Cargando...</p>}
      {error && <p className="mb-2 text-[11px] text-red">{error}</p>}

      <ul className="space-y-1.5">
        {items.map((subtask) => (
          <li key={subtask.id} className="group rounded-lg border border-line/60 p-2">
            <div className="flex items-center gap-2">
              <Avatar user={subtask.assignee} size="xs" />
              <span className="min-w-0 flex-1 truncate text-xs text-txt">{subtask.title}</span>
              <select
                value={subtask.assigned_to ?? ''}
                onChange={(e) => void updateSubtask(subtask.id, { assigned_to: e.target.value || null })}
                className="max-w-24 rounded-md border border-line bg-graphite2 px-1 py-1 text-[10px] text-txt2"
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Borrar "${subtask.title}"`}
                onClick={() => void deleteSubtask(subtask.id)}
                className="shrink-0 rounded p-1 text-txt3 opacity-0 transition-all hover:bg-red-dim hover:text-red focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="mt-1.5 flex gap-1">
              {SUBTASK_STATUSES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={subtask.status === option.value}
                  onClick={() => void updateSubtask(subtask.id, { status: option.value })}
                  className={cn(
                    'flex-1 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors',
                    subtask.status === option.value
                      ? 'bg-red-dim text-red'
                      : 'bg-graphite2 text-txt3 hover:text-txt2',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {items.length === 0 && !loading && (
        <p className="mb-2 text-[11px] text-txt3">Sin subtareas todavia.</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <input
          ref={inputRef}
          className={`${inputClass} h-8 py-1 text-xs`}
          value={draft}
          placeholder="Agregar subtarea y Enter"
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void add()
            }
            if (e.key === 'Escape') setDraft('')
          }}
        />
        <button
          type="button"
          aria-label="Agregar subtarea"
          disabled={!draft.trim() || saving}
          onClick={() => void add()}
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-lg border border-line text-txt3',
            'transition-colors hover:bg-graphite2 hover:text-txt',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </section>
  )
}

/** Parte B, fase 3: bitacora de notas, separada de la descripcion y de los
 * comentarios (misma tabla que comentarios con `tipo='note'`, ver backend). */
function NotesSection({ task }: { task: Task }) {
  const { data: notes, loading, addNote } = useNotes(task.id)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft('')
    setError(null)
  }, [task.id])

  const send = async () => {
    const content = draft.trim()
    if (!content) return
    setSending(true)
    setError(null)
    try {
      await addNote(content)
      setDraft('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la nota')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="border-b border-line px-5 py-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-txt3">Notas</h3>

      {loading && <p className="text-xs text-txt3">Cargando...</p>}
      {!loading && notes?.length === 0 && (
        <p className="text-xs text-txt3">Sin notas todavia.</p>
      )}

      <ul className="space-y-2.5">
        {notes?.map((note) => (
          <li key={note.id} className="rounded-lg bg-graphite2 px-2.5 py-2">
            <p className="flex items-baseline gap-2 text-[11px]">
              <span className="font-medium text-txt">{note.author?.name ?? 'Alguien'}</span>
              <span className="text-txt3">{formatDateTime(note.created_at)}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-txt2">{note.content}</p>
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-[11px] text-red">{error}</p>}

      <div className="mt-2 flex items-end gap-2">
        <textarea
          className={`${inputClass} min-h-9 resize-none py-1.5 text-xs`}
          rows={1}
          value={draft}
          placeholder="Agregar una nota"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send()
          }}
        />
        <Button size="sm" loading={sending} disabled={!draft.trim()} onClick={() => void send()}>
          Agregar
        </Button>
      </div>
    </section>
  )
}
