import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import type { Project, ProjectSummary } from '@/types'

export function useProjects() {
  return useAsync<Project[]>(() => api.get<Project[]>('/projects'), [])
}

export function useProject(id: string | undefined) {
  return useAsync<Project | null>(
    () => (id ? api.get<Project>(`/projects/${id}`) : Promise.resolve(null)),
    [id],
  )
}

export function useProjectSummary(id: string | undefined, enabled = true) {
  return useAsync<ProjectSummary | null>(
    () => (id && enabled ? api.get<ProjectSummary>(`/projects/${id}/summary`) : Promise.resolve(null)),
    [id, enabled],
  )
}
