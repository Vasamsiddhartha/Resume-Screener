import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NotificationPreferences } from '@/types'

// The default scoring model endpoint (used unless overridden in Settings → Model).
export const DEFAULT_MODEL = {
  name: 'Resume Screening v1 (default)',
  url: import.meta.env.VITE_SCORE_API_URL ?? 'https://siddhartha1xl-resume-screening.hf.space/score',
}

interface SettingsStore {
  notifications: NotificationPreferences
  density: 'comfortable' | 'compact'
  // Optional fallback scoring endpoint, used only if the default model fails.
  fallbackModelUrl: string
  setNotification: (key: keyof NotificationPreferences, value: boolean) => void
  setDensity: (density: 'comfortable' | 'compact') => void
  setFallbackModelUrl: (url: string) => void
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  evaluationCompleted: true,
  candidateShortlisted: true,
  weeklyReport: false,
  teamInvites: true,
  productUpdates: false,
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      notifications: DEFAULT_NOTIFICATIONS,
      density: 'comfortable',
      fallbackModelUrl: '',

      setNotification: (key, value) =>
        set(state => ({ notifications: { ...state.notifications, [key]: value } })),

      setDensity: (density) => set({ density }),

      setFallbackModelUrl: (url) => set({ fallbackModelUrl: url.trim() }),
    }),
    { name: 'ats-settings' }
  )
)

/** The primary scoring endpoint (built-in default). */
export function getPrimaryModelUrl(): string {
  return DEFAULT_MODEL.url
}

/** The optional fallback endpoint (empty = none). Read live each call. */
export function getFallbackModelUrl(): string {
  return useSettingsStore.getState().fallbackModelUrl.trim()
}
