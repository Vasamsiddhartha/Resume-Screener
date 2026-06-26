import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/router'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { buildUserFromSupabase } from '@/services/supabaseAuth'
import { useAuthStore } from '@/store/auth.store'
import { PageSpinner } from '@/components/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

// Restore the Supabase session on load + keep the auth store in sync with it.
function useSupabaseSession() {
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const { setAuth, clearAuth } = useAuthStore()

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    let active = true
    // Never let a slow/misconfigured Supabase hang the whole app on boot.
    const withTimeout = <T,>(p: Promise<T>, ms: number) =>
      Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), ms))])

    ;(async () => {
      try {
        const result = await withTimeout(supabase.auth.getSession(), 6000)
        if (!active) return
        if (result?.data?.session) {
          const user = await withTimeout(buildUserFromSupabase(), 6000)
          if (user) setAuth(user, 'supabase')
          else clearAuth()
        } else {
          clearAuth()
        }
      } catch {
        if (active) clearAuth()
      } finally {
        if (active) setReady(true)
      }
    })()

    // React to sign-out elsewhere — clear local state only (no signOut → no loop)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') clearAuth()
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ready
}

export default function App() {
  const ready = useSupabaseSession()

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <PageSpinner />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
