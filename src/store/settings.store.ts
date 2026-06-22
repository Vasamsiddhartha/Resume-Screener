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
  // Empty string = use DEFAULT_MODEL.url
  scoreModelUrl: string
  setNotification: (key: keyof NotificationPreferences, value: boolean) => void
  setDensity: (density: 'comfortable' | 'compact') => void
  setScoreModelUrl: (url: string) => void
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
      scoreModelUrl: '',

      setNotification: (key, value) =>
        set(state => ({ notifications: { ...state.notifications, [key]: value } })),

      setDensity: (density) => set({ density }),

      setScoreModelUrl: (url) => set({ scoreModelUrl: url.trim() }),
    }),
    { name: 'ats-settings' }
  )
)

/** The scoring endpoint actually in use (override or default). */
export function getScoreModelUrl(): string {
  return useSettingsStore.getState().scoreModelUrl || DEFAULT_MODEL.url
}
