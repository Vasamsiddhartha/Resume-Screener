import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, FileSearch, Users, Briefcase, UserCog, Settings, Building2, Info, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNotificationsStore, type NotificationType } from '@/store/notifications.store'
import { useAuthStore } from '@/store/auth.store'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ICONS: Record<NotificationType, LucideIcon> = {
  evaluation: FileSearch,
  candidate: Users,
  job: Briefcase,
  team: UserCog,
  settings: Settings,
  org: Building2,
  info: Info,
}

export function NotificationBell() {
  const { items, markRead, markAllRead, clear } = useNotificationsStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = items.filter(i => !i.read).length
  const allPath = user?.role === 'super_admin' ? '/super-admin/notifications' : '/org/notifications'

  function viewAll() {
    setOpen(false)
    navigate(allPath)
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread) markAllRead() }}
        className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06]">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
            {items.length > 0 && (
              <button onClick={clear} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Clear all</button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              items.map(n => {
                const Icon = ICONS[n.type] ?? Info
                return (
                  <button
                    key={n.id}
                    onClick={() => { markRead(n.id); viewAll() }}
                    className={cn(
                      'w-full text-left flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-white/[0.06]/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors',
                      !n.read && 'bg-violet-50/40 dark:bg-violet-900/10'
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {n.title}
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">{n.message}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="flex items-center border-t border-slate-100 dark:border-white/[0.06]">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            <button
              onClick={viewAll}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
