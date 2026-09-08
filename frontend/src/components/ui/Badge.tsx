import { cn } from '@/lib/utils'
import type { ProjectStatus, TaskPriority, TaskStatus } from '@/types'

const PROJECT_STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'bg-emerald-500/12 text-emerald-400' },
  paused: { label: 'Pausado', className: 'bg-amber-500/12 text-amber-400' },
  completed: { label: 'Completado', className: 'bg-graphite2 text-txt2' },
}

const TASK_STATUS: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: 'Por hacer', className: 'bg-graphite2 text-txt2' },
  in_progress: { label: 'En progreso', className: 'bg-sky-500/12 text-sky-400' },
  done: { label: 'Listo', className: 'bg-emerald-500/12 text-emerald-400' },
}

const PRIORITY: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: 'Baja', className: 'bg-graphite2 text-txt3' },
  medium: { label: 'Media', className: 'bg-amber-500/12 text-amber-400' },
  high: { label: 'Alta', className: 'bg-red-dim text-red' },
}

const AVAILABLE = 'bg-sky-500/12 text-sky-400'
const CLAIM_PENDING = 'bg-orange-500/15 text-orange-400'

const BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-5'

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = PROJECT_STATUS[status]
  return <span className={cn(BASE, config.className)}>{config.label}</span>
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = TASK_STATUS[status]
  return <span className={cn(BASE, config.className)}>{config.label}</span>
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = PRIORITY[priority]
  return <span className={cn(BASE, config.className)}>{config.label}</span>
}

/** Tarea sin asignar y sin solicitud en curso: cualquiera la puede pedir. */
export function AvailableBadge() {
  return <span className={cn(BASE, AVAILABLE)}>Disponible</span>
}

/** Solicitud esperando que un admin la resuelva. */
export function ClaimPendingBadge({ label = 'Solicitud pendiente' }: { label?: string }) {
  return <span className={cn(BASE, CLAIM_PENDING)}>{label}</span>
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn(BASE, 'bg-graphite2 text-txt2', className)}>{children}</span>
}
