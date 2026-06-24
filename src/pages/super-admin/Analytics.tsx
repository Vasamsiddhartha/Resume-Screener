import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Card, CardHeader } from '@/components/ui'
import { TrendingUp, Building2, FileSearch, Users } from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useChartTheme } from '@/lib/chartTheme'

const MONTHLY = [
  { month: 'Jan', evaluations: 145, orgs: 3, users: 45 },
  { month: 'Feb', evaluations: 198, orgs: 4, users: 52 },
  { month: 'Mar', evaluations: 312, orgs: 4, users: 58 },
  { month: 'Apr', evaluations: 428, orgs: 5, users: 63 },
  { month: 'May', evaluations: 389, orgs: 5, users: 68 },
  { month: 'Jun', evaluations: 510, orgs: 5, users: 71 },
]

const PLAN_DIST = [
  { name: 'Free', value: 1, color: '#94a3b8' },
  { name: 'Starter', value: 1, color: '#60a5fa' },
  { name: 'Professional', value: 2, color: '#4b5694' },
  { name: 'Enterprise', value: 1, color: '#f59e0b' },
]

const SCORE_DIST = [
  { label: 'Strong', count: 312 },
  { label: 'Good', count: 487 },
  { label: 'Fair', count: 534 },
  { label: 'Weak', count: 389 },
  { label: 'Poor', count: 260 },
]

export function AnalyticsPage() {
  const chart = useChartTheme()
  return (
    <div>
      <PageHeader title="Platform Analytics" description="Usage metrics and performance insights" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Evaluations" value="1,982" change="+18.4%" changeType="up" icon={FileSearch}
          iconColor="text-violet-600 dark:text-violet-400" iconBg="bg-violet-100 dark:bg-violet-900/30" />
        <StatCard title="Organizations" value="5" change="+1 this quarter" changeType="up" icon={Building2}
          iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/30" />
        <StatCard title="Active Users" value="71" change="+8.2%" changeType="up" icon={Users}
          iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/30" />
        <StatCard title="Growth Rate" value="18.4%" change="vs last month" changeType="up" icon={TrendingUp}
          iconColor="text-orange-600 dark:text-orange-400" iconBg="bg-orange-100 dark:bg-orange-900/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Evaluation & User Growth" />
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={MONTHLY}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <Tooltip {...chart.tooltip} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="evaluations" name="Evaluations" stroke="#4b5694" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="users" name="Users" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Plan Distribution" />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={PLAN_DIST} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {PLAN_DIST.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...chart.tooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {PLAN_DIST.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">{p.name} ({p.value})</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Score Distribution Across Platform" description="How candidates are scoring across all organizations" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={SCORE_DIST} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
            <Tooltip {...chart.tooltip} />
            <Bar dataKey="count" fill="#4b5694" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
