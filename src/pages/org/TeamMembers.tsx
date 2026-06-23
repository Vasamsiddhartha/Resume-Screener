import { useState } from 'react'
import { UserPlus, Trash2, Shield, User, CheckCircle, Clock, Link2, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, Button, Input, Select, Modal, ConfirmModal, Badge, Spinner } from '@/components/ui'
import { teamService } from '@/services/team.service'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { notify } from '@/store/notifications.store'
import type { TeamMember } from '@/types'

const schema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['org_admin', 'recruiter']),
})
type FormData = z.infer<typeof schema>

export function TeamMembersPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuthStore()
  const orgId = user?.organizationId ?? 'org1'
  const isAdmin = user?.role === 'org_admin'
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [copiedEmail, setCopiedEmail] = useState('')

  function copyInviteLink(email: string) {
    const url = `${window.location.origin}${window.location.pathname}#/accept-invite?email=${encodeURIComponent(email)}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail(''), 2000)
    })
  }

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team', orgId],
    queryFn: () => teamService.getMembers(orgId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'recruiter' },
  })

  const inviteMutation = useMutation({
    mutationFn: (payload: FormData) => teamService.invite(orgId, { ...payload, organizationName: user?.organizationName, organizationLogo: user?.organizationLogo }),
    onSuccess: (m) => { notify('team', 'Member invited', `${m.email} as ${m.role === 'org_admin' ? 'Admin' : 'Recruiter'}`); queryClient.invalidateQueries({ queryKey: ['team'] }); setInviteOpen(false); reset() },
  })

  const removeMutation = useMutation({
    mutationFn: (member: TeamMember) => teamService.remove(member.id, !member.isActive),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team'] }); setRemoveTarget(null) },
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'org_admin' | 'recruiter' }) => teamService.updateRole(id, role),
    onSuccess: (_d, vars) => { notify('team', 'Role updated', `Changed to ${vars.role === 'org_admin' ? 'Admin' : 'Recruiter'}`); queryClient.invalidateQueries({ queryKey: ['team'] }) },
  })

  return (
    <div>
      {embedded ? (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Team Members</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage who has access to your organization</p>
          </div>
          {isAdmin && (
            <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setInviteOpen(true)}>
              Invite Member
            </Button>
          )}
        </div>
      ) : (
        <PageHeader
          title="Team Members"
          description="Manage who has access to your organization"
          action={isAdmin ? (
            <Button leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setInviteOpen(true)}>
              Invite Member
            </Button>
          ) : undefined}
        />
      )}

      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  {member.role === 'org_admin' ? (
                    <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  ) : (
                    <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{member.name}</p>
                    <Badge variant={member.role === 'org_admin' ? 'purple' : 'default'}>
                      {member.role === 'org_admin' ? 'Admin' : 'Recruiter'}
                    </Badge>
                    <Badge variant={member.isActive ? 'success' : 'warning'}>
                      {member.isActive ? 'Active' : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{member.email}</p>
                </div>

                {/* Editable role (admins, active members other than self) */}
                {isAdmin && member.isActive && member.id !== user?.id && (
                  <Select
                    className="w-32 shrink-0"
                    options={[
                      { value: 'recruiter', label: 'Recruiter' },
                      { value: 'org_admin', label: 'Admin' },
                    ]}
                    value={member.role}
                    onChange={e => roleMutation.mutate({ id: member.id, role: e.target.value as 'org_admin' | 'recruiter' })}
                  />
                )}

                <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 shrink-0">
                  {member.isActive ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Joined {formatDate(member.joinedAt)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Invited {formatDate(member.joinedAt)}
                    </span>
                  )}
                </div>

                {isAdmin && !member.isActive && (
                  <button
                    onClick={() => copyInviteLink(member.email)}
                    className="text-xs font-medium px-2 py-1 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors shrink-0 flex items-center gap-1"
                    title="Copy the set-password link to share with the invitee"
                  >
                    {copiedEmail === member.email ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copiedEmail === member.email ? 'Copied' : 'Copy link'}
                  </button>
                )}
                {isAdmin && member.id !== user?.id && (
                  <button
                    onClick={() => setRemoveTarget(member)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => { setInviteOpen(false); reset() }}
        title="Invite Team Member"
        description="An invitation email will be sent to the provided address"
        footer={
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => { setInviteOpen(false); reset() }}>Cancel</Button>
            <Button
              isLoading={inviteMutation.isPending}
              onClick={handleSubmit(d => inviteMutation.mutate(d))}
            >
              Send Invitation
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {inviteMutation.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">
                {inviteMutation.error instanceof Error ? inviteMutation.error.message : 'Failed to invite'}
              </p>
            </div>
          )}
          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@company.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Select
            label="Role"
            options={[
              { value: 'recruiter', label: 'Recruiter — can upload resumes and run evaluations' },
              { value: 'org_admin', label: 'Admin — full organization access' },
            ]}
            error={errors.role?.message}
            {...register('role')}
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget)}
        title="Remove Member"
        description={`Remove ${removeTarget?.name} from your organization? They will lose all access immediately.`}
        isLoading={removeMutation.isPending}
      />
    </div>
  )
}
