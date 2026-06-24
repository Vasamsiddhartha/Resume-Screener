import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/theme.store'
import { cn } from '@/lib/utils'

// Single-click toggle between Light and Dark (no dropdown, no System).
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggle } = useThemeStore()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={toggle}
      className={cn(
        'p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  )
}
