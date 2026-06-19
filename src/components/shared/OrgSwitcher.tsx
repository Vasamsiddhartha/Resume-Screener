import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, Check, Building2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export function OrgSwitcher() {
  const { user, switchOrganization } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const memberships = user?.memberships ?? []
  const activeId = user?.organizationId
  const activeName = user?.organizationName ?? 'Organization'
  const multi = memberships.length > 1

  function switchTo(orgId: string) {
    if (orgId !== activeId) {
      switchOrganization(orgId)
      queryClient.invalidateQueries()
      navigate('/org/dashboard')
    }
    setOpen(false)
  }

  // Single-org users: static label, no switcher
  if (!multi) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {activeName.charAt(0)}
        </div>
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{activeName}</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-0"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {activeName.charAt(0)}
        </div>
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate flex-1 text-left">{activeName}</span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-50">
          <p className="px-3 py-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3 h-3" /> Switch organization
          </p>
          {memberships.map(m => (
            <button
              key={m.organizationId}
              onClick={() => switchTo(m.organizationId)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                m.organizationId === activeId
                  ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {m.organizationName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate font-medium">{m.organizationName}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {m.role === 'org_admin' ? 'Admin' : 'Recruiter'}
                </p>
              </div>
              {m.organizationId === activeId && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
