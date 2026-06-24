import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Two modes only — Light and Dark (no System).
type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  resolvedTheme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

function applyTheme(resolved: Theme) {
  const root = document.documentElement
  if (resolved === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

// Coerce any legacy/invalid persisted value (e.g. the old 'system') into a
// concrete theme — following the OS preference once as a sensible default.
function normalize(theme: unknown): Theme {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      resolvedTheme: 'light',

      setTheme: (theme: Theme) => {
        const t = normalize(theme)
        applyTheme(t)
        set({ theme: t, resolvedTheme: t })
      },

      toggle: () => {
        const next: Theme = get().resolvedTheme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next, resolvedTheme: next })
      },
    }),
    {
      name: 'ats-theme',
      partialize: state => ({ theme: state.theme }),
      onRehydrateStorage: () => state => {
        const t = normalize(state?.theme)
        applyTheme(t)
        if (state) {
          state.theme = t
          state.resolvedTheme = t
        }
      },
    }
  )
)
