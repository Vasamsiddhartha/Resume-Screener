import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Briefcase, Archive, Trash2, Pencil, MoreHorizontal, Star } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, Button, Input, Select, Modal, ConfirmModal, Badge, Spinner, Textarea } from '@/components/ui'
import { jobService } from '@/services/job.service'
import { candidateService } from '@/services/candidate.service'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import type { Job } from '@/types'

const schema = z.object({
  title: z.string().min(2, 'Required'),
  department: z.string().min(1, 'Required'),
  location: z.string().min(1, 'Required'),
  experienceRequired: z.string().min(1, 'Required'),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'freelance', 'internship']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
})

type FormData = z.infer<typeof schema>

const EMP_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
]

export function JobsPage() {
  const { user } = useAuthStore()
  const orgId = user?.organizationId ?? 'org1'
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Job | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null)
  const [actionMenu, setActionMenu] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', orgId, search, statusFilter],
    queryFn: () => jobService.getAll(orgId, { search, status: statusFilter }),
  })

  // Shortlisted candidates per job → shown as a tag on each job (#5)
  const { data: candidatesData } = useQuery({
    queryKey: ['candidates', orgId, 'shortlist-counts'],
    queryFn: () => candidateService.getAll(orgId, { status: 'shortlisted', perPage: 100 }),
  })
  const shortlistedByJob = (candidatesData?.data ?? []).reduce<Record<string, number>>((acc, c) => {
    if (c.appliedJobId) acc[c.appliedJobId] = (acc[c.appliedJobId] ?? 0) + 1
    return acc
  }, {})

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { employmentType: 'full_time' },
  })

  const createMutation = useMutation({
    mutationFn: (payload: FormData) => jobService.create(orgId, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jobs'] }); setCreateOpen(false); reset() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Job> }) => jobService.update(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jobs'] }); setEditTarget(null); reset() },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => jobService.archive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jobs'] }); setDeleteTarget(null) },
  })

  function openEdit(job: Job) {
    setEditTarget(job)
    setValue('title', job.title)
    setValue('department', job.department)
    setValue('location', job.location)
    setValue('experienceRequired', job.experienceRequired)
    setValue('employmentType', job.employmentType)
    setValue('description', job.description)
    setActionMenu(null)
  }

  const statusVariant: Record<string, 'success' | 'default' | 'warning'> = {
    active: 'success',
    draft: 'default',
    archived: 'warning',
  }

  return (
    <div>
      <PageHeader
        title="Job Descriptions"
        description="Manage open positions for ATS evaluation"
        action={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setCreateOpen(true); reset() }}>
            New Job
          </Button>
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search jobs…"
            leftIcon={<Search className="w-4 h-4" />}
            className="max-w-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select options={STATUS_OPTIONS} className="w-40" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data?.data.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No jobs found</div>
            ) : (
              data?.data.map(job => (
                <div key={job.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors relative">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Briefcase className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{job.title}</p>
                      <Badge variant={statusVariant[job.status] ?? 'default'} className="capitalize">{job.status}</Badge>
                      {shortlistedByJob[job.id] > 0 && (
                        <button
                          onClick={() => navigate('/org/candidates', { state: { jobId: job.id, status: 'shortlisted' } })}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                          title="View shortlisted candidates"
                        >
                          <Star className="w-3 h-3" /> {shortlistedByJob[job.id]} shortlisted
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{job.department}</span>
                      <span>·</span>
                      <span>{job.location}</span>
                      <span>·</span>
                      <span>{job.experienceRequired}</span>
                      <span>·</span>
                      <span className="capitalize">{job.employmentType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4 text-sm shrink-0">
                    <div className="text-center">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{job.candidateCount}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Candidates</p>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(job.createdAt)}</p>
                  </div>
                  <div className="relative">
                    <button onClick={() => setActionMenu(actionMenu === job.id ? null : job.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {actionMenu === job.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-20">
                        <button onClick={() => openEdit(job)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        {job.status !== 'archived' && (
                          <button onClick={() => { archiveMutation.mutate(job.id); setActionMenu(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                            <Archive className="w-4 h-4" /> Archive
                          </button>
                        )}
                        <button onClick={() => { setDeleteTarget(job); setActionMenu(null) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
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
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={createOpen || !!editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null); reset() }}
        title={editTarget ? 'Edit Job' : 'Create Job'}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setEditTarget(null); reset() }}>Cancel</Button>
            <Button
              isLoading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit(d => editTarget
                ? updateMutation.mutate({ id: editTarget.id, payload: d })
                : createMutation.mutate(d)
              )}
            >
              {editTarget ? 'Save Changes' : 'Create Job'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Job Title" placeholder="e.g. Senior Engineer" error={errors.title?.message} {...register('title')} />
            <Input label="Department" placeholder="e.g. Engineering" error={errors.department?.message} {...register('department')} />
            <Input label="Location" placeholder="e.g. Remote" error={errors.location?.message} {...register('location')} />
            <Input label="Experience Required" placeholder="e.g. 3+ years" error={errors.experienceRequired?.message} {...register('experienceRequired')} />
          </div>
          <Select label="Employment Type" options={EMP_TYPE_OPTIONS} error={errors.employmentType?.message} {...register('employmentType')} />
          <Textarea label="Job Description" rows={8} placeholder="Describe responsibilities, requirements…" error={errors.description?.message} {...register('description')} />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Job"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
