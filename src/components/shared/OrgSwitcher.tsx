import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, ChevronDown, Check, Building2, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useQueryClient } from '@tanstack/react-query'
import { Modal, Input, Button } from '@/components/ui'
import { isSupabaseConfigured } from '@/lib/supabase'
import { supabaseAuth, buildUserFromSupabase } from '@/services/supabaseAuth'
import { notify } from '@/store/notifications.store'
import { cn } from '@/lib/utils'

function OrgAvatar({ name, logo, size = 7 }: { name: string; logo?: string; size?: 6 | 7 }) {
  const dim = size === 7 ? 'w-7 h-7 text-xs' : 'w-6 h-6 text-[10px]'
  if (logo) {
    return <img src={logo} alt={name} className={`${dim} rounded-lg object-cover shrink-0 bg-white`} />
  }
  return (
    <div className={`${dim} rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {name.charAt(0)}
    </div>
  )
}

export function OrgSwitcher({ variant = 'sidebar' }: { variant?: 'sidebar' | 'header' } = {}) {
  const { user, switchOrganization, setAuth, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState('')
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

  function switchTo(orgId: string) {
    if (orgId !== activeId) {
      switchOrganization(orgId)
      queryClient.invalidateQueries()
      navigate('/org/dashboard')
    }
    setOpen(false)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setErr('')
    try {
      if (isSupabaseConfigured) {
        const org = await supabaseAuth.createOrganization(newName)
        const refreshed = await buildUserFromSupabase()
        if (refreshed) setAuth(refreshed, 'supabase')
        switchOrganization(org.id)
      } else {
        // Mock mode — append a local membership
        const id = Math.random().toString(36).slice(2, 10)
        updateUser({
          memberships: [
            ...memberships,
            { organizationId: id, organizationName: newName.trim(), role: 'org_admin' },
          ],
          organizationId: id,
          organizationName: newName.trim(),
          role: 'org_admin',
        })
      }
      notify('org', 'Organization created', newName.trim())
      queryClient.invalidateQueries()
      setCreateOpen(false)
      setNewName('')
      setOpen(false)
      navigate('/org/dashboard')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create organization')
    } finally {
      setCreating(false)
    }
  }

  const isHeader = variant === 'header'
  const otherCount = memberships.filter(m => m.organizationId !== activeId).length
  // Only admins (of any org) and super admins may spin up new organizations.
  const canCreateOrg = user?.role === 'super_admin' || memberships.some(m => m.role === 'org_admin')

  return (
    <>
      {isHeader && (
        <span className="hidden md:block text-sm text-slate-400 dark:text-slate-500 mr-1">
          Click to switch to a different org
        </span>
      )}
      <div ref={ref} className={cn('relative min-w-0', isHeader ? 'shrink-0' : 'flex-1')}>
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'flex items-center gap-2 transition-colors min-w-0',
            isHeader
              ? 'px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              : 'w-full px-1.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <OrgAvatar name={activeName} logo={user?.organizationLogo} />
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate flex-1 text-left max-w-[160px]">{activeName}</span>
          {isHeader
            ? <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
            : <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        </button>

        {open && (
          <div className={cn(
            'absolute top-full mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-50',
            isHeader ? 'right-0' : 'left-0'
          )}>
            <p className="px-3 py-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Switch organization
            </p>
            {otherCount === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic">
                No other organizations
              </p>
            )}
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
                <OrgAvatar name={m.organizationName} logo={m.organizationLogo} size={6} />
                <div className="flex-1 min-w-0 text-left">
                  <p className="truncate font-medium">{m.organizationName}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {m.role === 'org_admin' ? 'Admin' : 'Recruiter'}
                  </p>
                </div>
                {m.organizationId === activeId && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}

            {canCreateOrg && (
              <>
                <div className="border-t border-slate-100 dark:border-transparent my-1" />
                <button
                  onClick={() => { setOpen(false); setCreateOpen(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <div className="w-6 h-6 rounded-md border border-dashed border-violet-300 dark:border-violet-700 flex items-center justify-center shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  Create organization
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setNewName(''); setErr('') }}
        title="Create organization"
        description="Spin up another workspace under your account"
        footer={
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setNewName(''); setErr('') }}>Cancel</Button>
            <Button isLoading={creating} disabled={!newName.trim()} onClick={handleCreate}>Create</Button>
          </div>
        }
      >
        <Input
          label="Organization name"
          placeholder="e.g. 1XL Infra"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          error={err || undefined}
        />
      </Modal>
    </>
  )
}
