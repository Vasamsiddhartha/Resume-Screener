import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Briefcase, Users, FileSearch,
  Settings, Menu, X, LogOut, User, Plus, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { OrgSwitcher } from '@/components/shared/OrgSwitcher'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { cn } from '@/lib/utils'
import { useOrgBase } from '@/lib/orgRoutes'

// Rewrite a static "/org/..." nav path onto the active org's base, e.g.
// "/org/jobs" + base "/green-land" -> "/green-land/jobs".
const rebase = (to: string, base: string) => base + to.replace(/^\/org/, '')

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
  {
    icon: Settings, label: 'Settings', children: [
      { to: '/org/settings/profile', label: 'Profile' },
      { to: '/org/settings/team', label: 'Team Members' },
      { to: '/org/settings/notifications', label: 'Notifications' },
      { to: '/org/settings/model', label: 'Model' },
      { to: '/org/settings/organization', label: 'Organization' },
    ],
  },
]

// Does the current path belong to this group (its own route or a child)?
function groupMatchesPath(item: NavGroupItem, pathname: string, base: string): boolean {
  const p = item.to ? rebase(item.to, base) : undefined
  if (p && (pathname === p || pathname.startsWith(p + '/'))) return true
  return item.children.some(c => {
    const cp = rebase(c.to, base)
    return pathname === cp || pathname.startsWith(cp + '/')
  })
}

// Controlled accordion item — `open` is owned by the Sidebar so only one group is
// expanded at a time and it auto-collapses when you navigate elsewhere.
function NavGroup({ item, open, onToggle, onNavigate }: { item: NavGroupItem; open: boolean; onToggle: () => void; onNavigate: () => void }) {
  const { pathname } = useLocation()
  const base = useOrgBase()
  const parentTo = item.to ? rebase(item.to, base) : undefined
  const childActive = item.children.some(c => pathname.startsWith(rebase(c.to, base)))
  const parentActive = parentTo ? pathname === parentTo || pathname.startsWith(parentTo + '/') : false

  const headerClass = cn(
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    childActive || parentActive
      ? 'bg-violet-50 dark:bg-violet-500/[0.12] text-violet-700 dark:text-violet-300 dark:ring-1 dark:ring-inset dark:ring-violet-400/20'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
  )

  return (
    <div>
      <div className="flex items-center">
        {parentTo ? (
          // Clicking the parent navigates; the route sync then expands this group.
          <NavLink to={parentTo} onClick={onNavigate} className={cn(headerClass, 'flex-1')}>
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ) : (
          <button onClick={onToggle} className={cn(headerClass, 'flex-1')}>
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </button>
        )}
        <button onClick={onToggle} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle">
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-slate-100 dark:border-transparent space-y-0.5">
          {item.children.map(c => (
            <NavLink
              key={c.to}
              to={rebase(c.to, base)}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-violet-50 dark:bg-violet-500/[0.12] text-violet-700 dark:text-violet-300 dark:ring-1 dark:ring-inset dark:ring-violet-400/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
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
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const base = useOrgBase()

  // Single open dropdown (accordion). Synced to the route: navigating to a page
  // outside a group collapses all groups; into a group expands just that one.
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  useEffect(() => {
    const match = NAV_ITEMS.find(it => 'children' in it && groupMatchesPath(it, pathname, base))
    setOpenGroup(match ? match.label : null)
  }, [pathname, base])

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-transparent z-40 flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Current organization (static brand — switching lives in the top bar) */}
        <div className="h-14 flex items-center gap-2 px-3 border-b border-slate-100 dark:border-transparent shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {user?.organizationLogo ? (
              <img src={user.organizationLogo} alt={user.organizationName} className="w-7 h-7 rounded-lg object-contain shrink-0 bg-white" />
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
        <div className="px-3 py-3 border-b border-slate-100 dark:border-transparent shrink-0">
          <button
            onClick={() => { navigate(`${base}/evaluations/new`); onClose() }}
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
              <NavGroup
                key={item.label}
                item={item}
                open={openGroup === item.label}
                onToggle={() => setOpenGroup(g => (g === item.label ? null : item.label))}
                onNavigate={onClose}
              />
            ) : (
              <NavLink
                key={item.to}
                to={rebase(item.to, base)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-violet-50 dark:bg-violet-500/[0.12] text-violet-700 dark:text-violet-300 dark:ring-1 dark:ring-inset dark:ring-violet-400/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
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
      </aside>
    </>
  )
}

// Top-right profile menu: avatar (first letter) + name + role, with a dropdown of
// Profile / Settings / Sign out (all clickable).
function ProfileMenu() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const base = useOrgBase()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const initial = (user?.name ?? 'U').charAt(0).toUpperCase()
  const itemClass = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 rounded-lg pl-1 pr-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {initial}
        </div>
        <div className="text-left hidden sm:block min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[140px]">{user?.name}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize leading-tight">
            {user?.role === 'org_admin' ? 'Admin' : 'Recruiter'}
          </p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-50">
          <button className={itemClass} onClick={() => { setOpen(false); navigate(`${base}/settings/profile`) }}>
            <User className="w-4 h-4" /> Profile
          </button>
          <button className={itemClass} onClick={() => { setOpen(false); navigate(`${base}/settings`) }}>
            <Settings className="w-4 h-4" /> Settings
          </button>
          <div className="border-t border-slate-100 dark:border-transparent my-1" />
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            onClick={() => { setOpen(false); logout(); navigate('/login') }}
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-14 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-transparent flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1" />
      <ThemeToggle />
      <NotificationBell />
      <OrgSwitcher variant="header" />
      <ProfileMenu />
    </header>
  )
}

export function OrgLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const base = useOrgBase()
  const { orgSlug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Keep the URL's first segment in sync with the active organization's name.
  // Existing "/org/..." links still resolve (":orgSlug" matches "org"); this then
  // rewrites the slug to the real org name without touching the rest of the path.
  useEffect(() => {
    const realSlug = base.slice(1)
    if (orgSlug && realSlug && orgSlug !== realSlug) {
      const rest = location.pathname.replace(/^\/[^/]+/, '')
      // Preserve any router state (e.g. candidateId / preset filters) across the rewrite.
      navigate(`/${realSlug}${rest}${location.search}`, { replace: true, state: location.state })
    }
  }, [orgSlug, base, location.pathname, location.search, location.state, navigate])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent">
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
