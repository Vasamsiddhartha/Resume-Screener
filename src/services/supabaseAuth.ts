import { supabase } from '@/lib/supabase'
import type { User, OrgMembership } from '@/types'

// Real Supabase Auth (active only when VITE_SUPABASE_URL/ANON_KEY are configured).
// Builds the app's `User` shape from the Supabase session + profile + memberships.

/** Construct the app User from the current Supabase session. Null if signed out. */
export async function buildUserFromSupabase(): Promise<User | null> {
  if (!supabase) return null

  const { data: authData } = await supabase.auth.getUser()
  const authUser = authData?.user
  if (!authUser) return null

  // Profile (auto-created by the signup trigger) + org memberships
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
    supabase
      .from('memberships')
      .select('role, organization_id, organizations(name)')
      .eq('user_id', authUser.id),
  ])

  const memberships: OrgMembership[] = (rows ?? []).map((m: Record<string, unknown>) => ({
    organizationId: m.organization_id as string,
    organizationName:
      ((m.organizations as { name?: string } | null)?.name) ?? 'Organization',
    role: m.role as OrgMembership['role'],
  }))

  const isSuper = (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true
  const active = memberships[0]

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name: (profile as { name?: string } | null)?.name || authUser.email || 'User',
    role: isSuper ? 'super_admin' : (active?.role ?? 'recruiter'),
    organizationId: active?.organizationId,
    organizationName: active?.organizationName,
    memberships,
    phone: (profile as { phone?: string } | null)?.phone ?? undefined,
    jobTitle: (profile as { job_title?: string } | null)?.job_title ?? undefined,
    createdAt: (profile as { created_at?: string } | null)?.created_at ?? new Date().toISOString(),
    isActive: true,
  }
}

/** Create the user's first organization (via SECURITY DEFINER RPC) if they have none. */
async function ensureOrganization(orgName?: string): Promise<void> {
  if (!supabase || !orgName) return
  const { data: authData } = await supabase.auth.getUser()
  const uid = authData?.user?.id
  if (!uid) return

  const { data: existing } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', uid)
    .limit(1)
  if (existing && existing.length > 0) return

  const { error } = await supabase.rpc('create_organization', {
    p_name: orgName,
    p_email: authData?.user?.email ?? null,
  })
  if (error) throw error
}

export const supabaseAuth = {
  /** Sign up; returns whether email confirmation is required before sign-in. */
  async signUp(params: { name: string; email: string; password: string; orgName: string }): Promise<{ needsConfirmation: boolean }> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: { data: { name: params.name, org_name: params.orgName } },
    })
    if (error) throw error

    // Session present ⇒ email confirmation is disabled ⇒ finish setup now
    if (data.session && data.user) {
      await supabase.from('profiles').update({ name: params.name }).eq('id', data.user.id)
      await ensureOrganization(params.orgName)
      return { needsConfirmation: false }
    }
    // Otherwise the user must confirm their email; org is created on first sign-in
    return { needsConfirmation: true }
  },

  async signIn(email: string, password: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Create the org from signup metadata if it wasn't created yet (confirmation flow)
    const { data: authData } = await supabase.auth.getUser()
    const orgName = authData?.user?.user_metadata?.org_name as string | undefined
    await ensureOrganization(orgName)
  },

  async signOut(): Promise<void> {
    if (supabase) await supabase.auth.signOut()
  },
}
