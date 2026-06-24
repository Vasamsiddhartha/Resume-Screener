import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User as UserIcon, Mail, Building2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { isSupabaseConfigured } from '@/lib/supabase'
import { supabaseAuth, buildUserFromSupabase } from '@/services/supabaseAuth'

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type FormData = z.infer<typeof schema>

export function AcceptInvitePage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  // Details come from the invite link (?email=...&org=...&role=...)
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const email = params.get('email') ?? ''
  const orgName = params.get('org') ?? ''
  const roleParam = params.get('role') ?? ''
  const roleLabel = roleParam === 'org_admin' ? 'Admin' : roleParam === 'recruiter' ? 'Recruiter' : ''

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function enterApp() {
    const user = await buildUserFromSupabase()
    if (user) {
      setAuth(user, 'supabase')
      // Joining a 2nd+ org → let them pick which workspace to open
      navigate((user.memberships?.length ?? 0) > 1 ? '/select-organization' : '/org/dashboard')
    } else {
      navigate('/login')
    }
  }

  async function onSubmit(data: FormData) {
    setServerError('')
    try {
      // First-time user: create the account; membership comes from the pending invite
      const { needsConfirmation } = await supabaseAuth.signUp({
        name: data.name,
        email,
        password: data.password,
      })
      if (needsConfirmation) {
        navigate('/login')
        return
      }
      await enterApp()
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not accept invite'
      // Email already has an account (invited by another org). Treat the password
      // field as their EXISTING password: sign in, which accepts the pending invite.
      if (/already registered|already exists|user_already_exists/i.test(raw)) {
        try {
          await supabaseAuth.signIn(email, data.password)
          await enterApp()
          return
        } catch (signInErr) {
          const m = signInErr instanceof Error ? signInErr.message : ''
          setServerError(
            /invalid login|invalid credentials/i.test(m)
              ? `You already have an account. Enter your existing password to join ${orgName || 'this organization'}.`
              : (m || 'Could not join the organization')
          )
          return
        }
      }
      setServerError(raw)
    }
  }

  if (!isSupabaseConfigured || !email) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Invalid invitation link</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          This invite link is missing information. Ask your admin to resend it.
        </p>
        <Link to="/login" className="text-sm text-violet-600 dark:text-violet-400 hover:underline">Back to login</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Accept your invitation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {orgName
            ? <>You've been invited to join <strong className="text-slate-700 dark:text-slate-300">{orgName}</strong>{roleLabel ? <> as <strong className="text-slate-700 dark:text-slate-300">{roleLabel}</strong></> : ''}.</>
            : 'Set a password to join your team'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {orgName && (
          <Input label="Organization" value={roleLabel ? `${orgName} · ${roleLabel}` : orgName} disabled readOnly leftIcon={<Building2 className="w-4 h-4" />} />
        )}
        <Input label="Email" value={email} disabled leftIcon={<Mail className="w-4 h-4" />} readOnly />
        <Input label="Full name" placeholder="Jane Doe" leftIcon={<UserIcon className="w-4 h-4" />}
          error={errors.name?.message} {...register('name')} />
        <Input
          label="Password"
          hint="New here? This becomes your password. Already have an account? Enter your existing password to join this organization."
          type={showPassword ? 'text' : 'password'}
          placeholder="Min. 8 characters"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowPassword(s => !s)} className="cursor-pointer">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        {serverError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          Set password & join
        </Button>
      </form>
    </div>
  )
}
