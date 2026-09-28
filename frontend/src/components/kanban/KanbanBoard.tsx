import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorState, Loading } from '@/components/ui/States'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { TaskCard } from '@/components/kanban/TaskCard'
import { TaskDrawer } from '@/components/kanban/TaskDrawer'
import { TaskForm } from '@/components/forms/TaskForm'
import { useAdminTasks, useTasks } from '@/hooks/useTasks'
import { ApiError } from '@/lib/api'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useUsers } from '@/hooks/useUsers'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '@/types'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'Por hacer' },
  { status: 'in_progress', label: 'En progreso' },
  { status: 'done', label: 'Listo' },
]

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 2, medium: 1, low: 0 }

/** Mobile (Fase 2f): todo/in_progress mezcladas arriba por prioridad, done al final. */
function sortForMobileList(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0
    const bDone = b.status === 'done' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    const byPriority = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
    if (byPriority !== 0) return byPriority
    return (a.created_at ?? '').localeCompare(b.created_at ?? '')
  })
}

interface KanbanBoardProps {
  /** Requerido en modo 'project' (default). Ignorado en modo 'admin'. */
  projectId?: string
  /** Parte C, fase 3: tablero administrativo (/admin-tasks), sin proyecto ni claim. */
  variant?: 'project' | 'admin'
}

export function KanbanBoard({ projectId, variant = 'project' }: KanbanBoardProps) {
  const isAdminBoard = variant === 'admin'

  const project = useTasks(isAdminBoard ? undefined : projectId)
  const admin = useAdminTasks(isAdminBoard)
  const {
    data: tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    reload,
  } = isAdminBoard ? admin : project
  const claimTask = isAdminBoard ? undefined : project.claimTask

  const { data: users } = useUsers()
  const isDesktop = useIsDesktop()

  const [dragging, setDragging] = useState<Task | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo')
  const [claimError, setClaimError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const byStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] }
    for (const task of tasks ?? []) grouped[task.status].push(task)
    return grouped
  }, [tasks])

  const openTask = (tasks ?? []).find((task) => task.id === openTaskId) ?? null

  const mobileList = useMemo(() => sortForMobileList(tasks ?? []), [tasks])

  const onDragStart = (event: DragStartEvent) => {
    setDragging((event.active.data.current as { task?: Task } | undefined)?.task ?? null)
  }

  const onDragEnd = async (event: DragEndEvent) => {
    setDragging(null)
    const overId = event.over?.id
    const task = (event.active.data.current as { task?: Task } | undefined)?.task
    if (!task || !overId) return
    const status = String(overId) as TaskStatus
    if (!COLUMNS.some((column) => column.status === status) || task.status === status) return
    await updateTask(task.id, { status })
  }

  const openNew = (status: TaskStatus) => {
    setEditing(null)
    setNewStatus(status)
    setFormOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditing(task)
    setFormOpen(true)
  }

  const claim = async (task: Task) => {
    if (!claimTask) return
    setClaimError(null)
    try {
      await claimTask(task.id)
    } catch (err) {
      // 409 tipico: otro se adelanto, o la tarea ya quedo asignada.
      setClaimError(err instanceof ApiError ? err.message : 'No se pudo solicitar la tarea')
    }
  }

  if (loading) return <Loading label="Cargando tablero..." />
  if (error) return <ErrorState message={error} />

  const columns = (
    <div className="flex gap-4">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.status}
          status={column.status}
          label={column.label}
          tasks={byStatus[column.status]}
          onOpen={(task) => setOpenTaskId(task.id)}
          onAdd={openNew}
          onClaim={(task) => void claim(task)}
          onStatusChange={(task, status) => void updateTask(task.id, { status })}
          draggable
        />
      ))}
    </div>
  )

  // Mobile (Fase 2f): sin columnas ni scroll horizontal — una sola lista vertical
  // con todas las tareas, sin headers de columna ni contador por estado.
  const list = (
    <div className="flex flex-col gap-2">
      {mobileList.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onOpen={(t) => setOpenTaskId(t.id)}
          onClaim={(t) => void claim(t)}
          onStatusChange={(t, status) => void updateTask(t.id, { status })}
          draggable={false}
        />
      ))}
      {mobileList.length === 0 && (
        <p className="grid rounded-lg border border-dashed border-line py-8 text-center text-[11px] text-txt3">
          Sin tareas
        </p>
      )}
    </div>
  )

  return (
    <>
      {claimError && (
        <div className="mb-3">
          <ErrorState message={claimError} />
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => openNew('todo')}>
          Nueva tarea
        </Button>
      </div>

      {/* Desktop: 3 columnas + drag & drop, sin cambios. Mobile (Fase 2f): lista
          unica sin columnas, sin drag (Fase 2e) — ver `list` mas arriba. */}
      {isDesktop ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          {columns}
          <DragOverlay dropAnimation={null}>
            {dragging && <TaskCard task={dragging} onOpen={() => undefined} dragging />}
          </DragOverlay>
        </DndContext>
      ) : (
        list
      )}

      <TaskDrawer
        task={openTask}
        users={users ?? []}
        variant={variant}
        onClose={() => setOpenTaskId(null)}
        onEdit={(task) => {
          setOpenTaskId(null)
          openEdit(task)
        }}
        onDelete={async (task) => {
          await deleteTask(task.id)
        }}
        onUpdate={async (task, patch) => {
          await updateTask(task.id, patch)
        }}
        onClaim={(task) => void claim(task)}
        onAgendado={reload}
      />

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        users={users ?? []}
        task={editing}
        defaultStatus={newStatus}
        variant={variant}
        onSubmit={async (input: TaskInput) => {
          if (editing) await updateTask(editing.id, input)
          else await createTask(input)
        }}
      />
    </>
  )
}
