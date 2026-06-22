import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Save, Building2, User, Bell, Palette, Sun, Moon, Monitor, CheckCircle, UserCog, Cpu, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardHeader, Button, Input, Select, Textarea, Toggle } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore, DEFAULT_MODEL } from '@/store/settings.store'
import { useThemeStore } from '@/store/theme.store'
import { authService } from '@/services/auth.service'
import { notify } from '@/store/notifications.store'
import { TeamMembersPage } from '@/pages/org/TeamMembers'
import { cn } from '@/lib/utils'
import type { NotificationPreferences } from '@/types'

type Tab = 'profile' | 'team' | 'notifications' | 'appearance' | 'model' | 'organization'

const NOTIFICATION_ITEMS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'evaluationCompleted', label: 'Evaluation completed', description: 'Email me when an ATS evaluation finishes' },
  { key: 'candidateShortlisted', label: 'Candidate shortlisted', description: 'Email me when a candidate is shortlisted for a job' },
  { key: 'weeklyReport', label: 'Weekly summary', description: 'A weekly digest of hiring activity' },
  { key: 'teamInvites', label: 'Team invites', description: 'When someone joins or is invited to your organization' },
  { key: 'productUpdates', label: 'Product updates', description: 'Occasional news about new features' },
]

export function OrgSettings() {
  const { user, updateUser } = useAuthStore()
  const isAdmin = user?.role === 'org_admin'
  const [tab, setTab] = useState<Tab>('profile')

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'team', label: 'Team Members', icon: UserCog },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'model', label: 'Model', icon: Cpu },
    { key: 'organization', label: 'Organization', icon: Building2 },
  ]

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account, preferences, and organization" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab nav */}
        <nav className="lg:w-52 shrink-0 flex lg:flex-col gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                tab === t.key
                  ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 max-w-2xl">
          {tab === 'profile' && <ProfileTab user={user} updateUser={updateUser} />}
          {tab === 'team' && <Card><TeamMembersPage embedded /></Card>}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'model' && <ModelTab />}
          {tab === 'organization' && <OrganizationTab isAdmin={isAdmin} orgName={user?.organizationName ?? ''} />}
        </div>
      </div>
    </div>
  )
}

// ─── Profile (#2) ───────────────────────────────────────────────────────────

function ProfileTab({ user, updateUser }: { user: ReturnType<typeof useAuthStore.getState>['user']; updateUser: (u: Partial<NonNullable<ReturnType<typeof useAuthStore.getState>['user']>>) => void }) {
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      jobTitle: user?.jobTitle ?? '',
    },
  })

  async function onSubmit(data: { name: string; email: string; phone: string; jobTitle: string }) {
    // Build a detailed list of what actually changed
    const changes: string[] = []
    if (data.name !== (user?.name ?? '')) changes.push(`Name changed to ${data.name}`)
    if (data.email !== (user?.email ?? '')) changes.push(`Email changed to ${data.email}`)
    if (data.phone !== (user?.phone ?? '')) changes.push(`Phone number changed to ${data.phone || '(removed)'}`)
    if (data.jobTitle !== (user?.jobTitle ?? '')) changes.push(`Job title changed to ${data.jobTitle || '(removed)'}`)

    await authService.updateProfile(data)
    updateUser(data)
    if (changes.length) {
      notify('settings', 'Profile updated', changes.join('\n'))
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Card>
      <CardHeader title="Profile" description="Update your personal information" />
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xl font-bold">
          {user?.name?.charAt(0) ?? 'U'}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
            {user?.role === 'org_admin' ? 'Admin' : 'Recruiter'} · {user?.organizationName}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Input label="Full Name" {...register('name')} />
        <Input label="Email" type="email" {...register('email')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Phone" {...register('phone')} placeholder="+1 555 000 0000" />
          <Input label="Job Title" {...register('jobTitle')} placeholder="e.g. Technical Recruiter" />
        </div>
      </div>

      <div className="flex items-center gap-3 justify-end mt-6">
        {saved && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        <Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting} leftIcon={<Save className="w-4 h-4" />}>
          Save Profile
        </Button>
      </div>
    </Card>
  )
}

// ─── Notifications (#4 — UI now, sending wired later) ─────────────────────────

function NotificationsTab() {
  const { notifications, setNotification } = useSettingsStore()

  return (
    <Card>
      <CardHeader title="Email Notifications" description="Choose what we email you about" />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {NOTIFICATION_ITEMS.map(item => (
          <Toggle
            key={item.key}
            label={item.label}
            description={item.description}
            checked={notifications[item.key]}
            onChange={v => { setNotification(item.key, v); notify('settings', 'Notification preference updated', `${item.label} ${v ? 'enabled' : 'disabled'}`) }}
          />
        ))}
      </div>
      <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Preferences are saved on this device. Email delivery is connected through your backend provider.
        </p>
      </div>
    </Card>
  )
}

// ─── Appearance (app settings #3) ─────────────────────────────────────────────

function AppearanceTab() {
  const { theme, setTheme } = useThemeStore()
  const { density, setDensity } = useSettingsStore()

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <Card>
      <CardHeader title="Appearance" description="Customize how the app looks" />

      <div className="mb-6">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setTheme(opt.value); notify('settings', 'Appearance updated', `Theme set to ${opt.label}`) }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                theme === opt.value
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              )}
            >
              <opt.icon className={cn('w-5 h-5', theme === opt.value ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400')} />
              <span className={cn('text-xs font-medium', theme === opt.value ? 'text-violet-700 dark:text-violet-400' : 'text-slate-600 dark:text-slate-400')}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Density</p>
        <Select
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
          value={density}
          onChange={e => setDensity(e.target.value as 'comfortable' | 'compact')}
        />
      </div>
    </Card>
  )
}

// ─── Model — change the scoring model endpoint (default = existing) ───────────

function ModelTab() {
  const { scoreModelUrl, setScoreModelUrl } = useSettingsStore()
  const [value, setValue] = useState(scoreModelUrl)
  const [saved, setSaved] = useState(false)
  const usingDefault = !scoreModelUrl

  function save() {
    setScoreModelUrl(value)
    notify('settings', 'Scoring model updated', value.trim() ? `Model endpoint set to ${value.trim()}` : 'Reverted to the default model')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function resetDefault() {
    setValue('')
    setScoreModelUrl('')
    notify('settings', 'Scoring model updated', 'Reverted to the default model')
  }

  return (
    <Card>
      <CardHeader title="Scoring Model" description="The AI endpoint used to score resumes" />

      <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Currently using</p>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {usingDefault ? DEFAULT_MODEL.name : 'Custom endpoint'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 break-all mt-0.5">
          {scoreModelUrl || DEFAULT_MODEL.url}
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Model endpoint URL"
          placeholder={DEFAULT_MODEL.url}
          hint="Leave blank to use the default model. Must return { ats_score, label }."
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <div className="flex items-center gap-3 justify-end">
          {saved && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <Button variant="ghost" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={resetDefault} disabled={usingDefault && !value}>
            Use default
          </Button>
          <Button leftIcon={<Save className="w-4 h-4" />} onClick={save}>Save model</Button>
        </div>
      </div>
    </Card>
  )
}

// ─── Organization (#3 — admin only) ───────────────────────────────────────────

function OrganizationTab({ isAdmin, orgName }: { isAdmin: boolean; orgName: string }) {
  const { user, updateUser } = useAuthStore()
  const [logo, setLogo] = useState(user?.organizationLogo)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: orgName,
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

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user?.organizationId) return
    setUploadingLogo(true)
    try {
      let url: string
      const { isSupabaseConfigured, supabase } = await import('@/lib/supabase')
      if (isSupabaseConfigured && supabase) {
        const { storageService } = await import('@/services/storage.service')
        url = await storageService.uploadLogo(user.organizationId, file)
        await supabase.from('organizations').update({ logo_url: url }).eq('id', user.organizationId)
      } else {
        // Mock mode — keep a local data URL
        url = await new Promise<string>(res => {
          const r = new FileReader()
          r.onload = () => res(r.result as string)
          r.readAsDataURL(file)
        })
      }
      // Reflect immediately (active org + the matching membership)
      const memberships = (user.memberships ?? []).map(m =>
        m.organizationId === user.organizationId ? { ...m, organizationLogo: url } : m
      )
      updateUser({ organizationLogo: url, memberships })
      setLogo(url)
      notify('org', 'Logo updated', 'Your organization logo was changed')
    } catch (err) {
      console.warn('[Logo] upload failed:', err)
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Organization Logo" description="Shown across the app and on emails" />
        <div className="flex items-center gap-4">
          {logo ? (
            <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-2xl font-bold">
              {orgName.charAt(0)}
            </div>
          )}
          {isAdmin && (
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                {uploadingLogo ? 'Uploading…' : 'Upload logo'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={onLogoFile} disabled={uploadingLogo} />
            </label>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">Any image format (PNG, JPG, SVG, WebP…). Square works best.</p>
      </Card>

      <Card>
        <CardHeader title="Organization Profile" />
        <div className="space-y-4">
          <Input label="Organization Name" {...register('name')} disabled={!isAdmin} />
          <Input label="Contact Email" type="email" {...register('email')} disabled={!isAdmin} />
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
          <Textarea label="About" placeholder="Brief description of your organization…" rows={3} {...register('about')} disabled={!isAdmin} />
        </div>
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
          <Button variant="outline" size="sm" className="ml-auto">Manage Plan</Button>
        </div>
      </Card>

      {!isAdmin ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Only organization admins can modify organization settings.
          </p>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button onClick={handleSubmit(onSubmit)} leftIcon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}
