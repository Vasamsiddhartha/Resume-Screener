import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, UserPlus, Users, Trash2, Folder, ChevronDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { CircularProgress } from '@/components/shared/CircularProgress'
import { Card, Button, Input, Select, Modal, ConfirmModal, Spinner } from '@/components/ui'
import { candidateService } from '@/services/candidate.service'
import { jobService } from '@/services/job.service'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStatusColor, getLabelColor, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { LABEL_FILTER_OPTIONS, buildJobFilterOptions } from '@/lib/filters'
import type { Candidate, ATSLabel } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(6, 'Required'),
})
type FormData = z.infer<typeof schema>

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' },
]

export function CandidatesPage() {
  const { user } = useAuthStore()
  const orgId = user?.organizationId ?? 'org1'
  const queryClient = useQueryClient()
  // Preset filters when navigated from the Jobs page (e.g. "view shortlisted")
  const navState = (useLocation().state ?? {}) as { jobId?: string; status?: string }
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(navState.status ?? 'all')
  const [jobFilter, setJobFilter] = useState(navState.jobId ?? 'all')
  const [labelFilter, setLabelFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', orgId, search, statusFilter, jobFilter, labelFilter],
    queryFn: () => candidateService.getAll(orgId, { search, status: statusFilter, jobId: jobFilter, label: labelFilter, perPage: 100 }),
  })

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', orgId, 'filter-options'],
    queryFn: () => jobService.getAll(orgId, { perPage: 100 }),
  })

  const jobOptions = buildJobFilterOptions(jobsData?.data ?? [])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const [pickedJobId, setPickedJobId] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)

  const jobs = jobsData?.data ?? []
  const jobPickOptions = [{ value: '', label: 'No job (optional)' }, ...jobs.map(j => ({ value: j.id, label: j.title }))]

  function resetCreateForm() {
    reset(); setPickedJobId(''); setCvFile(null)
  }

  const createMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const job = jobs.find(j => j.id === pickedJobId)
      // 1) Create the candidate
      const candidate = await candidateService.create(orgId, {
        ...payload,
        appliedJobId: job?.id,
        appliedJobTitle: job?.title,
        organizationName: user?.organizationName,
      })

      // 2) If a CV was attached, extract its text + upload it to the org's bucket
      if (cvFile) {
        const { storageService } = await import('@/services/storage.service')
        const { extractResumeText } = await import('@/lib/extractText')
        const resumeText = await extractResumeText(cvFile)
        let resumePath: string | undefined
        if (storageService.isEnabled()) {
          try { resumePath = await storageService.uploadResume(orgId, candidate.id, cvFile) }
          catch (e) { console.warn('[Candidate CV] upload failed:', e) }
        }
        if (resumeText || resumePath) {
          await candidateService.update(candidate.id, {
            resumeText: resumeText || undefined,
            resumeUrl: resumePath,
          })
        }
      }
      return candidate
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['candidates'] }); setCreateOpen(false); resetCreateForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => candidateService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['candidates'] }); setDeleteTarget(null) },
  })

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="Manage and review all candidates"
        action={
          <Button leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            Add Candidate
          </Button>
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row flex-wrap gap-3">
          <Input placeholder="Search candidates…" leftIcon={<Search className="w-4 h-4" />}
            className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
          <Select options={jobOptions} className="sm:w-52" value={jobFilter}
            onChange={e => setJobFilter(e.target.value)} />
          <Select options={LABEL_FILTER_OPTIONS} className="sm:w-44" value={labelFilter}
            onChange={e => setLabelFilter(e.target.value)} />
          <Select options={STATUS_OPTIONS} className="sm:w-40" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (data?.data.length ?? 0) === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No candidates found
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {Object.entries(
              (data?.data ?? []).reduce<Record<string, Candidate[]>>((acc, c) => {
                const key = c.appliedJobTitle?.trim() || 'No Job Title'
                ;(acc[key] ||= []).push(c)
                return acc
              }, {})
            )
              .sort((a, b) => (a[0] === 'No Job Title' ? 1 : b[0] === 'No Job Title' ? -1 : a[0].localeCompare(b[0])))
              .map(([jobTitle, list]) => {
                const isCollapsed = collapsed[jobTitle]
                return (
                  <div key={jobTitle}>
                    {/* Folder header */}
                    <button
                      onClick={() => setCollapsed(s => ({ ...s, [jobTitle]: !s[jobTitle] }))}
                      className="w-full flex items-center gap-3 px-5 py-3 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <Folder className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{jobTitle}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-700/70 rounded-full px-2 py-0.5">{list.length}</span>
                    </button>

                    {/* Candidates in this folder */}
                    {!isCollapsed && list.map(c => (
                      <div key={c.id} className="flex items-center gap-4 px-5 py-4 pl-12 border-t border-slate-100 dark:border-white/[0.06]/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                        {c.latestScore !== undefined ? (
                          <CircularProgress score={c.latestScore} size="sm" />
                        ) : (
                          <div className="w-20 h-20 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <span className="text-xs text-slate-400">N/A</span>
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${getStatusColor(c.status)}`}>{c.status}</span>
                            {c.latestLabel && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getLabelColor(c.latestLabel as ATSLabel)}`}>{c.latestLabel}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>{c.email}</span>
                            {c.phone && <><span>·</span><span>{c.phone}</span></>}
                          </div>
                        </div>
                        <div className="hidden md:block text-right shrink-0">
                          <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(c.createdAt)}</p>
                        </div>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
          </div>
        )}
      </Card>

      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); resetCreateForm() }}
        title="Add Candidate"
        footer={
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); resetCreateForm() }}>Cancel</Button>
            <Button isLoading={createMutation.isPending} onClick={handleSubmit(d => createMutation.mutate(d))}>
              Add
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" placeholder="Jane Doe" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" placeholder="jane@email.com" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" type="tel" placeholder="+1 555 000 0000" error={errors.phone?.message} {...register('phone')} />
          <Select
            label="Job Title"
            options={jobPickOptions}
            value={pickedJobId}
            onChange={e => setPickedJobId(e.target.value)}
          />
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              Resume / CV / Cover letter
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={e => setCvFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-50 file:text-violet-700 dark:file:bg-violet-900/30 dark:file:text-violet-400 hover:file:bg-violet-100 dark:hover:file:bg-violet-900/50 cursor-pointer"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              PDF, DOCX, or TXT — stored securely in your organization's bucket
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Remove Candidate"
        description={`Remove "${deleteTarget?.name}" from the system? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
