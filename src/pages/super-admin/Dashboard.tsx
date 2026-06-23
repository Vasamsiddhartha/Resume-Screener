import { Building2, Users, FileSearch, DollarSign, Activity } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardHeader } from '@/components/ui'
import { MOCK_PLATFORM_ANALYTICS, MOCK_ORGANIZATIONS } from '@/mock/data'
import { formatDate, getStatusColor } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useChartTheme } from '@/lib/chartTheme'

const MONTHLY_DATA = [
  { month: 'Jan', evaluations: 145, organizations: 3 },
  { month: 'Feb', evaluations: 198, organizations: 4 },
  { month: 'Mar', evaluations: 312, organizations: 4 },
  { month: 'Apr', evaluations: 428, organizations: 5 },
  { month: 'May', evaluations: 389, organizations: 5 },
  { month: 'Jun', evaluations: 510, organizations: 5 },
]

export function SuperAdminDashboard() {
  const analytics = MOCK_PLATFORM_ANALYTICS
  const chart = useChartTheme()

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        description="Overview of all organizations and platform metrics"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Organizations"
          value={analytics.totalOrganizations}
          change="+1 this month"
          changeType="up"
          icon={Building2}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Active Users"
          value={analytics.activeUsers}
          change="+8.2%"
          changeType="up"
          icon={Users}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <StatCard
          title="Total Evaluations"
          value={analytics.totalEvaluations.toLocaleString()}
          change="+12.4%"
          changeType="up"
          icon={FileSearch}
          iconColor="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-100 dark:bg-violet-900/30"
        />
        <StatCard
          title="Monthly Usage"
          value={analytics.monthlyUsage}
          description="evaluations this month"
          icon={Activity}
          iconColor="text-orange-600 dark:text-orange-400"
          iconBg="bg-orange-100 dark:bg-orange-900/30"
        />
        <StatCard
          title="Revenue"
          value={`$${analytics.revenue.toLocaleString()}`}
          change={`+${analytics.growthRate}%`}
          changeType="up"
          icon={DollarSign}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-100 dark:bg-green-900/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <Card className="lg:col-span-3">
          <CardHeader title="Evaluation Trend" description="Monthly ATS evaluations across all organizations" />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={MONTHLY_DATA}>
              <defs>
                <linearGradient id="evalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <Tooltip {...chart.tooltip} />
              <Area type="monotone" dataKey="evaluations" stroke="#7c3aed" strokeWidth={2} fill="url(#evalGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Organizations Growth" description="New orgs per month" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MONTHLY_DATA} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <Tooltip {...chart.tooltip} />
              <Bar dataKey="organizations" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card padding="none">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Organizations</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {MOCK_ORGANIZATIONS.slice(0, 5).map(org => (
            <div key={org.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {org.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{org.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{org.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400">{org.memberCount} members</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{org.evaluationCount} evals</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${getStatusColor(org.status)}`}>
                  {org.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 shrink-0 hidden md:block">
                {formatDate(org.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
