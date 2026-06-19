import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Building2, CheckCircle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { isSupabaseConfigured } from '@/lib/supabase'
import { supabaseAuth, buildUserFromSupabase } from '@/services/supabaseAuth'

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  orgName: z.string().min(2, 'Enter an organization name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type FormData = z.infer<typeof schema>

export function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [confirmSent, setConfirmSent] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    try {
      const { needsConfirmation } = await supabaseAuth.signUp(data)
      if (needsConfirmation) {
        setConfirmSent(true)
        return
      }
      // Confirmation disabled — we're signed in; load the user and enter the app
      const user = await buildUserFromSupabase()
      if (user) {
        setAuth(user, 'supabase')
        navigate('/org/dashboard')
      } else {
        navigate('/login')
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign up failed')
    }
  }

  // Sign up only works with a real backend
  if (!isSupabaseConfigured) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Sign up unavailable</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Account creation requires Supabase to be configured. Use a demo account to explore.
        </p>
        <Link to="/login" className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
          Back to login
        </Link>
      </div>
    )
  }

  if (confirmSent) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Confirm your email</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          We sent a confirmation link to your inbox. Confirm it, then sign in — your organization is set up on first login.
        </p>
        <Link to="/login" className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create your account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Start screening resumes in minutes
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          placeholder="Jane Doe"
          leftIcon={<UserIcon className="w-4 h-4" />}
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Organization name"
          placeholder="Acme Inc."
          leftIcon={<Building2 className="w-4 h-4" />}
          error={errors.orgName?.message}
          {...register('orgName')}
        />
        <Input
          label="Work email"
          type="email"
          placeholder="you@company.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
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
          Create account
        </Button>
      </form>

      <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
