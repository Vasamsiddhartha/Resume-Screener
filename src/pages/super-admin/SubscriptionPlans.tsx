import { Check } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, Button, Badge } from '@/components/ui'
import { MOCK_PLANS } from '@/mock/data'

export function SubscriptionPlansPage() {
  return (
    <div>
      <PageHeader
        title="Subscription Plans"
        description="Manage platform pricing and feature tiers"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {MOCK_PLANS.map(plan => (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${plan.isPopular ? 'ring-2 ring-violet-500 dark:ring-violet-400' : ''}`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="purple" size="md" className="shadow-sm">Most Popular</Badge>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{plan.name}</h3>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">/month</span>
                )}
              </div>
            </div>

            <div className="space-y-1 mb-5 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-4">
              <p>{plan.limits.users === -1 ? 'Unlimited users' : `Up to ${plan.limits.users} users`}</p>
              <p>{plan.limits.jobs === -1 ? 'Unlimited jobs' : `Up to ${plan.limits.jobs} jobs`}</p>
              <p>
                {plan.limits.evaluationsPerMonth === -1
                  ? 'Unlimited evaluations'
                  : `${plan.limits.evaluationsPerMonth.toLocaleString()} evaluations/mo`}
              </p>
            </div>

            <ul className="space-y-2 flex-1 mb-6">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              variant={plan.isPopular ? 'primary' : 'outline'}
              className="w-full"
            >
              {plan.price === 0 ? 'Current Free Plan' : `Edit Plan`}
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Revenue Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Free Tier', count: 1, revenue: 0 },
            { label: 'Starter', count: 1, revenue: 49 },
            { label: 'Professional', count: 2, revenue: 298 },
            { label: 'Enterprise', count: 1, revenue: 499 },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {item.revenue === 0 ? 'Free' : `$${item.revenue}`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.count} org{item.count !== 1 ? 's' : ''}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
