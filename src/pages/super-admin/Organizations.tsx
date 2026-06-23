import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, MoreHorizontal, Ban, Trash2, CheckCircle, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button, Input, Select, Modal, ConfirmModal, Card, Badge, Spinner } from '@/components/ui'
import { organizationService } from '@/services/organization.service'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'
import type { Organization } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']),
})

type FormData = z.infer<typeof schema>

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter — $49/mo' },
  { value: 'professional', label: 'Professional — $149/mo' },
  { value: 'enterprise', label: 'Enterprise — $499/mo' },
]

const STATUS_EDIT_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
]

const editSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']),
  status: z.enum(['active', 'suspended', 'inactive']),
})
type EditFormData = z.infer<typeof editSchema>

export function OrganizationsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const [editTarget, setEditTarget] = useState<Organization | null>(null)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['organizations', search, statusFilter, page],
    queryFn: () => organizationService.getAll({ search, status: statusFilter, page }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: FormData) => organizationService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setCreateOpen(false)
      reset()
    },
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => organizationService.suspend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => organizationService.activate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => organizationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setDeleteTarget(null)
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'starter' },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EditFormData }) => organizationService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setEditTarget(null)
    },
  })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditFormData>({ resolver: zodResolver(editSchema) })

  function openEdit(org: Organization) {
    resetEdit({ name: org.name, email: org.email, plan: org.plan, status: org.status })
    setEditTarget(org)
    setActionMenu(null)
  }

  const planBadgeVariant: Record<string, 'default' | 'info' | 'purple' | 'warning'> = {
    free: 'default',
    starter: 'info',
    professional: 'purple',
    enterprise: 'warning',
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Manage all organizations on the platform"
        action={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            New Organization
          </Button>
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search organizations…"
            leftIcon={<Search className="w-4 h-4" />}
            className="max-w-xs"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <Select
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            className="w-40"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {data?.data.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                No organizations found
              </div>
            ) : (
              data?.data.map(org => (
                <div key={org.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {org.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{org.name}</p>
                      <Badge
                        variant={org.status === 'active' ? 'success' : org.status === 'suspended' ? 'danger' : 'default'}
                      >
                        {org.status}
                      </Badge>
                      <Badge variant={planBadgeVariant[org.plan] ?? 'default'} className="capitalize">
                        {org.plan}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{org.email}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-6 text-sm shrink-0">
                    <div className="text-center">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{org.memberCount}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Members</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{org.jobCount}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Jobs</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{org.evaluationCount}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Evaluations</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0 hidden lg:block">
                    {formatDate(org.createdAt)}
                  </p>
                  <div className="relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === org.id ? null : org.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {actionMenu === org.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-20">
                        <button
                          onClick={() => openEdit(org)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Pencil className="w-4 h-4" /> Edit details
                        </button>
                        {org.status === 'active' ? (
                          <button
                            onClick={() => { suspendMutation.mutate(org.id); setActionMenu(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          >
                            <Ban className="w-4 h-4" /> Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => { activateMutation.mutate(org.id); setActionMenu(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          >
                            <CheckCircle className="w-4 h-4" /> Activate
                          </button>
                        )}
                        <button
                          onClick={() => { setDeleteTarget(org); setActionMenu(null) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {data && data.total > 10 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400">
            <span>Showing {data.data.length} of {data.total}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="ghost" size="sm" disabled={data.data.length < 10} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); reset() }}
        title="Create Organization"
        description="Add a new organization to the platform"
        footer={
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); reset() }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(d => createMutation.mutate(d))}
              isLoading={createMutation.isPending}
            >
              Create
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Organization Name" placeholder="Acme Corp" error={errors.name?.message} {...register('name')} />
          <Input label="Admin Email" type="email" placeholder="admin@acme.com" error={errors.email?.message} {...register('email')} />
          <Select label="Subscription Plan" options={PLAN_OPTIONS} error={errors.plan?.message} {...register('plan')} />
        </div>
      </Modal>

      {/* Edit Modal — full management of details, subscription, and status */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Manage Organization"
        description={editTarget ? `Update details and subscription for ${editTarget.name}` : ''}
        footer={
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              onClick={handleSubmitEdit(d => editTarget && editMutation.mutate({ id: editTarget.id, payload: d }))}
              isLoading={editMutation.isPending}
            >
              Save changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Organization Name" error={editErrors.name?.message} {...registerEdit('name')} />
          <Input label="Admin Email" type="email" error={editErrors.email?.message} {...registerEdit('email')} />
          <Select label="Subscription Plan" options={PLAN_OPTIONS} error={editErrors.plan?.message} {...registerEdit('plan')} />
          <Select label="Status" options={STATUS_EDIT_OPTIONS} error={editErrors.status?.message} {...registerEdit('status')} />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Organization"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
