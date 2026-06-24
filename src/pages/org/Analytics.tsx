import { useQuery } from '@tanstack/react-query'
import { Briefcase, Users, FileSearch, Star, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Card, CardHeader, Spinner, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { jobService } from '@/services/job.service'
import { candidateService } from '@/services/candidate.service'
import { atsService } from '@/services/ats.service'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useChartTheme } from '@/lib/chartTheme'

export function OrgAnalytics() {
  const { user } = useAuthStore()
  const chart = useChartTheme()
  const orgId = user?.organizationId ?? 'org1'

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', orgId, 'analytics'],
    queryFn: () => jobService.getAll(orgId, { perPage: 100 }),
  })
  const { data: candidatesData, isLoading: candLoading } = useQuery({
    queryKey: ['candidates', orgId, 'analytics'],
    queryFn: () => candidateService.getAll(orgId, { perPage: 100 }),
  })
  const { data: evalsData, isLoading: evalLoading } = useQuery({
    queryKey: ['evaluations', orgId, 'analytics'],
    queryFn: () => atsService.getAll(orgId, { perPage: 100 }),
  })

  const isLoading = jobsLoading || candLoading || evalLoading
  const jobs = jobsData?.data ?? []
  const candidates = candidatesData?.data ?? []
  const evaluations = evalsData?.data ?? []

  // Per-job engagement funnel
  const perJob = jobs.map(job => {
    const jobCandidates = candidates.filter(c => c.appliedJobId === job.id)
    const jobEvals = evaluations.filter(e => e.jobId === job.id)
    const avgScore = jobEvals.length
      ? jobEvals.reduce((s, e) => s + e.score, 0) / jobEvals.length
      : 0
    return {
      id: job.id,
      title: job.title,
      department: job.department,
      candidates: jobCandidates.length,
      evaluations: jobEvals.length,
      shortlisted: jobCandidates.filter(c => c.status === 'shortlisted').length,
      rejected: jobCandidates.filter(c => c.status === 'rejected').length,
      hired: jobCandidates.filter(c => c.status === 'hired').length,
      avgScore,
    }
  }).sort((a, b) => b.candidates - a.candidates)

  // Org-wide funnel
  const totalCandidates = candidates.length
  const totalEvaluations = evaluations.length
  const totalShortlisted = candidates.filter(c => c.status === 'shortlisted').length
  const totalHired = candidates.filter(c => c.status === 'hired').length
  const avgScore = evaluations.length ? evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length : 0
  const shortlistRate = totalEvaluations ? (totalShortlisted / totalEvaluations) * 100 : 0

  const funnel = [
    { stage: 'Candidates', value: totalCandidates, color: '#60a5fa' },
    { stage: 'Evaluated', value: totalEvaluations, color: '#7c3aed' },
    { stage: 'Shortlisted', value: totalShortlisted, color: '#10b981' },
    { stage: 'Hired', value: totalHired, color: '#f59e0b' },
  ]

  const candidatesPerJob = perJob.slice(0, 8).map(j => ({ name: j.title, candidates: j.candidates }))

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Analytics" description="Job engagement and hiring funnel" />
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Analytics" description="Job engagement and hiring funnel across your organization" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard compact title="Active Jobs" value={jobs.filter(j => j.status === 'active').length} icon={Briefcase}
          iconColor="text-violet-600 dark:text-violet-400" iconBg="bg-violet-100 dark:bg-violet-900/30" />
        <StatCard compact title="Candidates" value={totalCandidates} icon={Users}
          iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/30" />
        <StatCard compact title="Evaluations" value={totalEvaluations} icon={FileSearch}
          iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/30" />
        <StatCard compact title="Shortlisted" value={totalShortlisted} icon={Star}
          iconColor="text-amber-600 dark:text-amber-400" iconBg="bg-amber-100 dark:bg-amber-900/30" />
        <StatCard compact title="Shortlist Rate" value={`${shortlistRate.toFixed(0)}%`} description={`avg score ${avgScore.toFixed(1)}`} icon={TrendingUp}
          iconColor="text-pink-600 dark:text-pink-400" iconBg="bg-pink-100 dark:bg-pink-900/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Hiring funnel */}
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

        {/* Candidates per job */}
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
                <Bar dataKey="candidates" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Per-job engagement table */}
      <Card padding="none">
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
                  <tr key={j.id} className="border-b border-slate-100 dark:border-transparent/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="py-3 px-5">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{j.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{j.department}</p>
                    </td>
                    <td className="text-center text-slate-700 dark:text-slate-300">{j.candidates}</td>
                    <td className="text-center text-slate-700 dark:text-slate-300">{j.evaluations}</td>
                    <td className="text-center">
                      {j.shortlisted > 0 ? <Badge variant="success">{j.shortlisted}</Badge> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="text-center">
                      {j.rejected > 0 ? <Badge variant="danger">{j.rejected}</Badge> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="text-center">
                      {j.hired > 0 ? <Badge variant="purple">{j.hired}</Badge> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="text-center font-medium text-slate-900 dark:text-slate-100">
                      {j.evaluations > 0 ? j.avgScore.toFixed(1) : '—'}
                    </td>
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
