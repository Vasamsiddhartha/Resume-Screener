import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// A valid Supabase API URL looks like https://<project-ref>.supabase.co
// (NOT the dashboard URL https://supabase.com/dashboard/project/...).
const isApiUrl =
  /^https:\/\/[a-z0-9-]+\.supabase\.(co|in|net)$/i.test(url) ||
  url.includes('localhost') ||
  url.includes('127.0.0.1')

if (url.includes('supabase.com/dashboard')) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL is a DASHBOARD url. Use the API url instead — ' +
    'Settings → API → Project URL, e.g. https://<project-ref>.supabase.co'
  )
}

// Treat placeholder / malformed URLs as "not configured" so the app keeps
// working (on the mock backend) instead of hanging on a bad endpoint.
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('<your-project-id>') && !anonKey.startsWith('your_') && isApiUrl
)

// NOTE: untyped client for now. In the service-migration phase, generate exact
// types with `npx supabase gen types typescript` and pass createClient<Database>.
// The hand-written src/types/database.ts documents the schema in the meantime.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

if (!isSupabaseConfigured) {
  console.info('[Supabase] Not configured — evaluations will not be persisted to Supabase.')
}
