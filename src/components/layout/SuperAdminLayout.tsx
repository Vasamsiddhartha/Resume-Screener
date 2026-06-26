import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, BarChart3, CreditCard,
  Settings, Menu, X, LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { cn } from '@/lib/utils'

type NavLeaf = { to: string; icon: typeof LayoutDashboard; label: string }
type NavSection = { heading: string; items: NavLeaf[] }

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/super-admin/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    heading: 'Management',
    items: [
      { to: '/super-admin/organizations', icon: Building2, label: 'Organizations' },
      { to: '/super-admin/users', icon: Users, label: 'Users' },
      { to: '/super-admin/plans', icon: CreditCard, label: 'Subscription Plans' },
    ],
  },
  {
    heading: 'System',
    items: [
      { to: '/super-admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

const ALL_ITEMS = NAV_SECTIONS.flatMap(s => s.items)
function titleForPath(pathname: string): string {
  const hit = ALL_ITEMS.find(i => pathname.startsWith(i.to))
  return hit?.label ?? 'Dashboard'
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'shell-sidebar fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-white/[0.07] shrink-0">
          <BrandLogo imgClassName="h-7" nameClassName="text-white font-semibold" />
          <span className="ml-auto text-[10px] font-medium bg-white/10 ring-1 ring-inset ring-white/15 text-white/80 px-2 py-0.5 rounded-full">
            Super Admin
          </span>
          <button
            onClick={onClose}
            className="lg:hidden ml-1 p-1 rounded text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav — sectioned with headings */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {NAV_SECTIONS.map(section => (
            <div key={section.heading} className="space-y-1">
              <p className="shell-heading px-3 mb-2">{section.heading}</p>
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium shell-link',
                      isActive && 'shell-link-active'
                    )
                  }
                  onClick={() => onClose()}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom — user card + logout */}
        <div className="px-3 pt-2 pb-3 border-t border-white/[0.07] shrink-0 space-y-1">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] ring-1 ring-inset ring-white/10 px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-violet-600 ring-1 ring-inset ring-white/15 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {(user?.name ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-sm truncate leading-tight">{user?.name}</p>
              <p className="text-[11px] text-white/45 truncate leading-tight mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium shell-link"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}

function Header({ onMenuClick, title }: { onMenuClick: () => void; title: string }) {
  return (
    <header className="h-14 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-transparent flex items-center gap-4 px-6 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      {/* Page title (left) */}
      <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>
      <div className="flex-1" />
      {/* Controls (right) */}
      <span className="text-xs font-medium text-violet-600 dark:text-violet-400 hidden sm:block bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">Super Admin</span>
      <ThemeToggle />
      <NotificationBell />
    </header>
  )
}

export function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title={titleForPath(location.pathname)} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
