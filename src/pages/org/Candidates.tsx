import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, UserPlus, Users, Trash2, Folder, ChevronDown, Upload, GitBranch } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { CircularProgress } from '@/components/shared/CircularProgress'
import { PipelineTag } from '@/components/shared/PipelineTag'
import { Card, Button, Input, SearchableSelect, Modal, ConfirmModal, Spinner, Pagination } from '@/components/ui'
import { BulkImportModal, type ImportField } from '@/components/shared/BulkImportModal'
import { candidateService } from '@/services/candidate.service'
import { jobService } from '@/services/job.service'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStatusColor, getLabelColor, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { notify } from '@/store/notifications.store'
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

const CANDIDATE_IMPORT_FIELDS: ImportField[] = [
  { key: 'name', label: 'Full Name', required: true, aliases: ['name', 'candidate', 'candidate name'], example: 'Jane Doe' },
  { key: 'email', label: 'Email', aliases: ['e-mail', 'mail'], example: 'jane@email.com' },
  { key: 'phone', label: 'Phone', aliases: ['mobile', 'contact', 'phone number'], example: '+1 555 000 0000' },
  { key: 'appliedJobTitle', label: 'Applied Job Title', aliases: ['job', 'position', 'role', 'applied job'], example: 'Senior Software Engineer' },
]

export function CandidatesPage() {
  const { user } = useAuthStore()
  const orgId = user?.organizationId ?? 'org1'
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  // Preset filters when navigated from the Jobs page (e.g. "view shortlisted")
  const navState = (useLocation().state ?? {}) as { jobId?: string; status?: string }
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(navState.status ?? 'all')
  const [jobFilter, setJobFilter] = useState(navState.jobId ?? 'all')
  const [labelFilter, setLabelFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

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

  async function importCandidates(rows: Record<string, string>[]): Promise<number> {
    const payload = rows.map(r => {
      // Link to an existing job by matching the title (case-insensitive).
      const match = r.appliedJobTitle
        ? jobs.find(j => j.title.trim().toLowerCase() === r.appliedJobTitle.trim().toLowerCase())
        : undefined
      return {
        name: r.name,
        email: r.email || '',
        phone: r.phone || '',
        appliedJobId: match?.id,
        appliedJobTitle: match?.title ?? (r.appliedJobTitle || undefined),
        organizationName: user?.organizationName,
      }
    })
    const count = await candidateService.bulkCreate(orgId, payload)
    notify('candidate', 'Candidates imported', `${count} candidate${count === 1 ? '' : 's'} added`)
    queryClient.invalidateQueries({ queryKey: ['candidates'] })
    return count
  }

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="Manage and review all candidates"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<GitBranch className="w-4 h-4" />} onClick={() => navigate('/org/pipeline')}>
              Pipeline
            </Button>
            <Button variant="secondary" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setImportOpen(true)}>
              Import
            </Button>
            <Button leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
              Add Candidate
            </Button>
          </div>
        }
      />

      <Card padding="none">
        <div className="p-4 border-b border-slate-100 dark:border-transparent flex flex-col sm:flex-row flex-wrap gap-3">
          <Input placeholder="Search candidates…" leftIcon={<Search className="w-4 h-4" />}
            className="max-w-xs" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          <SearchableSelect options={jobOptions} className="sm:w-52" value={jobFilter} onChange={v => { setJobFilter(v); setPage(1) }} />
          <SearchableSelect options={LABEL_FILTER_OPTIONS} className="sm:w-44" value={labelFilter} onChange={v => { setLabelFilter(v); setPage(1) }} />
          <SearchableSelect options={STATUS_OPTIONS} className="sm:w-40" value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (data?.data.length ?? 0) === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No candidates found
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {Object.entries(
              (data?.data ?? []).slice((page - 1) * perPage, page * perPage).reduce<Record<string, Candidate[]>>((acc, c) => {
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors text-left"
                    >
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/15 ring-1 ring-inset ring-violet-200/60 dark:ring-violet-400/20 flex items-center justify-center shrink-0">
                        <Folder className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{jobTitle}</span>
                      <span className="ml-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/15 rounded-full px-2 py-0.5 shrink-0">{list.length}</span>
                    </button>

                    {/* Candidates in this folder */}
                    {!isCollapsed && list.map(c => (
                      <div
                        key={c.id}
                        onClick={() => navigate('/org/evaluations', { state: { candidateId: c.id, candidateName: c.name } })}
                        title="View evaluation"
                        className="flex items-center gap-4 px-5 py-4 pl-12 border-t border-slate-100 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group cursor-pointer"
                      >
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
                            <PipelineTag stage={c.pipelineStage} />
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
                          onClick={e => { e.stopPropagation(); setDeleteTarget(c) }}
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

        {!isLoading && (data?.data.length ?? 0) > 0 && (
          <Pagination
            page={page} perPage={perPage} total={data?.data.length ?? 0}
            onPageChange={setPage}
            onPerPageChange={p => { setPerPage(p); setPage(1) }}
          />
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
          <SearchableSelect
            label="Job Title"
            options={jobPickOptions}
            value={pickedJobId}
            onChange={setPickedJobId}
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

      <BulkImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title="Bulk Import Candidates"
        entityLabel="candidates"
        fields={CANDIDATE_IMPORT_FIELDS}
        templateBaseName="candidates-template"
        onImport={importCandidates}
      />

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
