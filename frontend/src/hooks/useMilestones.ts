import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import type { Milestone, MilestoneInput } from '@/types'

export function useMilestones(projectId: string | undefined) {
  return useAsync<Milestone[]>(
    () => (projectId ? api.get<Milestone[]>(`/projects/${projectId}/milestones`) : Promise.resolve([])),
    [projectId],
  )
}

export async function createMilestone(projectId: string, input: MilestoneInput) {
  return api.post<Milestone>(`/projects/${projectId}/milestones`, input)
}

export async function updateMilestone(id: string, input: Partial<MilestoneInput>) {
  return api.patch<Milestone>(`/milestones/${id}`, input)
}

export async function deleteMilestone(id: string) {
  return api.delete(`/milestones/${id}`)
}
