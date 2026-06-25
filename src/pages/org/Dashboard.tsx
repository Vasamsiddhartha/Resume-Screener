import { useNavigate } from 'react-router-dom'
import { Users, Briefcase, FileSearch, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/shared/StatCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardHeader, Button, Badge } from '@/components/ui'
import { CircularProgress } from '@/components/shared/CircularProgress'
import { getLabelColor } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { atsService } from '@/services/ats.service'
import { candidateService } from '@/services/candidate.service'
import { jobService } from '@/services/job.service'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { useChartTheme } from '@/lib/chartTheme'

const PIE_COLORS = ['#10b981', '#22c55e', '#eab308', '#f97316', '#ef4444', '#4b5694', '#ec4899']

export function OrgDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const chart = useChartTheme()
  const orgId = user?.organizationId ?? 'org1'

  // Live data — keys share the 'evaluations'/'candidates'/'jobs' prefixes so a
  // new evaluation (which invalidates those) refreshes the dashboard too.
  const { data: evalsData } = useQuery({
    queryKey: ['evaluations', orgId, 'dashboard'],
    queryFn: () => atsService.getAll(orgId, { perPage: 100 }),
  })
  const { data: candidatesData } = useQuery({
    queryKey: ['candidates', orgId, 'dashboard'],
    queryFn: () => candidateService.getAll(orgId, { perPage: 100 }),
  })
  const { data: jobsData } = useQuery({
    queryKey: ['jobs', orgId, 'dashboard'],
    queryFn: () => jobService.getAll(orgId, { perPage: 100 }),
  })

  const evaluations = evalsData?.data ?? []
  const candidates = candidatesData?.data ?? []
  const jobs = jobsData?.data ?? []

  const totalEvaluations = evalsData?.total ?? 0
  const totalCandidates = candidatesData?.total ?? 0
  const activeJobs = jobs.filter(j => j.status === 'active').length
  const averageScore = evaluations.length
    ? (evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length)
    : 0

  // ── Merged from the former Analytics page: hiring funnel + per-job engagement ──
  const totalShortlisted = candidates.filter(c => c.status === 'shortlisted').length
  const totalHired = candidates.filter(c => c.status === 'hired').length
  const funnel = [
    { stage: 'Candidates', value: totalCandidates, color: '#60a5fa' },
    { stage: 'Evaluated', value: totalEvaluations, color: '#4b5694' },
    { stage: 'Shortlisted', value: totalShortlisted, color: '#10b981' },
    { stage: 'Hired', value: totalHired, color: '#f59e0b' },
  ]
  const perJob = jobs.map(job => {
    const jobCandidates = candidates.filter(c => c.appliedJobId === job.id)
    const jobEvals = evaluations.filter(e => e.jobId === job.id)
    return {
      id: job.id, title: job.title, department: job.department,
      candidates: jobCandidates.length, evaluations: jobEvals.length,
      shortlisted: jobCandidates.filter(c => c.status === 'shortlisted').length,
      rejected: jobCandidates.filter(c => c.status === 'rejected').length,
      hired: jobCandidates.filter(c => c.status === 'hired').length,
      avgScore: jobEvals.length ? jobEvals.reduce((s, e) => s + e.score, 0) / jobEvals.length : 0,
    }
  }).sort((a, b) => b.candidates - a.candidates)
  const candidatesPerJob = perJob.slice(0, 8).map(j => ({ name: j.title, candidates: j.candidates }))

  const recentEvals = evaluations.slice(0, 5)
  const topCandidates = candidates.filter(c => c.latestScore != null).slice(0, 5)

  // Score distribution by label, computed from live evaluations
  const distMap = new Map<string, number>()
  evaluations.forEach(e => distMap.set(e.label, (distMap.get(e.label) ?? 0) + 1))
  const scoreDistribution = Array.from(distMap, ([label, count]) => ({ label, count }))

  // Real-time monthly trend computed from actual evaluations (last 6 months)
  const now = new Date()
  const evaluationTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const monthEvals = evaluations.filter(e => {
      const ed = new Date(e.evaluatedAt)
      return `${ed.getFullYear()}-${ed.getMonth()}` === key
    })
    return {
      date: d.toLocaleString('en-US', { month: 'short' }),
      evaluations: monthEvals.length,
      avgScore: monthEvals.length ? monthEvals.reduce((s, e) => s + e.score, 0) / monthEvals.length : 0,
    }
  })

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        description="Here's what's happening in your organization"
        action={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/org/evaluations/new')}>
            New Evaluation
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Candidates" value={totalCandidates} icon={Users}
          onClick={() => navigate('/org/candidates')}
          iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/30" />
        <StatCard title="Active Jobs" value={activeJobs} icon={Briefcase}
          onClick={() => navigate('/org/jobs', { state: { status: 'active' } })}
          iconColor="text-violet-600 dark:text-violet-400" iconBg="bg-violet-100 dark:bg-violet-900/30" />
        <StatCard title="Evaluations" value={totalEvaluations} icon={FileSearch}
          onClick={() => navigate('/org/evaluations')}
          iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/30" />
        <StatCard title="Avg ATS Score" value={`${averageScore.toFixed(1)}%`} icon={TrendingUp}
          onClick={() => navigate('/org/evaluations')}
          iconColor="text-orange-600 dark:text-orange-400" iconBg="bg-orange-100 dark:bg-orange-900/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <Card className="lg:col-span-3">
          <CardHeader title="Evaluation Trend" description="Monthly activity" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={evaluationTrend}>
              <defs>
                <linearGradient id="orgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4b5694" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4b5694" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <Tooltip {...chart.tooltip} />
              <Area type="monotone" dataKey="evaluations" name="Evaluations" stroke="#4b5694" strokeWidth={2} fill="url(#orgGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Score Distribution" />
          {scoreDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-[140px] text-sm text-slate-400 dark:text-slate-500">
              No evaluations yet
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={scoreDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="count" paddingAngle={2}>
                    {scoreDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...chart.tooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {scoreDistribution.map((item, i) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400 flex-1 truncate">{item.label}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Evaluations */}
        <Card padding="none">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-transparent">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Evaluations</h3>
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/org/evaluations')}>
              View all
            </Button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {recentEvals.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                No evaluations yet
              </div>
            )}
            {recentEvals.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <CircularProgress score={ev.score} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{ev.candidateName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{ev.jobTitle}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getLabelColor(ev.label)}`}>
                  {ev.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Candidates */}
        <Card padding="none">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-transparent">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top Candidates</h3>
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/org/candidates')}>
              View all
            </Button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {topCandidates.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                No scored candidates yet
              </div>
            )}
            {topCandidates.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.appliedJobTitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.latestScore?.toFixed(1)}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">score</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Hiring funnel + candidates per job (merged from Analytics) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader title="Hiring Funnel" description="Candidates → evaluated → shortlisted → hired" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnel} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} width={80} />
              <Tooltip {...chart.tooltip} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                {funnel.map((f, i) => <Cell key={i} fill={f.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Candidates per Job" />
          {candidatesPerJob.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-sm text-slate-400 dark:text-slate-500">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={candidatesPerJob}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: chart.tick }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...chart.tooltip} />
                <Bar dataKey="candidates" fill="#4b5694" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Per-job engagement table (merged from Analytics) */}
      <Card padding="none" className="mt-4">
        <div className="p-5 border-b border-slate-100 dark:border-transparent">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Job Engagement</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-transparent text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="text-left font-medium py-3 px-5">Job</th>
                <th className="text-center font-medium py-3 px-3">Candidates</th>
                <th className="text-center font-medium py-3 px-3">Evaluated</th>
                <th className="text-center font-medium py-3 px-3">Shortlisted</th>
                <th className="text-center font-medium py-3 px-3">Rejected</th>
                <th className="text-center font-medium py-3 px-3">Hired</th>
                <th className="text-center font-medium py-3 px-3">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {perJob.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">No jobs yet</td></tr>
              ) : (
                perJob.map(j => (
                  <tr key={j.id} className="border-b border-slate-100 dark:border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="py-3 px-5">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{j.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{j.department}</p>
                    </td>
                    <td className="text-center text-slate-700 dark:text-slate-300">{j.candidates}</td>
                    <td className="text-center text-slate-700 dark:text-slate-300">{j.evaluations}</td>
                    <td className="text-center">{j.shortlisted > 0 ? <Badge variant="success">{j.shortlisted}</Badge> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                    <td className="text-center">{j.rejected > 0 ? <Badge variant="danger">{j.rejected}</Badge> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                    <td className="text-center">{j.hired > 0 ? <Badge variant="purple">{j.hired}</Badge> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                    <td className="text-center font-medium text-slate-900 dark:text-slate-100">{j.evaluations > 0 ? j.avgScore.toFixed(1) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
