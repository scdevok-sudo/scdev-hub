import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import type { PendingClaim, Task, TaskComment, TaskInput, TaskNote } from '@/types'

export function useTasks(projectId: string | undefined) {
  const state = useAsync<Task[]>(
    () => (projectId ? api.get<Task[]>(`/projects/${projectId}/tasks`) : Promise.resolve([])),
    [projectId],
  )

  const createTask = async (input: TaskInput) => {
    if (!projectId) return
    const task = await api.post<Task>(`/projects/${projectId}/tasks`, input)
    state.setData([...(state.data ?? []), task])
    return task
  }

  const updateTask = async (taskId: string, input: Partial<TaskInput>) => {
    const task = await api.patch<Task>(`/tasks/${taskId}`, input)
    state.setData((state.data ?? []).map((t) => (t.id === taskId ? task : t)))
    return task
  }

  const deleteTask = async (taskId: string) => {
    await api.delete(`/tasks/${taskId}`)
    state.setData((state.data ?? []).filter((t) => t.id !== taskId))
  }

  const claimTask = async (taskId: string) => {
    const task = await api.post<Task>(`/tasks/${taskId}/claim`)
    state.setData((state.data ?? []).map((t) => (t.id === taskId ? task : t)))
    return task
  }

  return { ...state, createTask, updateTask, deleteTask, claimTask }
}

/** Pendientes fuera de proyecto (Parte C, fase 3) -- mismo shape que useTasks
 * para que KanbanBoard lo reuse sin ramas especiales, solo cambia el endpoint. */
export function useAdminTasks(enabled = true) {
  const state = useAsync<Task[]>(
    () => (enabled ? api.get<Task[]>('/admin-tasks') : Promise.resolve([])),
    [enabled],
  )

  const createTask = async (input: TaskInput) => {
    const task = await api.post<Task>('/admin-tasks', input)
    state.setData([...(state.data ?? []), task])
    return task
  }

  const updateTask = async (taskId: string, input: Partial<TaskInput>) => {
    const task = await api.patch<Task>(`/admin-tasks/${taskId}`, input)
    state.setData((state.data ?? []).map((t) => (t.id === taskId ? task : t)))
    return task
  }

  const deleteTask = async (taskId: string) => {
    await api.delete(`/admin-tasks/${taskId}`)
    state.setData((state.data ?? []).filter((t) => t.id !== taskId))
  }

  return { ...state, createTask, updateTask, deleteTask }
}

export function usePendingClaims(enabled = true) {
  const state = useAsync<PendingClaim[]>(
    () => (enabled ? api.get<PendingClaim[]>('/admin/claims') : Promise.resolve([])),
    [enabled],
  )

  const resolve = async (taskId: string, action: 'approve' | 'reject') => {
    await api.post(`/tasks/${taskId}/${action}-claim`)
    state.setData((state.data ?? []).filter((claim) => claim.task.id !== taskId))
  }

  return { ...state, resolve }
}

export function useComments(taskId: string | undefined) {
  const state = useAsync<TaskComment[]>(
    () => (taskId ? api.get<TaskComment[]>(`/tasks/${taskId}/comments`) : Promise.resolve([])),
    [taskId],
  )

  const addComment = async (content: string) => {
    if (!taskId) return
    const comment = await api.post<TaskComment>(`/tasks/${taskId}/comments`, { content })
    state.setData([...(state.data ?? []), comment])
    return comment
  }

  return { ...state, addComment }
}

export function useSubtasks(taskId: string | undefined) {
  const state = useAsync<Task[]>(
    () => (taskId ? api.get<Task[]>(`/tasks/${taskId}/subtasks`) : Promise.resolve([])),
    [taskId],
  )

  const createSubtask = async (projectId: string | null, title: string) => {
    if (!taskId || !projectId) return
    const subtask = await api.post<Task>(`/projects/${projectId}/tasks`, {
      title,
      parent_task_id: taskId,
    })
    state.setData([...(state.data ?? []), subtask])
    return subtask
  }

  const updateSubtask = async (subtaskId: string, patch: Partial<TaskInput>) => {
    const subtask = await api.patch<Task>(`/tasks/${subtaskId}`, patch)
    state.setData((state.data ?? []).map((t) => (t.id === subtaskId ? subtask : t)))
    return subtask
  }

  const deleteSubtask = async (subtaskId: string) => {
    await api.delete(`/tasks/${subtaskId}`)
    state.setData((state.data ?? []).filter((t) => t.id !== subtaskId))
  }

  return { ...state, createSubtask, updateSubtask, deleteSubtask }
}

export function useNotes(taskId: string | undefined) {
  const state = useAsync<TaskNote[]>(
    () => (taskId ? api.get<TaskNote[]>(`/tasks/${taskId}/notes`) : Promise.resolve([])),
    [taskId],
  )

  const addNote = async (content: string) => {
    if (!taskId) return
    const note = await api.post<TaskNote>(`/tasks/${taskId}/notes`, { content })
    state.setData([...(state.data ?? []), note])
    return note
  }

  return { ...state, addNote }
}
