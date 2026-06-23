import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Briefcase, Users, FileSearch,
  Settings, Menu, X, LogOut, User, Plus, BarChart3, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { OrgSwitcher } from '@/components/shared/OrgSwitcher'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { cn } from '@/lib/utils'

type NavLeaf = { to: string; icon: LucideIcon; label: string }
type NavGroupItem = { to?: string; icon: LucideIcon; label: string; children: { to: string; label: string }[] }
type NavItem = NavLeaf | NavGroupItem

const NAV_ITEMS: NavItem[] = [
  { to: '/org/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/org/jobs', icon: Briefcase, label: 'Jobs' },
  {
    to: '/org/candidates', icon: Users, label: 'Candidates', children: [
      { to: '/org/pipeline', label: 'Pipeline' },
    ],
  },
  { to: '/org/evaluations', icon: FileSearch, label: 'ATS Evaluations' },
  { to: '/org/analytics', icon: BarChart3, label: 'Analytics' },
  {
    icon: Settings, label: 'Settings', children: [
      { to: '/org/settings/profile', label: 'Profile' },
      { to: '/org/settings/team', label: 'Team Members' },
      { to: '/org/settings/notifications', label: 'Notifications' },
      { to: '/org/settings/appearance', label: 'Appearance' },
      { to: '/org/settings/model', label: 'Model' },
      { to: '/org/settings/organization', label: 'Organization' },
    ],
  },
]

function NavGroup({ item, onNavigate }: { item: NavGroupItem; onNavigate: () => void }) {
  const { pathname } = useLocation()
  const childActive = item.children.some(c => pathname.startsWith(c.to))
  const parentActive = item.to ? pathname === item.to || pathname.startsWith(item.to + '/') : false
  const [open, setOpen] = useState(childActive || parentActive)

  const headerClass = cn(
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    childActive || parentActive
      ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
  )

  return (
    <div>
      <div className="flex items-center">
        {item.to ? (
          <NavLink to={item.to} onClick={onNavigate} className={cn(headerClass, 'flex-1')}>
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ) : (
          <button onClick={() => setOpen(o => !o)} className={cn(headerClass, 'flex-1')}>
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </button>
        )}
        <button onClick={() => setOpen(o => !o)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle">
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-slate-100 dark:border-slate-800 space-y-0.5">
          {item.children.map(c => (
            <NavLink
              key={c.to}
              to={c.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                )
              }
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
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
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Current organization (static brand — switching lives in the top bar) */}
        <div className="h-14 flex items-center gap-2 px-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {user?.organizationLogo ? (
              <img src={user.organizationLogo} alt={user.organizationName} className="w-7 h-7 rounded-lg object-cover shrink-0 bg-white" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(user?.organizationName ?? 'O').charAt(0)}
              </div>
            )}
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
              {user?.organizationName ?? 'Organization'}
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action */}
        <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={() => { navigate('/org/evaluations/new'); onClose() }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Evaluation
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map(item =>
            'children' in item ? (
              <NavGroup key={item.label} item={item} onNavigate={onClose} />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  )
                }
                onClick={() => onClose()}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2">
            <button
              onClick={() => { navigate('/org/settings'); onClose() }}
              className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg -m-1 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Edit profile"
            >
              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user?.role === 'org_admin' ? 'Admin' : 'Recruiter'}
                </p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuthStore()

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 px-6 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1" />
      <OrgSwitcher variant="header" />
      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize hidden sm:block">
        {user?.role === 'org_admin' ? 'Admin' : 'Recruiter'}
      </span>
      <NotificationBell />
      <ThemeToggle />
    </header>
  )
}

export function OrgLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
