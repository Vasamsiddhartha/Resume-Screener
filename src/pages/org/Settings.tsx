import { useForm } from 'react-hook-form'
import { Save, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardHeader, Button, Input, Select, Textarea } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'

export function OrgSettings() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'org_admin'

  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: user?.organizationName ?? '',
      email: 'contact@techcorp.com',
      industry: 'technology',
      size: '11-50',
      timezone: 'America/New_York',
      about: '',
    },
  })

  function onSubmit(data: unknown) {
    console.log('Org settings saved', data)
  }

  return (
    <div>
      <PageHeader title="Organization Settings" description="Manage your organization's profile and preferences" />

      <div className="space-y-5 max-w-2xl">
        <Card>
          <CardHeader title="Organization Profile" />
          <div className="space-y-4">
            <Input
              label="Organization Name"
              {...register('name')}
              disabled={!isAdmin}
            />
            <Input
              label="Contact Email"
              type="email"
              {...register('email')}
              disabled={!isAdmin}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Industry"
                options={[
                  { value: 'technology', label: 'Technology' },
                  { value: 'healthcare', label: 'Healthcare' },
                  { value: 'finance', label: 'Finance' },
                  { value: 'retail', label: 'Retail' },
                  { value: 'education', label: 'Education' },
                  { value: 'other', label: 'Other' },
                ]}
                {...register('industry')}
                disabled={!isAdmin}
              />
              <Select
                label="Company Size"
                options={[
                  { value: '1-10', label: '1–10 employees' },
                  { value: '11-50', label: '11–50 employees' },
                  { value: '51-200', label: '51–200 employees' },
                  { value: '201-1000', label: '201–1000 employees' },
                  { value: '1000+', label: '1000+ employees' },
                ]}
                {...register('size')}
                disabled={!isAdmin}
              />
            </div>
            <Textarea
              label="About"
              placeholder="Brief description of your organization…"
              rows={3}
              {...register('about')}
              disabled={!isAdmin}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Preferences" />
          <Select
            label="Timezone"
            options={[
              { value: 'America/New_York', label: 'Eastern Time (ET)' },
              { value: 'America/Chicago', label: 'Central Time (CT)' },
              { value: 'America/Denver', label: 'Mountain Time (MT)' },
              { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
              { value: 'Europe/London', label: 'London (GMT)' },
              { value: 'Europe/Paris', label: 'Paris (CET)' },
            ]}
            {...register('timezone')}
            disabled={!isAdmin}
          />
        </Card>

        <Card>
          <CardHeader title="Subscription" description="Your current plan" />
          <div className="flex items-center gap-4 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Professional Plan</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">$149/month · renews July 17, 2026</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              Manage Plan
            </Button>
          </div>
        </Card>

        {!isAdmin && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Only organization admins can modify these settings.
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-end">
            <Button onClick={handleSubmit(onSubmit)} leftIcon={<Save className="w-4 h-4" />}>
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
