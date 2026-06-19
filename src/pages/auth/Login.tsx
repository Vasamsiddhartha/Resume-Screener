import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'superadmin@atsscorer.io', password: 'password' },
  { label: 'Org Admin', email: 'admin@techcorp.com', password: 'password' },
  { label: 'Recruiter', email: 'recruiter@techcorp.com', password: 'password' },
]

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    try {
      const { user, token } = await authService.login(data)
      setAuth(user, token)
      if (user.role === 'super_admin') {
        navigate('/super-admin/dashboard')
      } else if ((user.memberships?.length ?? 0) > 1) {
        // Multi-org user picks which organization to enter
        navigate('/select-organization')
      } else {
        navigate('/org/dashboard')
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Sign in to your ATS Scorer account
        </p>
      </div>

      {/* Demo accounts */}
      <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">Demo Accounts</p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setValue('email', acc.email)
                setValue('password', acc.password)
              }}
              className="text-xs px-2.5 py-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(s => !s)} className="cursor-pointer">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end mt-1.5">
            <Link
              to="/forgot-password"
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {serverError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </div>
  )
}
