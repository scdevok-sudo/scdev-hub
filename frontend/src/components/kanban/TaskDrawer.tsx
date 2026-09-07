import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Send, Trash2, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PriorityBadge, TaskStatusBadge } from '@/components/ui/Badge'
import { inputClass } from '@/components/ui/Field'
import { useComments } from '@/hooks/useTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

interface TaskDrawerProps {
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => Promise<void>
  onStatusChange: (task: Task, status: TaskStatus) => Promise<void>
}

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Listo' },
]

export function TaskDrawer({ task, onClose, onEdit, onDelete, onStatusChange }: TaskDrawerProps) {
  const { user, isAdmin } = useCurrentUser()
  const { data: comments, loading, addComment } = useComments(task?.id)
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
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-line bg-graphite shadow-2xl"
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
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-txt3">Asignado a</span>
              {task.assignee ? (
                <span className="flex items-center gap-2 text-txt">
                  <Avatar user={task.assignee} size="xs" />
                  {task.assignee.name}
                </span>
              ) : (
                <span className="text-txt3">Sin asignar</span>
              )}
            </div>

            <div className="flex gap-1.5">
              {STATUSES.map((option) => (
                <button
                  key={option.value}
                  onClick={() => void onStatusChange(task, option.value)}
                  disabled={task.status === option.value}
                  className={
                    task.status === option.value
                      ? 'flex-1 rounded-lg bg-red-dim px-2 py-1.5 text-[11px] font-medium text-red'
                      : 'flex-1 rounded-lg border border-line px-2 py-1.5 text-[11px] text-txt2 transition-colors hover:bg-graphite2 hover:text-txt'
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>

            {task.description && (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-txt2">
                {task.description}
              </p>
            )}
          </div>

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
        </div>

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
