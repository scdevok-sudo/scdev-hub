import { create } from 'zustand'
import { api } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  loaded: boolean
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  loaded: false,
  fetchMe: async () => {
    set({ loading: true })
    try {
      const user = await api.get<User>('/auth/me')
      set({ user, loading: false, loaded: true })
    } catch {
      set({ user: null, loading: false, loaded: true })
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      set({ user: null })
      window.location.href = '/login'
    }
  },
}))
