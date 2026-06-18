import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { authService } from '@/services/auth.service'

export function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token') ?? 'mock-token'
    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="text-center">
      {status === 'loading' && (
        <>
          <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Verifying email…</h1>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Email verified!</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Your email has been confirmed. You can now sign in.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center h-10 px-6 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Verification failed</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            This link may have expired or already been used.
          </p>
          <Link
            to="/login"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            Back to login
          </Link>
        </>
      )}
    </div>
  )
}
