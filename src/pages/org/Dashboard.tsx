import { useNavigate } from 'react-router-dom'
import { Users, Briefcase, FileSearch, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/shared/StatCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardHeader, Button } from '@/components/ui'
import { CircularProgress } from '@/components/shared/CircularProgress'
import { getLabelColor } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { atsService } from '@/services/ats.service'
import { candidateService } from '@/services/candidate.service'
import { jobService } from '@/services/job.service'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
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
    queryFn: () => jobService.getAll(orgId, { status: 'active', perPage: 100 }),
  })

  const evaluations = evalsData?.data ?? []
  const candidates = candidatesData?.data ?? []

  const totalEvaluations = evalsData?.total ?? 0
  const totalCandidates = candidatesData?.total ?? 0
  const activeJobs = jobsData?.total ?? 0
  const averageScore = evaluations.length
    ? (evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length)
    : 0

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
          iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/30" />
        <StatCard title="Active Jobs" value={activeJobs} icon={Briefcase}
          iconColor="text-violet-600 dark:text-violet-400" iconBg="bg-violet-100 dark:bg-violet-900/30" />
        <StatCard title="Evaluations" value={totalEvaluations} icon={FileSearch}
          iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/30" />
        <StatCard title="Avg ATS Score" value={`${averageScore.toFixed(1)}%`} icon={TrendingUp}
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
    </div>
  )
}
