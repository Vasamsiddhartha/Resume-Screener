import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User as UserIcon, Mail } from 'lucide-react'
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

  // Email comes from the invite link (?email=...)
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const email = params.get('email') ?? ''

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    try {
      // Sign up with the invited email — membership comes from the pending invitation
      const { needsConfirmation } = await supabaseAuth.signUp({
        name: data.name,
        email,
        password: data.password,
      })
      if (needsConfirmation) {
        navigate('/login')
        return
      }
      const user = await buildUserFromSupabase()
      if (user) {
        setAuth(user, 'supabase')
        navigate('/org/dashboard')
      } else {
        navigate('/login')
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not accept invite'
      setServerError(/already registered/i.test(raw)
        ? 'You already have an account. Please sign in instead.'
        : raw)
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
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Set a password to join your team</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Email" value={email} disabled leftIcon={<Mail className="w-4 h-4" />} readOnly />
        <Input label="Full name" placeholder="Jane Doe" leftIcon={<UserIcon className="w-4 h-4" />}
          error={errors.name?.message} {...register('name')} />
        <Input
          label="Create password"
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
