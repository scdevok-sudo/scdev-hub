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
import { useTasks } from '@/hooks/useTasks'
import { ApiError } from '@/lib/api'
import { useUsers } from '@/hooks/useUsers'
import type { Task, TaskInput, TaskStatus } from '@/types'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'Por hacer' },
  { status: 'in_progress', label: 'En progreso' },
  { status: 'done', label: 'Listo' },
]

export function KanbanBoard({ projectId }: { projectId: string }) {
  const {
    data: tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    claimTask,
  } = useTasks(projectId)
  const { data: users } = useUsers()

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

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              tasks={byStatus[column.status]}
              onOpen={(task) => setOpenTaskId(task.id)}
              onAdd={openNew}
              onClaim={(task) => void claim(task)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {dragging && <TaskCard task={dragging} onOpen={() => undefined} dragging />}
        </DragOverlay>
      </DndContext>

      <TaskDrawer
        task={openTask}
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
      />

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        users={users ?? []}
        task={editing}
        defaultStatus={newStatus}
        onSubmit={async (input: TaskInput) => {
          if (editing) await updateTask(editing.id, input)
          else await createTask(input)
        }}
      />
    </>
  )
}
