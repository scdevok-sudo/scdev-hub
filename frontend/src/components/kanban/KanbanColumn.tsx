import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { TaskCard } from '@/components/kanban/TaskCard'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

interface KanbanColumnProps {
  status: TaskStatus
  label: string
  tasks: Task[]
  onOpen: (task: Task) => void
  onAdd: (status: TaskStatus) => void
}

export function KanbanColumn({ status, label, tasks, onOpen, onAdd }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-line bg-graphite">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-txt2">{label}</h3>
          <span className="rounded-full bg-graphite2 px-1.5 text-[11px] leading-5 text-txt3">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAdd(status)}
          aria-label={`Nueva tarea en ${label}`}
          className="rounded-md p-1 text-txt3 transition-colors hover:bg-graphite2 hover:text-txt"
        >
          <Plus className="size-4" />
        </button>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-40 flex-1 flex-col gap-2 p-3 transition-colors',
          isOver && 'bg-red-dim',
        )}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && (
          <p className="grid flex-1 place-items-center rounded-lg border border-dashed border-line text-[11px] text-txt3">
            Sin tareas
          </p>
        )}
      </div>
    </section>
  )
}
