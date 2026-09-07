import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import type { User, UserWithHours } from '@/types'

export function useUsers() {
  return useAsync<User[]>(() => api.get<User[]>('/users'), [])
}

export function useUsersWithHours(enabled = true) {
  return useAsync<UserWithHours[]>(
    () => (enabled ? api.get<UserWithHours[]>('/admin/users') : Promise.resolve([])),
    [enabled],
  )
}
