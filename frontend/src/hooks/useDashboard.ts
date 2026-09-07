import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import type { DashboardData } from '@/types'

export function useDashboard() {
  return useAsync<DashboardData>(() => api.get<DashboardData>('/dashboard'), [])
}
