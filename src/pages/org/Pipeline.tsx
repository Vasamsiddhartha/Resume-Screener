import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, ArrowRight, ArrowLeft, FileText, RotateCcw, ThumbsUp, ThumbsDown, Trophy, SkipForward, Upload, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { CircularProgress } from '@/components/shared/CircularProgress'
import { Button, Modal, Textarea, Spinner, Input } from '@/components/ui'
import { candidateService } from '@/services/candidate.service'
import { jobService } from '@/services/job.service'
import { atsService } from '@/services/ats.service'
import { pipelineService } from '@/services/pipeline.service'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { notify } from '@/store/notifications.store'
import { getLabelColor, getStatusColor, formatDate, cn } from '@/lib/utils'
import { PipelineTag } from '@/components/shared/PipelineTag'
import type { Candidate, CandidateStatus, Job, ATSResponsePayload, ATSLabel } from '@/types'

// Built-in funnel columns (status-driven). Custom stages are appended after these.
type Col =
  | { key: string; title: string; kind: 'status'; status: CandidateStatus; accent: string }
  | { key: string; title: string; kind: 'stage'; stageId: string; accent: string }

const DEFAULT_COLS: Col[] = [
  { key: 'candidates', title: 'Candidates', kind: 'status', status: 'new', accent: 'bg-blue-500' },
  { key: 'evaluated', title: 'Evaluated', kind: 'status', status: 'reviewing', accent: 'bg-violet-500' },
  { key: 'shortlisted', title: 'Shortlisted', kind: 'status', status: 'shortlisted', accent: 'bg-emerald-500' },
  { key: 'hired', title: 'Hired', kind: 'status', status: 'hired', accent: 'bg-amber-500' },
]

// Candidates shown per column before paginating.
const PER_COL = 6

export function PipelinePage() {
  const { user } = useAuthStore()
  const orgId = user?.organizationId ?? 'org1'
  const queryClient = useQueryClient()
  const [evaluateTarget, setEvaluateTarget] = useState<Candidate | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [newStage, setNewStage] = useState('')
  const [addingOpen, setAddingOpen] = useState(false)
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null)
  const [pageByCol, setPageByCol] = useState<Record<string, number>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollVel = useRef(0)        // px per frame; sign = direction, 0 = idle
  const rafId = useRef<number | null>(null)

  // Continuous auto-scroll: dragover only sets the velocity; a rAF loop does the
  // actual scrolling every frame so it's smooth and fast even when the cursor is
  // held still near the edge (not tied to dragover event frequency).
  function tickAutoScroll() {
    const el = scrollRef.current
    if (el && scrollVel.current !== 0) {
      el.scrollLeft += scrollVel.current
      rafId.current = requestAnimationFrame(tickAutoScroll)
    } else {
      rafId.current = null
    }
  }
  function stopAutoScroll() {
    scrollVel.current = 0
    if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null }
  }
  function handleBoardDragOver(e: React.DragEvent) {
    e.preventDefault()
    const el = scrollRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const edge = 120     // edge zone width
    const maxSpeed = 32  // px per frame at the very edge (~1900px/s @ 60fps)
    const x = e.clientX
    if (x < rect.left + edge) {
      scrollVel.current = -Math.ceil(((rect.left + edge - x) / edge) * maxSpeed)
    } else if (x > rect.right - edge) {
      scrollVel.current = Math.ceil(((x - (rect.right - edge)) / edge) * maxSpeed)
    } else {
      scrollVel.current = 0
    }
    if (scrollVel.current !== 0 && rafId.current == null) tickAutoScroll()
  }
  // Stop any running loop on unmount.
  useEffect(() => () => stopAutoScroll(), [])

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', orgId, 'pipeline'],
    queryFn: () => candidateService.getAll(orgId, { perPage: 200 }),
  })
  const candidates = data?.data ?? []

  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages', orgId],
    queryFn: () => pipelineService.getStages(orgId),
  })
  const stageNames = new Set(stages.map(s => s.name))
  const columns: Col[] = [
    ...DEFAULT_COLS,
    ...stages.map(s => ({ key: `stage:${s.id}`, title: s.name, kind: 'stage' as const, stageId: s.id, accent: 'bg-slate-400' })),
  ]

  // Real-time: refetch when candidates or stages change in this org (other tabs/users).
  useEffect(() => {
    const sb = supabase
    if (!sb) return
    const ch = sb
      .channel(`pipeline-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates', filter: `organization_id=eq.${orgId}` },
        () => queryClient.invalidateQueries({ queryKey: ['candidates'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_stages', filter: `organization_id=eq.${orgId}` },
        () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages', orgId] }))
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [orgId, queryClient])

  const moveMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Candidate> }) => candidateService.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidates'] }),
  })

  const addStageMutation = useMutation({
    mutationFn: (name: string) => pipelineService.createStage(orgId, name, stages.length),
    onSuccess: (s) => { notify('info', 'Stage added', s.name); setNewStage(''); setAddingOpen(false); queryClient.invalidateQueries({ queryKey: ['pipeline-stages', orgId] }) },
    onError: (e) => notify('info', 'Could not add stage', e instanceof Error ? e.message : 'Run migration 0010?'),
  })

  const deleteStageMutation = useMutation({
    mutationFn: (id: string) => pipelineService.deleteStage(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages', orgId] }),
  })

  function itemsFor(col: Col): Candidate[] {
    if (col.kind === 'stage') return candidates.filter(c => c.pipelineStage === col.title)
    // status column: matching status AND not parked in a custom stage
    return candidates.filter(c => c.status === col.status && !(c.pipelineStage && stageNames.has(c.pipelineStage)))
  }

  function handleDrop(col: Col) {
    stopAutoScroll()
    const id = dragId
    setDragId(null)
    if (!id) return
    const c = candidates.find(x => x.id === id)
    if (!c) return

    if (col.kind === 'stage') {
      if (c.pipelineStage !== col.title) moveMutation.mutate({ id, patch: { pipelineStage: col.title } })
      return
    }
    // Dropping an un-evaluated candidate into "Evaluated" opens the evaluation flow
    if (col.key === 'evaluated' && c.status === 'new') { setEvaluateTarget(c); return }
    // Move to a built-in status column → set status and clear any custom stage
    if (c.status !== col.status || c.pipelineStage) {
      moveMutation.mutate({ id, patch: { status: col.status, pipelineStage: '' } })
    }
  }

  return (
    <div>
      <PageHeader
        title="Hiring Pipeline"
        description="Drag candidates across stages. Drop into Evaluated to run an ATS evaluation."
        action={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddingOpen(true)}>Add Stage</Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      ) : (
        <div ref={scrollRef} onDragOver={handleBoardDragOver} className="flex gap-4 overflow-x-auto pb-4 items-start">
          {columns.map(col => {
            const items = itemsFor(col)
            const totalPages = Math.max(1, Math.ceil(items.length / PER_COL))
            const page = Math.min(pageByCol[col.key] ?? 1, totalPages)
            const pageItems = items.slice((page - 1) * PER_COL, page * PER_COL)
            return (
              <div
                key={col.key}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col)}
                className="w-64 shrink-0 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-transparent rounded-xl flex flex-col min-h-[200px]"
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-transparent">
                  <span className={cn('w-2 h-2 rounded-full', col.accent)} />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{col.title}</h3>
                  <span className="ml-auto text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                  {col.kind === 'stage' && (
                    <button
                      onClick={() => deleteStageMutation.mutate(col.stageId)}
                      title="Delete stage"
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-2.5 space-y-1.5 flex-1">
                  {items.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                      {col.key === 'candidates' ? 'No candidates yet' : 'Drag candidates here'}
                    </p>
                  )}
                  {pageItems.map(c => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => { setDragId(null); stopAutoScroll() }}
                      onClick={() => setDetailCandidate(c)}
                      title="View candidate details"
                      className={cn(
                        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-transparent rounded-lg p-2 cursor-pointer transition-shadow hover:shadow-sm',
                        dragId === c.id && 'opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {c.latestScore != null ? (
                          <CircularProgress score={c.latestScore} size="xs" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
                          {c.appliedJobTitle && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{c.appliedJobTitle}</p>
                          )}
                        </div>
                        {c.latestLabel && (
                          <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${getLabelColor(c.latestLabel as ATSLabel)}`}>
                            {c.latestLabel}
                          </span>
                        )}
                      </div>
                      {col.key === 'candidates' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-1.5 h-6 text-xs"
                          onClick={e => { e.stopPropagation(); setEvaluateTarget(c) }}
                        >
                          Evaluate
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {items.length > PER_COL && (
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-t border-slate-200 dark:border-transparent">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPageByCol(s => ({ ...s, [col.key]: page - 1 }))}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Page {page} / {totalPages}</span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPageByCol(s => ({ ...s, [col.key]: page + 1 }))}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {evaluateTarget && (
        <EvaluateModal
          candidate={evaluateTarget}
          orgId={orgId}
          onClose={() => setEvaluateTarget(null)}
          onDone={() => {
            setEvaluateTarget(null)
            queryClient.invalidateQueries({ queryKey: ['candidates'] })
            queryClient.invalidateQueries({ queryKey: ['evaluations'] })
          }}
        />
      )}

      {/* Add Stage popup */}
      <Modal
        isOpen={addingOpen}
        onClose={() => { setAddingOpen(false); setNewStage('') }}
        title="Add Pipeline Stage"
        description="Create a new column for your hiring pipeline."
        size="sm"
        footer={
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => { setAddingOpen(false); setNewStage('') }}>Cancel</Button>
            <Button isLoading={addStageMutation.isPending} disabled={!newStage.trim()} onClick={() => addStageMutation.mutate(newStage.trim())}>
              Add Stage
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <Input
            autoFocus
            label="Stage name"
            placeholder="e.g. Interview, Rejected, Offer"
            value={newStage}
            onChange={e => setNewStage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newStage.trim()) addStageMutation.mutate(newStage.trim()) }}
          />
          {addStageMutation.error && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {addStageMutation.error instanceof Error ? addStageMutation.error.message : 'Could not add stage'}
            </p>
          )}
        </div>
      </Modal>

      {/* Candidate details popup */}
      <Modal
        isOpen={!!detailCandidate}
        onClose={() => setDetailCandidate(null)}
        title="Candidate Details"
        size="md"
      >
        {detailCandidate && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {detailCandidate.latestScore != null ? (
                <CircularProgress score={detailCandidate.latestScore} size="md" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-500 shrink-0">
                  {detailCandidate.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{detailCandidate.name}</p>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${getStatusColor(detailCandidate.status)}`}>{detailCandidate.status}</span>
                  {detailCandidate.latestLabel && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getLabelColor(detailCandidate.latestLabel as ATSLabel)}`}>{detailCandidate.latestLabel}</span>
                  )}
                  <PipelineTag stage={detailCandidate.pipelineStage} />
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Email" value={detailCandidate.email} />
              <DetailRow label="Phone" value={detailCandidate.phone} />
              <DetailRow label="Applied Job" value={detailCandidate.appliedJobTitle} />
              <DetailRow label="Latest Score" value={detailCandidate.latestScore != null ? String(detailCandidate.latestScore) : undefined} />
              <DetailRow label="Pipeline Stage" value={detailCandidate.pipelineStage} />
              <DetailRow label="Added" value={detailCandidate.createdAt ? formatDate(detailCandidate.createdAt) : undefined} />
            </dl>

            {detailCandidate.resumeText && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Resume</p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {detailCandidate.resumeText}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              {detailCandidate.status === 'new' && (
                <Button variant="secondary" onClick={() => { const c = detailCandidate; setDetailCandidate(null); setEvaluateTarget(c) }}>
                  Evaluate
                </Button>
              )}
              <Button onClick={() => setDetailCandidate(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="text-slate-800 dark:text-slate-200 break-words">{value || '—'}</dd>
    </div>
  )
}

// ─── Inline evaluation flow: Resume → Job → Review → Score → Decision ─────────

type Step = 'resume' | 'job' | 'review' | 'result'

function EvaluateModal({ candidate, orgId, onClose, onDone }: {
  candidate: Candidate
  orgId: string
  onClose: () => void
  onDone: () => void
}) {
  const { user } = useAuthStore()
  const [step, setStep] = useState<Step>('resume')
  const [resumeText, setResumeText] = useState(candidate.resumeText ?? '')
  const [selectedJobId, setSelectedJobId] = useState(candidate.appliedJobId ?? '')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [result, setResult] = useState<ATSResponsePayload | null>(null)
  const [error, setError] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', orgId, 'pipeline-active'],
    queryFn: () => jobService.getAll(orgId, { status: 'active', perPage: 100 }),
  })
  const jobs: Job[] = jobsData?.data ?? []
  const selectedJob = jobs.find(j => j.id === selectedJobId)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeFile(file)
    setExtracting(true)
    try {
      const { extractResumeText } = await import('@/lib/extractText')
      setResumeText(await extractResumeText(file))
    } finally {
      setExtracting(false)
    }
  }

  async function runEvaluation() {
    if (!selectedJob || !resumeText.trim()) return
    setIsEvaluating(true)
    setError('')
    setStep('result')
    try {
      const response = await atsService.evaluate({ resume_text: resumeText, job_description: selectedJob.description })
      setResult(response)
      try {
        await atsService.saveEvaluation(orgId, {
          organizationId: orgId,
          organizationName: user?.organizationName,
          candidateId: candidate.id,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          jobId: selectedJob.id,
          jobTitle: selectedJob.title,
          resumeText,
          score: response.score,
          label: response.label,
          evaluatedBy: user?.name ?? 'Recruiter',
        })
        // Store the uploaded resume file in the org's bucket (if one was uploaded)
        let resumePath: string | undefined
        if (resumeFile) {
          try {
            const { storageService } = await import('@/services/storage.service')
            if (storageService.isEnabled()) resumePath = await storageService.uploadResume(orgId, candidate.id, resumeFile)
          } catch (upErr) {
            console.warn('[Pipeline] resume upload failed:', upErr)
          }
        }

        // Evaluated → leaves the Candidates column
        await candidateService.update(candidate.id, {
          status: 'reviewing',
          latestScore: response.score,
          latestLabel: response.label,
          appliedJobId: selectedJob.id,
          appliedJobTitle: selectedJob.title,
          resumeText,
          ...(resumePath ? { resumeUrl: resumePath } : {}),
        })
        notify('evaluation', 'Evaluation completed', `${candidate.name} — ${response.label} (${response.score.toFixed(1)})`)
      } catch (saveErr) {
        console.warn('[Pipeline] save failed:', saveErr)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    } finally {
      setIsEvaluating(false)
    }
  }

  const decisionMutation = useMutation({
    mutationFn: (status: CandidateStatus) => candidateService.update(candidate.id, { status }),
    onSuccess: onDone,
  })

  return (
    <Modal isOpen onClose={onClose} title={`Evaluate — ${candidate.name}`} size="lg">
      {/* Resume */}
      {step === 'resume' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {candidate.resumeText ? 'Using the resume on file — edit or replace below.' : 'Upload or paste the resume.'}
          </p>
          <label className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{extracting ? 'Extracting…' : 'Upload PDF / DOCX / TXT'}</span>
            <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={onFile} />
          </label>
          <Textarea rows={10} value={resumeText} onChange={e => setResumeText(e.target.value)} className="font-mono text-xs" placeholder="Resume text…" />
          <div className="flex justify-end">
            <Button rightIcon={<ArrowRight className="w-4 h-4" />} disabled={!resumeText.trim()} onClick={() => setStep('job')}>Continue</Button>
          </div>
        </div>
      )}

      {/* Job */}
      {step === 'job' && (
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No active jobs. Create one first.</p>
          ) : jobs.map(job => (
            <button
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className={cn('w-full text-left p-3 rounded-xl border-2 transition-all',
                selectedJobId === job.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300')}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{job.title}</p>
              {job.jobType && <p className="text-xs text-slate-500 dark:text-slate-400">{job.jobType}</p>}
            </button>
          ))}
          <div className="flex justify-between pt-2">
            <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => setStep('resume')}>Back</Button>
            <Button rightIcon={<ArrowRight className="w-4 h-4" />} disabled={!selectedJobId} onClick={() => setStep('review')}>Continue</Button>
          </div>
        </div>
      )}

      {/* Review */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-700 dark:text-slate-300">{resumeText.trim().split(/\s+/).length} words · vs <strong>{selectedJob?.title}</strong></span>
          </div>
          <div className="flex justify-between">
            <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => setStep('job')}>Back</Button>
            <Button onClick={runEvaluation}>Run Evaluation</Button>
          </div>
        </div>
      )}

      {/* Result + decision */}
      {step === 'result' && (
        <div className="space-y-5">
          {isEvaluating ? (
            <div className="text-center py-10">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Scoring…</p>
            </div>
          ) : result ? (
            <>
              <div className="flex flex-col items-center py-2">
                <CircularProgress score={result.score} label={result.label} size="lg" />
                <span className={`mt-3 text-sm font-semibold px-3 py-1 rounded-full ${getLabelColor(result.label)}`}>{result.label}</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-3">Move {candidate.name} to (optional):</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" leftIcon={<ThumbsUp className="w-4 h-4" />} isLoading={decisionMutation.isPending} onClick={() => decisionMutation.mutate('shortlisted')}>Shortlist</Button>
                  <Button variant="outline" leftIcon={<Trophy className="w-4 h-4" />} isLoading={decisionMutation.isPending} onClick={() => decisionMutation.mutate('hired')}>Hire</Button>
                  <Button variant="outline" leftIcon={<ThumbsDown className="w-4 h-4" />} isLoading={decisionMutation.isPending} onClick={() => decisionMutation.mutate('rejected')}>Reject</Button>
                  <Button variant="ghost" leftIcon={<SkipForward className="w-4 h-4" />} onClick={onDone}>Skip</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-red-500 break-all mb-4">{error || 'Evaluation failed'}</p>
              <Button variant="secondary" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={() => setStep('review')}>Try Again</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
