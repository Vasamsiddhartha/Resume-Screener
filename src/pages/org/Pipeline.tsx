import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, ArrowRight, ArrowLeft, FileText, RotateCcw, ThumbsUp, ThumbsDown, Trophy, SkipForward, Upload } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { CircularProgress } from '@/components/shared/CircularProgress'
import { Button, Modal, Textarea, Spinner } from '@/components/ui'
import { candidateService } from '@/services/candidate.service'
import { jobService } from '@/services/job.service'
import { atsService } from '@/services/ats.service'
import { useAuthStore } from '@/store/auth.store'
import { notify } from '@/store/notifications.store'
import { getLabelColor, cn } from '@/lib/utils'
import type { Candidate, CandidateStatus, Job, ATSResponsePayload, ATSLabel } from '@/types'

type ColKey = 'candidates' | 'evaluated' | 'shortlisted' | 'hired'

const COLUMNS: { key: ColKey; title: string; status: CandidateStatus; accent: string }[] = [
  { key: 'candidates', title: 'Candidates', status: 'new', accent: 'bg-blue-500' },
  { key: 'evaluated', title: 'Evaluated', status: 'reviewing', accent: 'bg-violet-500' },
  { key: 'shortlisted', title: 'Shortlisted', status: 'shortlisted', accent: 'bg-emerald-500' },
  { key: 'hired', title: 'Hired', status: 'hired', accent: 'bg-amber-500' },
]

export function PipelinePage() {
  const { user } = useAuthStore()
  const orgId = user?.organizationId ?? 'org1'
  const queryClient = useQueryClient()
  const [evaluateTarget, setEvaluateTarget] = useState<Candidate | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', orgId, 'pipeline'],
    queryFn: () => candidateService.getAll(orgId, { perPage: 200 }),
  })
  const candidates = data?.data ?? []

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CandidateStatus }) =>
      candidateService.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidates'] }),
  })

  function byColumn(key: ColKey) {
    const status = COLUMNS.find(c => c.key === key)!.status
    return candidates.filter(c => c.status === status)
  }

  function handleDrop(colKey: ColKey) {
    const id = dragId
    setDragId(null)
    if (!id) return
    const c = candidates.find(x => x.id === id)
    if (!c) return

    // Dropping an un-evaluated candidate into "Evaluated" opens the evaluation flow
    if (colKey === 'evaluated' && c.status === 'new') {
      setEvaluateTarget(c)
      return
    }
    const target = COLUMNS.find(col => col.key === colKey)!.status
    if (target !== c.status) statusMutation.mutate({ id, status: target })
  }

  return (
    <div>
      <PageHeader
        title="Hiring Pipeline"
        description="Drag candidates across stages. Drop into Evaluated to run an ATS evaluation."
      />

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const items = byColumn(col.key)
            return (
              <div
                key={col.key}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col.key)}
                className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.06] rounded-xl flex flex-col min-h-[200px]"
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/[0.06]">
                  <span className={cn('w-2 h-2 rounded-full', col.accent)} />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{col.title}</h3>
                  <span className="ml-auto text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>

                <div className="p-3 space-y-2 flex-1">
                  {items.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                      {col.key === 'candidates' ? 'No candidates yet' : 'Drag candidates here'}
                    </p>
                  )}
                  {items.map(c => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn(
                        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.06] rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-sm',
                        dragId === c.id && 'opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        {c.latestScore != null ? (
                          <CircularProgress score={c.latestScore} size="sm" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
                          {c.appliedJobTitle && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{c.appliedJobTitle}</p>
                          )}
                        </div>
                      </div>
                      {c.latestLabel && (
                        <div className="mt-2">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getLabelColor(c.latestLabel as ATSLabel)}`}>
                            {c.latestLabel}
                          </span>
                        </div>
                      )}
                      {col.key === 'candidates' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 h-7"
                          onClick={() => setEvaluateTarget(c)}
                        >
                          Evaluate
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
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
