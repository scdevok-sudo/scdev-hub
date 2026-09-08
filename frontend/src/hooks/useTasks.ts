import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import type { PendingClaim, Task, TaskComment, TaskInput } from '@/types'

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
