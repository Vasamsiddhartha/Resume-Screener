import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// Treat the placeholder URL as "not configured" so the app runs fine
// before real credentials are added.
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('<your-project-id>') && !anonKey.startsWith('your_')
)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

if (!isSupabaseConfigured) {
  console.info('[Supabase] Not configured — evaluations will not be persisted to Supabase.')
}
