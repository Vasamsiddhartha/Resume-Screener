import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, Shield, User as UserIcon } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useQueryClient } from '@tanstack/react-query'

export function SelectOrganizationPage() {
  const { user, isAuthenticated, switchOrganization } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Guard: must be authenticated; single-org users skip this screen
  if (!isAuthenticated || !user) {
    navigate('/login', { replace: true })
    return null
  }
  const memberships = user.memberships ?? []
  if (memberships.length <= 1) {
    navigate('/org/dashboard', { replace: true })
    return null
  }

  function choose(orgId: string) {
    switchOrganization(orgId)
    queryClient.invalidateQueries()
    navigate('/org/dashboard')
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Choose an organization</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          You belong to {memberships.length} organizations. Pick one to continue.
        </p>
      </div>

      <div className="space-y-3">
        {memberships.map(m => (
          <button
            key={m.organizationId}
            onClick={() => choose(m.organizationId)}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {m.organizationName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.organizationName}</p>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {m.role === 'org_admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                {m.role === 'org_admin' ? 'Admin' : 'Recruiter'}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-500 transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
