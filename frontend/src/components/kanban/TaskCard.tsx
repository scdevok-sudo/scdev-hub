import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { ChevronRight, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { AvailableBadge, ClaimPendingBadge, PriorityBadge } from '@/components/ui/Badge'
import { SubtaskList } from '@/components/kanban/SubtaskList'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Listo' },
]

interface TaskCardProps {
  task: Task
  onOpen: (task: Task) => void
  onClaim?: (task: Task) => void
  onStatusChange?: (task: Task, status: TaskStatus) => void
  dragging?: boolean
  /** Click en el titulo de una subtarea desplegada: abre su panel de detalle. */
  onOpenSubtask?: (task: Task) => void
  /** Cambio de estado de una subtarea desde la mini-lista. */
  onSubtasksChanged?: () => void
  /** Se incrementa cuando el drawer modifica subtareas, para refrescar la mini-lista. */
  subtaskVersion?: number
  /** Desktop: drag & drop con @dnd-kit. Mobile: sin drag, ver StatusSwitcher abajo. */
  draggable?: boolean
}

export function TaskCard({
  task,
  onOpen,
  onClaim,
  onStatusChange,
  dragging = false,
  onOpenSubtask,
  onSubtasksChanged,
  subtaskVersion = 0,
  draggable = true,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { user, isAdmin } = useCurrentUser()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  const subtaskCount = task.subtask_count ?? 0
  const subtaskDone = task.subtask_done ?? 0

  const pending = task.claim_status === 'pending'
  const available = task.assigned_to === null && !pending
  const canClaim = available && !isAdmin && Boolean(onClaim)
  const claimLabel = isAdmin
    ? 'Solicitud pendiente'
    : task.claimed_by === user?.id
      ? 'Solicitada por vos'
      : 'Solicitada'

  return (
    <div className="flex flex-col gap-1.5">
    <div
      ref={setNodeRef}
      style={draggable ? { transform: CSS.Translate.toString(transform) } : undefined}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      onClick={() => onOpen(task)}
      className={cn(
        'rounded-lg border border-line bg-graphite2 p-3 text-left transition-colors hover:border-txt3',
        draggable && 'cursor-grab touch-none active:cursor-grabbing',
        (isDragging || dragging) && draggable && 'opacity-40',
        dragging && 'rotate-2 opacity-100 shadow-2xl',
      )}
    >
      {(available || pending) && (
        <div className="mb-1.5">{pending ? <ClaimPendingBadge label={claimLabel} /> : <AvailableBadge />}</div>
      )}

      <p className="text-sm leading-snug text-txt">{task.title}</p>

      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-txt3">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-2">
          {subtaskCount > 0 && !dragging && (
            // Chevron = expandir hijas in-place. Convive con el drag (desktop) y con el
            // control de 3 estados (mobile): frena pointerdown/click para no disparar ni
            // el drag ni la apertura del drawer.
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              aria-expanded={expanded}
              aria-label={expanded ? 'Ocultar subtareas' : 'Mostrar subtareas'}
              className={cn(
                '-my-1 flex items-center gap-0.5 rounded-md px-1 py-1 text-[10px] transition-colors hover:bg-graphite',
                subtaskDone === subtaskCount ? 'text-emerald-400' : 'text-txt3 hover:text-txt',
              )}
            >
              <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
              {subtaskDone}/{subtaskCount}
            </button>
          )}
          {task.description && <MessageSquare className="size-3.5 text-txt3" />}
          {task.assignee ? (
            <Avatar user={task.assignee} size="xs" />
          ) : canClaim ? (
            <button
              type="button"
              // El card entero es draggable en desktop: frenar el pointerdown evita que
              // dnd-kit tome el boton como inicio de arrastre, y el click no abre el drawer.
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onClaim?.(task)
              }}
              className="rounded-md border border-red/40 px-2 py-0.5 text-[10px] font-medium text-red transition-colors hover:bg-red-dim"
            >
              Solicitar
            </button>
          ) : (
            <span className="text-[10px] text-txt3">sin asignar</span>
          )}
        </div>
      </div>

      {/* Mobile: sin drag & drop, cambio de estado directo desde la tarjeta. */}
      {onStatusChange && (
        <div
          className="mt-3 flex gap-1 border-t border-line pt-2 md:hidden"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={task.status === option.value}
              onClick={() => onStatusChange(task, option.value)}
              className={cn(
                'flex-1 rounded-md px-1.5 py-1.5 text-[10px] font-medium transition-colors',
                task.status === option.value
                  ? 'bg-red-dim text-red'
                  : 'bg-graphite text-txt2 hover:text-txt',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>

    {expanded && subtaskCount > 0 && !dragging && (
      <SubtaskList
        parent={task}
        version={subtaskVersion}
        onOpen={(sub) => onOpenSubtask?.(sub)}
        onChanged={() => onSubtasksChanged?.()}
      />
    )}
    </div>
  )
}
