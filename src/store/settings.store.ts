import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NotificationPreferences } from '@/types'

interface SettingsStore {
  notifications: NotificationPreferences
  density: 'comfortable' | 'compact'
  setNotification: (key: keyof NotificationPreferences, value: boolean) => void
  setDensity: (density: 'comfortable' | 'compact') => void
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

      setNotification: (key, value) =>
        set(state => ({ notifications: { ...state.notifications, [key]: value } })),

      setDensity: (density) => set({ density }),
    }),
    { name: 'ats-settings' }
  )
)
