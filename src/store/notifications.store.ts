import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationType =
  | 'evaluation' | 'candidate' | 'job' | 'team' | 'settings' | 'org' | 'info'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
}

interface NotificationsStore {
  items: AppNotification[]
  add: (n: { type: NotificationType; title: string; message: string }) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clear: () => void
}

const MAX = 50

export const useNotificationsStore = create<NotificationsStore>()(
  persist(
    set => ({
      items: [],
      add: (n) =>
        set(state => ({
          items: [
            { ...n, id: Math.random().toString(36).slice(2, 11), read: false, createdAt: new Date().toISOString() },
            ...state.items,
          ].slice(0, MAX),
        })),
      markRead: (id) => set(state => ({ items: state.items.map(i => i.id === id ? { ...i, read: true } : i) })),
      markAllRead: () => set(state => ({ items: state.items.map(i => ({ ...i, read: true })) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'ats-notifications' }
  )
)

// Fire-and-forget helper usable anywhere (services, mutations) without hooks.
export function notify(type: NotificationType, title: string, message: string) {
  useNotificationsStore.getState().add({ type, title, message })
}
