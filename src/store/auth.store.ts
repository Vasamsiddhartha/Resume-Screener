import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  switchOrganization: (organizationId: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    set => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      updateUser: (updates) =>
        set(state => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // Set the active organization context from the user's memberships
      switchOrganization: (organizationId) =>
        set(state => {
          if (!state.user) return state
          const m = state.user.memberships?.find(x => x.organizationId === organizationId)
          if (!m) return state
          return {
            user: {
              ...state.user,
              organizationId: m.organizationId,
              organizationName: m.organizationName,
              role: m.role,
            },
          }
        }),
    }),
    {
      name: 'ats-auth',
      partialize: state => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)
