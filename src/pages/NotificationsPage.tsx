import { Bell, Check, Trash2, FileSearch, Users, Briefcase, UserCog, Settings, Building2, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, Button } from '@/components/ui'
import { useNotificationsStore, type NotificationType } from '@/store/notifications.store'
import { formatDateTime, cn } from '@/lib/utils'

const ICONS: Record<NotificationType, LucideIcon> = {
  evaluation: FileSearch,
  candidate: Users,
  job: Briefcase,
  team: UserCog,
  settings: Settings,
  org: Building2,
  info: Info,
}

const TYPE_LABEL: Record<NotificationType, string> = {
  evaluation: 'Evaluation',
  candidate: 'Candidate',
  job: 'Job',
  team: 'Team',
  settings: 'Settings',
  org: 'Organization',
  info: 'Info',
}

export function NotificationsPage() {
  const { items, markRead, markAllRead, clear } = useNotificationsStore()
  const unread = items.filter(i => !i.read).length

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'All caught up'}
        action={
          items.length > 0 ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" leftIcon={<Check className="w-4 h-4" />} onClick={markAllRead} disabled={unread === 0}>
                Mark all read
              </Button>
              <Button variant="ghost" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={clear}>
                Clear all
              </Button>
            </div>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <Card className="py-20 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {items.map(n => {
              const Icon = ICONS[n.type] ?? Info
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors',
                    !n.read && 'bg-violet-50/40 dark:bg-violet-900/10'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {TYPE_LABEL[n.type]}
                      </span>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap break-words">{n.message}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{formatDateTime(n.createdAt)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
