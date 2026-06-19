import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  clearAuth: () => void
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

      // User-initiated: end the Supabase session (fires SIGNED_OUT, which the
      // App listener turns into clearAuth) and clear local state.
      logout: () => {
        supabase?.auth.signOut()
        set({ user: null, token: null, isAuthenticated: false })
      },

      // Clear local auth state only — never calls signOut, so it's safe to call
      // from the SIGNED_OUT listener / boot without recursing.
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),

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
