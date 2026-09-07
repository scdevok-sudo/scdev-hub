import { useAuthStore } from '@/stores/authStore'

export function useCurrentUser() {
  const user = useAuthStore((s) => s.user)
  return {
    user,
    isAdmin: user?.role === 'admin',
  }
}
