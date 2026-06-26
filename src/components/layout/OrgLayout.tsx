import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Briefcase, Users, FileSearch, KanbanSquare,
  Settings, Menu, X, LogOut, User, UserCog, Bell, SlidersHorizontal,
  Building2, Plus, ChevronDown,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { OrgSwitcher } from '@/components/shared/OrgSwitcher'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { organizationService } from '@/services/organization.service'
import { cn } from '@/lib/utils'
import { useOrgBase } from '@/lib/orgRoutes'

// Rewrite a static "/org/..." nav path onto the active org's base, e.g.
// "/org/jobs" + base "/green-land" -> "/green-land/jobs".
const rebase = (to: string, base: string) => base + to.replace(/^\/org/, '')

type NavLeaf = { to: string; icon: LucideIcon; label: string }
type NavSection = { heading: string; items: NavLeaf[] }

// Grouped under headings so the purpose of each page is clear before you click it.
// Settings sub-pages are shown expanded by default (no accordion) to use the space.
const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/org/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    heading: 'Recruitment',
    items: [
      { to: '/org/jobs', icon: Briefcase, label: 'Jobs' },
      { to: '/org/candidates', icon: Users, label: 'Candidates' },
      { to: '/org/pipeline', icon: KanbanSquare, label: 'Pipeline' },
      { to: '/org/evaluations', icon: FileSearch, label: 'ATS Evaluations' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { to: '/org/settings/profile', icon: User, label: 'Profile' },
      { to: '/org/settings/team', icon: UserCog, label: 'Team Members' },
      { to: '/org/settings/notifications', icon: Bell, label: 'Notifications' },
      { to: '/org/settings/model', icon: SlidersHorizontal, label: 'Model' },
      { to: '/org/settings/organization', icon: Building2, label: 'Organization' },
    ],
  },
]

// Resolve the human title for the current route, used in the top bar.
const TITLE_RULES: [RegExp, string][] = [
  [/\/dashboard$/, 'Dashboard'],
  [/\/jobs$/, 'Jobs'],
  [/\/candidates$/, 'Candidates'],
  [/\/pipeline$/, 'Pipeline'],
  [/\/evaluations\/new$/, 'New Evaluation'],
  [/\/evaluations$/, 'ATS Evaluations'],
  [/\/settings\/profile$/, 'Profile'],
  [/\/settings\/team$/, 'Team Members'],
  [/\/settings\/notifications$/, 'Notifications'],
  [/\/settings\/model$/, 'Model Settings'],
  [/\/settings\/organization$/, 'Organization'],
  [/\/settings/, 'Settings'],
]
function titleForPath(pathname: string): string {
  return TITLE_RULES.find(([re]) => re.test(pathname))?.[1] ?? 'Dashboard'
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const base = useOrgBase()
  const orgName = user?.organizationName ?? 'Organization'
  const orgId = user?.organizationId

  // Active org's subscription plan, shown under the org name (e.g. "premium").
  const { data: org } = useQuery({
    queryKey: ['org-card', orgId],
    queryFn: () => organizationService.getById(orgId as string),
    enabled: !!orgId,
  })

  const initial = (user?.name ?? 'U').charAt(0).toUpperCase()

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'shell-sidebar fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Organization — naked logo + name + plan, no container */}
        <div className="flex items-center gap-3.5 px-4 pt-5 pb-3 shrink-0">
          {user?.organizationLogo ? (
            <img
              src={user.organizationLogo}
              alt={orgName}
              className="h-11 w-auto max-w-[60px] object-contain shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white/10 ring-1 ring-inset ring-white/15 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {orgName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-base truncate leading-tight">{orgName}</p>
            <p className="text-xs text-white/50 capitalize leading-tight mt-0.5">{org?.plan ?? 'Workspace'}</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded text-white/60 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action */}
        <div className="px-3 pt-3 shrink-0">
          <button
            onClick={() => { navigate(`${base}/evaluations/new`); onClose() }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-md text-sm font-medium ring-1 ring-inset ring-white/10 shadow-lg shadow-black/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Evaluation
          </button>
        </div>

        {/* Nav — sectioned with headings, all items shown (Settings expanded) */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {NAV_SECTIONS.map(section => (
            <div key={section.heading} className="space-y-1">
              <p className="shell-heading px-3 mb-2">{section.heading}</p>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={rebase(item.to, base)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium shell-link',
                      isActive && 'shell-link-active'
                    )
                  }
                  onClick={() => onClose()}
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom — user card + logout */}
        <div className="px-3 pt-2 pb-3 border-t border-white/[0.07] shrink-0 space-y-1">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] ring-1 ring-inset ring-white/10 px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-violet-600 ring-1 ring-inset ring-white/15 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-sm truncate leading-tight">{user?.name}</p>
              <p className="text-[11px] text-white/45 capitalize leading-tight mt-0.5">
                {user?.role === 'org_admin' ? 'Admin' : 'Recruiter'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
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
        <div className="text-right hidden sm:block min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[140px]">{user?.name}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize leading-tight">
            {user?.role === 'org_admin' ? 'Admin' : 'Recruiter'}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {initial}
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

function Header({ onMenuClick, title }: { onMenuClick: () => void; title: string }) {
  return (
    <header className="h-14 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-transparent flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      {/* Page title (left) */}
      <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>
      <div className="flex-1" />
      {/* Controls (right): org context, utilities, then profile far right */}
      <OrgSwitcher variant="header" />
      <ThemeToggle />
      <NotificationBell />
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
        <Header onMenuClick={() => setSidebarOpen(true)} title={titleForPath(location.pathname)} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
