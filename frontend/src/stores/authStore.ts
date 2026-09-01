import { create } from 'zustand'
import { authApi } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  fetchCurrentUser: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('nexus_token'),
  isLoading: true,
  isAuthenticated: !!localStorage.getItem('nexus_token'),

  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('nexus_token', token)
      set({ token, isAuthenticated: true })
    } else {
      localStorage.removeItem('nexus_token')
      set({ token: null, user: null, isAuthenticated: false })
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user })
  },

  fetchCurrentUser: async () => {
    const token = get().token
    if (!token) {
      set({ user: null, isLoading: false, isAuthenticated: false })
      return
    }

    try {
      set({ isLoading: true })
      const user = await authApi.getMe()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.removeItem('nexus_token')
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('nexus_token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },
}))
