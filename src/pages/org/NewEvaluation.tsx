import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, ArrowRight, ArrowLeft, CheckCircle, Loader2, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { CircularProgress } from '@/components/shared/CircularProgress'
import { Card, Button, Textarea, Input } from '@/components/ui'
import { atsService } from '@/services/ats.service'
import { jobService } from '@/services/job.service'
import { candidateService } from '@/services/candidate.service'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLabelColor } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'
import { mailService } from '@/services/mail.service'
import { evaluationEmail } from '@/lib/emailTemplates'
import { notify } from '@/store/notifications.store'
import { cn } from '@/lib/utils'
import type { ATSResponsePayload } from '@/types'

type Step = 'upload' | 'select-job' | 'review' | 'result'

const STEPS: { key: Step; label: string; num: number }[] = [
  { key: 'upload', label: 'Upload Resume', num: 1 },
  { key: 'select-job', label: 'Select Job', num: 2 },
  { key: 'review', label: 'Review & Submit', num: 3 },
  { key: 'result', label: 'ATS Score', num: 4 },
]

export function NewEvaluationPage() {
  const { user } = useAuthStore()
  const orgId = user?.organizationId ?? 'org1'
  const notifications = useSettingsStore(s => s.notifications)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('upload')
  const [resumeText, setResumeText] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [result, setResult] = useState<ATSResponsePayload | null>(null)
  const [evalError, setEvalError] = useState('')
  const [saveWarning, setSaveWarning] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', orgId, 'active'],
    queryFn: () => jobService.getAll(orgId, { status: 'active' }),
  })

  const activeJobs = jobsData?.data ?? []
  const selectedJob = activeJobs.find(j => j.id === selectedJobId)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResumeFile(file)
    setExtractError('')

    const name = file.name.toLowerCase()
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
    const isDocx =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    const isText = file.type.startsWith('text/') || name.endsWith('.txt')
    const isLegacyDoc = name.endsWith('.doc') && !isDocx

    // Legacy binary .doc cannot be parsed in the browser
    if (isLegacyDoc) {
      setResumeText('')
      setExtractError(
        'Legacy .doc files are not supported. Please save it as PDF or .docx, or paste the resume text below.'
      )
      return
    }

    // Plain text — read directly
    if (isText) {
      const reader = new FileReader()
      reader.onload = (evt) => setResumeText((evt.target?.result as string) ?? '')
      reader.readAsText(file)
      return
    }

    // PDF or DOCX — lazy-load the right extractor (code-split) and parse in-browser
    if (isPdf || isDocx) {
      setIsExtracting(true)
      setResumeText('')
      try {
        let text: string
        if (isPdf) {
          const { extractTextFromPdf } = await import('@/lib/pdf')
          text = await extractTextFromPdf(file)
        } else {
          const { extractTextFromDocx } = await import('@/lib/docx')
          text = await extractTextFromDocx(file)
        }

        if (!text.trim()) {
          setExtractError(
            isPdf
              ? 'No text could be extracted — this looks like a scanned or image-only PDF. Please upload a text-based PDF, or paste the resume text below.'
              : 'No text could be extracted from this document. Please paste the resume text below.'
          )
          return
        }
        setResumeText(text)
      } catch (err) {
        console.error('[Resume Extraction]', err)
        const label = isPdf ? 'PDF' : 'document'
        setExtractError(
          err instanceof Error
            ? `Could not read this ${label}: ${err.message}. You can paste the resume text below instead.`
            : `Could not read this ${label}. You can paste the resume text below instead.`
        )
      } finally {
        setIsExtracting(false)
      }
      return
    }

    // Unknown type — fall back to a plain-text read attempt
    const reader = new FileReader()
    reader.onload = (evt) => setResumeText((evt.target?.result as string) ?? '')
    reader.readAsText(file)
  }

  async function handleEvaluate() {
    if (!selectedJob || !resumeText.trim() || !candidateName.trim()) return
    setIsEvaluating(true)
    setEvalError('')
    setSaveWarning('')
    setStep('result')
    try {
      // 1) Scoring — must succeed to show a result
      const response = await atsService.evaluate({
        resume_text: resumeText,
        job_description: selectedJob.description,
      })
      setResult(response)

      const name = candidateName.trim()
      const email = candidateEmail.trim()

      // 2) Persistence — best-effort. A DB error shows a warning, NOT a failure,
      //    so a Supabase issue never hides the score.
      try {
        const candidate = await candidateService.create(orgId, {
          name,
          email,
          phone: '',
          appliedJobId: selectedJob.id,
          appliedJobTitle: selectedJob.title,
          latestScore: response.score,
          latestLabel: response.label,
          status: 'reviewing',
          resumeText,
          organizationName: user?.organizationName,
        })

        // Store the uploaded resume file in the org's bucket (if one was uploaded)
        if (resumeFile) {
          try {
            const { storageService } = await import('@/services/storage.service')
            if (storageService.isEnabled()) {
              const path = await storageService.uploadResume(orgId, candidate.id, resumeFile)
              await candidateService.update(candidate.id, { resumeUrl: path })
            }
          } catch (upErr) {
            console.warn('[Evaluation] resume upload failed:', upErr)
          }
        }

        await atsService.saveEvaluation(orgId, {
          organizationId: orgId,
          organizationName: user?.organizationName,
          candidateId: candidate.id,
          candidateName: name,
          candidateEmail: email,
          jobId: selectedJob.id,
          jobTitle: selectedJob.title,
          resumeText,
          score: response.score,
          label: response.label,
          evaluatedBy: user?.name ?? 'Recruiter',
        })

        queryClient.invalidateQueries({ queryKey: ['evaluations'] })
        queryClient.invalidateQueries({ queryKey: ['candidates'] })
        queryClient.invalidateQueries({ queryKey: ['org-dashboard'] })

        notify('evaluation', 'Evaluation completed', `${name} — ${response.label} (${response.score.toFixed(1)})`)

        if (notifications.evaluationCompleted && user?.email && mailService.isEnabled()) {
          mailService.send({
            to: user.email,
            ...evaluationEmail({
              candidateName: name,
              jobTitle: selectedJob.title,
              score: response.score,
              label: response.label,
              orgName: user?.organizationName ?? 'ATS Scanner',
              logoUrl: user?.organizationLogo,
              appUrl: `${window.location.origin}${window.location.pathname}#/org/evaluations`,
            }),
          })
        }
      } catch (saveErr) {
        console.error('[Save evaluation]', saveErr)
        setSaveWarning(saveErr instanceof Error ? saveErr.message : 'Could not save to the database')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Evaluation failed'
      setEvalError(message)
      console.error('[ATS Evaluation]', err)
    } finally {
      setIsEvaluating(false)
    }
  }

  function resetFlow() {
    setStep('upload')
    setResumeText('')
    setFileName('')
    setSelectedJobId('')
    setCandidateName('')
    setCandidateEmail('')
    setResult(null)
    setResumeFile(null)
    setEvalError('')
    setSaveWarning('')
    setExtractError('')
  }

  const currentStepIdx = STEPS.findIndex(s => s.key === step)

  function StepIndicator() {
    return (
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-colors',
                idx < currentStepIdx && 'text-emerald-600 dark:text-emerald-400',
                idx === currentStepIdx && 'text-violet-600 dark:text-violet-400',
                idx > currentStepIdx && 'text-slate-400 dark:text-slate-600',
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  idx < currentStepIdx && 'bg-emerald-600 text-white',
                  idx === currentStepIdx && 'bg-violet-600 text-white',
                  idx > currentStepIdx && 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600',
                )}
              >
                {idx < currentStepIdx ? <CheckCircle className="w-4 h-4" /> : s.num}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn('h-px w-8 sm:w-16 transition-colors', idx < currentStepIdx ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800')} />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="New ATS Evaluation"
        description="Score a resume against a job description"
        breadcrumb={[
          { label: 'ATS Evaluations', href: '/org/evaluations' },
          { label: 'New Evaluation' },
        ]}
      />

      <div className="max-w-2xl">
        <StepIndicator />

        {/* Step 1: Upload Resume */}
        {step === 'upload' && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Upload Resume</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Upload a resume file or paste the text directly
            </p>

            {/* Drop Zone */}
            <div
              onClick={() => !isExtracting && fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center transition-all group',
                isExtracting
                  ? 'border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-900/10 cursor-wait'
                  : 'border-slate-200 dark:border-slate-700 cursor-pointer hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/30 dark:hover:bg-violet-900/10'
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                {isExtracting ? (
                  <Loader2 className="w-6 h-6 text-violet-600 dark:text-violet-400 animate-spin" />
                ) : resumeText && fileName ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Upload className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                )}
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isExtracting
                  ? 'Extracting text…'
                  : fileName
                    ? fileName
                    : 'Click to upload or drag & drop'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {isExtracting
                  ? 'Reading your file in the browser'
                  : 'PDF, DOCX, or TXT up to 10MB'}
              </p>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileChange} />
            </div>

            {extractError && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">{extractError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400 dark:text-slate-500">or paste text</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            <Textarea
              placeholder="Paste resume text here…"
              rows={10}
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              className="font-mono text-xs"
            />

            <div className="flex justify-end mt-5">
              <Button
                rightIcon={<ArrowRight className="w-4 h-4" />}
                disabled={!resumeText.trim()}
                onClick={() => setStep('select-job')}
              >
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Select Job */}
        {step === 'select-job' && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Select Job Description</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Choose which job to evaluate this resume against
            </p>

            <div className="space-y-3">
              {activeJobs.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  No active jobs found. Create a job first.
                </p>
              ) : (
                activeJobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border-2 transition-all',
                      selectedJobId === job.id
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{job.title}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{job.department}</span>
                          <span>·</span>
                          <span>{job.location}</span>
                          <span>·</span>
                          <span>{job.experienceRequired}</span>
                        </div>
                      </div>
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 transition-colors flex items-center justify-center',
                        selectedJobId === job.id ? 'border-violet-600 bg-violet-600' : 'border-slate-300 dark:border-slate-600'
                      )}>
                        {selectedJobId === job.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button rightIcon={<ArrowRight className="w-4 h-4" />} disabled={!selectedJobId} onClick={() => setStep('review')}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Review & Submit</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Confirm details before running the ATS evaluation
            </p>

            <div className="space-y-4">
              {/* Candidate details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Candidate Name *"
                  placeholder="Jane Doe"
                  value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                />
                <Input
                  label="Candidate Email"
                  type="email"
                  placeholder="jane@email.com (optional)"
                  value={candidateEmail}
                  onChange={e => setCandidateEmail(e.target.value)}
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Resume</p>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {fileName || 'Pasted text'}
                  </p>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {resumeText.trim().split(/\s+/).length} words
                </p>
              </div>

              {selectedJob && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Job Description</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedJob.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedJob.department} · {selectedJob.location} · {selectedJob.experienceRequired}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  The AI model will analyze the resume against the job description and provide an ATS compatibility score with a match label.
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => setStep('select-job')}>
                Back
              </Button>
              <Button onClick={handleEvaluate} disabled={!candidateName.trim()}>
                Run Evaluation
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Result */}
        {step === 'result' && (
          <div className="space-y-5">
            {isEvaluating ? (
              <Card className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Analyzing Resume…</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Our AI model is scoring the candidate</p>
              </Card>
            ) : result ? (
              <>
                {saveWarning && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>Score shown, but not saved to the database:</strong> {saveWarning}
                    </p>
                  </div>
                )}
                {/* Score Card */}
                <Card className="text-center py-8">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-wider">
                    ATS Score
                  </p>
                  <div className="flex justify-center mb-6">
                    <CircularProgress score={result.score ?? 0} label={result.label} size="xl" />
                  </div>
                  <span className={`inline-flex items-center text-sm font-semibold px-4 py-1.5 rounded-full ${getLabelColor(result.label)}`}>
                    {result.label}
                  </span>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                    vs <strong className="text-slate-700 dark:text-slate-300">{selectedJob?.title}</strong>
                  </p>
                </Card>

                {/* Real metrics from webhook */}
                <Card>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Evaluation Breakdown</h3>
                  <div className="space-y-4">

                    {/* ATS Score */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">ATS Score</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {typeof result.score === 'number' ? result.score.toFixed(2) : '—'}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${Math.min(result.score ?? 0, 100)}%`,
                            background: (result.score ?? 0) >= 75 ? '#10b981' : (result.score ?? 0) >= 50 ? '#eab308' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>

                    {/* Similarity */}
                    {typeof result.similarity === 'number' && (
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Similarity Score</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {result.similarity.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${Math.min(result.similarity * 100, 100)}%`,
                              background: result.similarity >= 0.75 ? '#10b981' : result.similarity >= 0.5 ? '#eab308' : '#ef4444',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Label pill with explanation */}
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Match Classification</span>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getLabelColor(result.label)}`}>
                        {result.label}
                      </span>
                    </div>

                  </div>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                    className="flex-1"
                    onClick={resetFlow}
                  >
                    New Evaluation
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                    className="flex-1"
                    onClick={() => navigate('/org/evaluations')}
                  >
                    View All Results
                  </Button>
                </div>
              </>
            ) : (
              <Card className="py-8">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                    <span className="text-red-600 dark:text-red-400 text-xl font-bold">!</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Evaluation failed</p>
                </div>
                {evalError && (
                  <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-left">
                    <p className="text-xs font-mono text-red-700 dark:text-red-400 break-all">{evalError}</p>
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  <Button variant="secondary" onClick={() => { setStep('review'); setEvalError('') }}>
                    Try Again
                  </Button>
                  <Button variant="ghost" onClick={resetFlow}>
                    Start Over
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
