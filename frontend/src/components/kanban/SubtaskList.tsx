import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { TaskStatusBadge } from '@/components/ui/Badge'
import { useSubtasks } from '@/hooks/useTasks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
}

interface SubtaskListProps {
  parent: Task
  /** Cambia cuando otro lado (drawer) toco las subtareas de esta madre. */
  version: number
  /** Click en el titulo de una hija: abre el panel de detalle de esa hija. */
  onOpen: (task: Task) => void
  /** Cambio de estado hecho desde la mini-lista: refresca contadores de la card. */
  onChanged: () => void
}

/** Subtareas desplegadas in-place bajo la card madre (chevron). Cada hija es una
 * mini-card: titulo (abre detalle), pill de estado (click = siguiente estado) y avatar. */
export function SubtaskList({ parent, version, onOpen, onChanged }: SubtaskListProps) {
  const { data, loading, updateSubtask } = useSubtasks(parent.id, version)
  const [error, setError] = useState<string | null>(null)

  const advance = async (subtask: Task) => {
    setError(null)
    try {
      await updateSubtask(subtask.id, { status: NEXT_STATUS[subtask.status] })
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado')
    }
  }

  if (!data) {
    return <p className="px-2 py-1.5 text-[11px] text-txt3">{loading ? 'Cargando...' : 'Sin subtareas'}</p>
  }

  return (
    <div className="ml-3 border-l border-line pl-2">
      {error && <p className="mb-1 text-[10px] text-red">{error}</p>}
      <ul className="flex flex-col gap-1">
        {data.map((subtask) => (
          <li
            key={subtask.id}
            className="flex items-center gap-2 rounded-md border border-line/60 bg-graphite px-2 py-1.5"
          >
            <button
              type="button"
              onClick={() => onOpen(subtask)}
              className={cn(
                'min-w-0 flex-1 text-left text-xs leading-snug transition-colors hover:text-txt',
                subtask.status === 'done' ? 'text-txt3 line-through' : 'text-txt2',
              )}
            >
              {subtask.title}
            </button>
            <TaskStatusBadge
              status={subtask.status}
              title="Click para pasar al siguiente estado"
              onClick={() => void advance(subtask)}
            />
            {subtask.assignee && <Avatar user={subtask.assignee} size="xs" />}
          </li>
        ))}
        {data.length === 0 && <li className="px-1 py-1 text-[11px] text-txt3">Sin subtareas</li>}
      </ul>
    </div>
  )
}
