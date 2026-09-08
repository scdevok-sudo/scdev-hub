import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ListChecks, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  onOpen: (task: Task) => void
  dragging?: boolean
}

export function TaskCard({ task, onOpen, dragging = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  const checklist = task.checklist ?? []
  const checklistDone = checklist.filter((item) => item.done).length

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
      className={cn(
        'cursor-grab touch-none rounded-lg border border-line bg-graphite2 p-3 text-left',
        'transition-colors hover:border-txt3 active:cursor-grabbing',
        (isDragging || dragging) && 'opacity-40',
        dragging && 'rotate-2 opacity-100 shadow-2xl',
      )}
    >
      <p className="text-sm leading-snug text-txt">{task.title}</p>

      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-txt3">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-2">
          {checklist.length > 0 && (
            <span
              className={cn(
                'flex items-center gap-1 text-[10px]',
                checklistDone === checklist.length ? 'text-emerald-400' : 'text-txt3',
              )}
              title={`${checklistDone} de ${checklist.length} completados`}
            >
              <ListChecks className="size-3.5" />
              {checklistDone}/{checklist.length}
            </span>
          )}
          {task.description && <MessageSquare className="size-3.5 text-txt3" />}
          {task.assignee ? (
            <Avatar user={task.assignee} size="xs" />
          ) : (
            <span className="text-[10px] text-txt3">sin asignar</span>
          )}
        </div>
      </div>
    </div>
  )
}
