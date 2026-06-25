import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Plus, Download, FileSearch, ThumbsUp, ThumbsDown, Trophy, Mail, Briefcase, ChevronRight, GitBranch } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { CircularProgress } from '@/components/shared/CircularProgress'
import { Card, Button, Input, SearchableSelect, Spinner, Modal, Badge, Pagination } from '@/components/ui'
import { atsService } from '@/services/ats.service'
import { jobService } from '@/services/job.service'
import { candidateService } from '@/services/candidate.service'
import { PipelineTag } from '@/components/shared/PipelineTag'
import { ResumeAttachment } from '@/components/shared/ResumeAttachment'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLabelColor, formatDateTime, exportToCSV, truncateText } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { LABEL_FILTER_OPTIONS, buildJobFilterOptions } from '@/lib/filters'
import { notify } from '@/store/notifications.store'
import type { ATSEvaluation, EvaluationDecision } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const SCORE_BINS = [
  { range: '91–100', count: 0, color: '#10b981' },
  { range: '76–90', count: 0, color: '#22c55e' },
  { range: '61–75', count: 0, color: '#eab308' },
  { range: '41–60', count: 0, color: '#f97316' },
  { range: '0–40', count: 0, color: '#ef4444' },
]

const EVAL_PER_PAGE = 10

export function ATSEvaluationsPage() {
  const { user } = useAuthStore()
  const orgId = user?.organizationId ?? 'org1'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('all')
  const [labelFilter, setLabelFilter] = useState('all')
  const [selected, setSelected] = useState<ATSEvaluation | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(EVAL_PER_PAGE)

  // Auto-open a candidate's evaluation when navigated here from the Candidates list.
  const navState = (useLocation().state ?? {}) as { candidateId?: string; candidateName?: string }
  const autoOpenedRef = useRef(false)

  const { data, isLoading } = useQuery({
    queryKey: ['evaluations', orgId, search, jobFilter, labelFilter],
    queryFn: () => atsService.getAll(orgId, { search, jobId: jobFilter, label: labelFilter, perPage: 100 }),
  })

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', orgId, 'filter-options'],
    queryFn: () => jobService.getAll(orgId, { perPage: 100 }),
  })

  // Candidate pipeline stages, so an evaluation row can show the candidate's tag.
  const { data: candidatesData } = useQuery({
    queryKey: ['candidates', orgId, 'pipeline-tags'],
    queryFn: () => candidateService.getAll(orgId, { perPage: 200 }),
  })
  const stageByCandidate = new Map((candidatesData?.data ?? []).map(c => [c.id, c.pipelineStage]))
  const candById = new Map((candidatesData?.data ?? []).map(c => [c.id, c]))

  const jobOptions = buildJobFilterOptions(jobsData?.data ?? [])

  // Open the matching evaluation modal once, when arriving from a candidate click.
  useEffect(() => {
    if (autoOpenedRef.current) return
    if (!navState.candidateId && !navState.candidateName) return
    const list = data?.data ?? []
    if (list.length === 0) return
    const match =
      list.find(e => e.candidateId === navState.candidateId) ??
      list.find(e => e.candidateName.toLowerCase() === (navState.candidateName ?? '').toLowerCase())
    autoOpenedRef.current = true
    if (match) setSelected(match)
    else if (navState.candidateName) setSearch(navState.candidateName) // no eval yet → filter the list
  }, [data, navState.candidateId, navState.candidateName])

  const decisionMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: EvaluationDecision }) =>
      atsService.setDecision(id, decision),
    onSuccess: (updated, vars) => {
      notify('candidate', `Candidate ${vars.decision}`, `${updated.candidateName} — ${updated.jobTitle}`)
      queryClient.invalidateQueries({ queryKey: ['evaluations'] })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      setSelected(updated)
    },
  })

  // Deep-clone so we never mutate the module-level constant (which is frozen in dev mode)
  const scoreBins = SCORE_BINS.map(b => ({ ...b }))
  data?.data.forEach(ev => {
    if (ev.score >= 91) scoreBins[0].count++
    else if (ev.score >= 76) scoreBins[1].count++
    else if (ev.score >= 61) scoreBins[2].count++
    else if (ev.score >= 41) scoreBins[3].count++
    else scoreBins[4].count++
  })

  function handleExportCSV() {
    if (!data?.data) return
    exportToCSV(
      data.data.map(ev => ({
        Candidate: ev.candidateName,
        Email: ev.candidateEmail,
        Job: ev.jobTitle,
        Score: ev.score,
        Label: ev.label,
        Date: ev.evaluatedAt,
        'Evaluated By': ev.evaluatedBy,
      })),
      'ats-evaluations'
    )
  }

  return (
    <div>
      <PageHeader
        title="ATS Evaluations"
        description="Review and compare all candidate evaluations"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<GitBranch className="w-4 h-4" />} onClick={() => navigate('/org/pipeline')}>
              Pipeline
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/org/evaluations/new')}>
              New Evaluation
            </Button>
          </div>
        }
      />

      {/* Score Distribution Chart */}
      {data && data.data.length > 0 && (
        <Card className="mb-5">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Score Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{data.data.length} evaluations total</p>
            </div>
            <div className="flex-1 h-24 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreBins} barSize={28}>
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#1c1c1f', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {scoreBins.map((bin, i) => (
                      <rect key={i} fill={bin.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-slate-100 dark:border-transparent flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by candidate or job…"
            leftIcon={<Search className="w-4 h-4" />}
            className="max-w-xs"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <SearchableSelect
            options={jobOptions}
            className="sm:w-56"
            value={jobFilter}
            onChange={v => { setJobFilter(v); setPage(1) }}
          />
          <SearchableSelect
            options={LABEL_FILTER_OPTIONS}
            className="sm:w-44"
            value={labelFilter}
            onChange={v => { setLabelFilter(v); setPage(1) }}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {data?.data.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                <FileSearch className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No evaluations found
              </div>
            ) : (
              (data?.data ?? []).slice((page - 1) * perPage, page * perPage).map(ev => (
                <button
                  key={ev.id}
                  onClick={() => setSelected(ev)}
                  className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <CircularProgress score={ev.score} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{ev.candidateName}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getLabelColor(ev.label)}`}>
                        {ev.label}
                      </span>
                      {ev.decision === 'shortlisted' && <Badge variant="success">Shortlisted</Badge>}
                      {ev.decision === 'hired' && <Badge variant="purple">Hired</Badge>}
                      {ev.decision === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                      <PipelineTag stage={stageByCandidate.get(ev.candidateId)} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>{ev.jobTitle}</span>
                      <span>·</span>
                      <span>by {ev.evaluatedBy}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{ev.score.toFixed(1)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{formatDateTime(ev.evaluatedAt)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                </button>
              ))
            )}
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

      {/* Evaluation detail + shortlist/reject (#5) */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Evaluation"
        size="lg"
        footer={
          selected && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant={selected.decision === 'shortlisted' ? 'primary' : 'outline'}
                className="flex-1"
                leftIcon={<ThumbsUp className="w-4 h-4" />}
                isLoading={decisionMutation.isPending && decisionMutation.variables?.decision === 'shortlisted'}
                onClick={() => decisionMutation.mutate({ id: selected.id, decision: 'shortlisted' })}
              >
                {selected.decision === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}
              </Button>
              <Button
                variant={selected.decision === 'hired' ? 'primary' : 'outline'}
                className="flex-1"
                leftIcon={<Trophy className="w-4 h-4" />}
                isLoading={decisionMutation.isPending && decisionMutation.variables?.decision === 'hired'}
                onClick={() => decisionMutation.mutate({ id: selected.id, decision: 'hired' })}
              >
                {selected.decision === 'hired' ? 'Hired' : 'Hire'}
              </Button>
              <Button
                variant={selected.decision === 'rejected' ? 'danger' : 'outline'}
                className="flex-1"
                leftIcon={<ThumbsDown className="w-4 h-4" />}
                isLoading={decisionMutation.isPending && decisionMutation.variables?.decision === 'rejected'}
                onClick={() => decisionMutation.mutate({ id: selected.id, decision: 'rejected' })}
              >
                {selected.decision === 'rejected' ? 'Rejected' : 'Reject'}
              </Button>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <CircularProgress score={selected.score} label={selected.label} size="md" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{selected.candidateName}</p>
                {selected.candidateEmail && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5" /> {selected.candidateEmail}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getLabelColor(selected.label)}`}>
                    {selected.label}
                  </span>
                  {selected.decision === 'shortlisted' && <Badge variant="success">Shortlisted</Badge>}
                  {selected.decision === 'hired' && <Badge variant="purple">Hired</Badge>}
                  {selected.decision === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Job
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selected.jobTitle}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Evaluated</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatDateTime(selected.evaluatedAt)}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">by {selected.evaluatedBy}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Resume excerpt</p>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">
                  {truncateText(selected.resumeText, 600)}
                </p>
              </div>
            </div>

            <ResumeAttachment
              candidateName={selected.candidateName}
              resumeUrl={candById.get(selected.candidateId)?.resumeUrl}
              resumeText={candById.get(selected.candidateId)?.resumeText || selected.resumeText}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
