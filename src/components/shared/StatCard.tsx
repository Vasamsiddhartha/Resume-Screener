import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  description?: string
  className?: string
  compact?: boolean
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-violet-600 dark:text-violet-400',
  iconBg = 'bg-violet-100 dark:bg-violet-900/30',
  description,
  className,
  compact = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'surface-card kpi-gradient rounded-xl bg-white dark:bg-slate-900',
        'border border-slate-200/80 dark:border-transparent',
        'transition-colors duration-200 hover:border-slate-300/80 dark:hover:bg-slate-800/50',
        compact ? 'p-3' : 'p-5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <p className={cn('font-bold text-slate-900 dark:text-slate-100 mt-1 leading-none', compact ? 'text-xl' : 'text-2xl')}>
            {value}
          </p>
          {(change || description) && (
            <div className="mt-2 flex items-center gap-1.5">
              {change && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    changeType === 'up' && 'text-emerald-600 dark:text-emerald-400',
                    changeType === 'down' && 'text-red-600 dark:text-red-400',
                    changeType === 'neutral' && 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : ''} {change}
                </span>
              )}
              {description && (
                <span className="text-xs text-slate-400 dark:text-slate-500">{description}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn('rounded-xl shrink-0 ring-1 ring-inset ring-black/[0.04] dark:ring-white/10', iconBg, compact ? 'p-2' : 'p-3')}>
          <Icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  )
}
