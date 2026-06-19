import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// Treat the placeholder URL as "not configured" so the app runs fine
// before real credentials are added.
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('<your-project-id>') && !anonKey.startsWith('your_')
)

// NOTE: untyped client for now. In the service-migration phase, generate exact
// types with `npx supabase gen types typescript` and pass createClient<Database>.
// The hand-written src/types/database.ts documents the schema in the meantime.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

if (!isSupabaseConfigured) {
  console.info('[Supabase] Not configured — evaluations will not be persisted to Supabase.')
}
