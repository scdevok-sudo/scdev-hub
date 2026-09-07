import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import type { TimeLog, TimeLogInput } from '@/types'

export function useMyTimeLogs(month?: number, year?: number, projectId?: string) {
  return useAsync<TimeLog[]>(
    () => api.get<TimeLog[]>('/time-logs', { month, year, project_id: projectId }),
    [month, year, projectId],
  )
}

export function useProjectTimeLogs(projectId: string | undefined) {
  return useAsync<TimeLog[]>(
    () => (projectId ? api.get<TimeLog[]>(`/projects/${projectId}/time-logs`) : Promise.resolve([])),
    [projectId],
  )
}

export async function createTimeLog(input: TimeLogInput) {
  return api.post<TimeLog>('/time-logs', input)
}

export async function updateTimeLog(id: string, input: Partial<TimeLogInput>) {
  return api.patch<TimeLog>(`/time-logs/${id}`, input)
}

export async function deleteTimeLog(id: string) {
  return api.delete(`/time-logs/${id}`)
}
