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
      .select('role, organization_id, organizations(name, logo_url)')
      .eq('user_id', authUser.id),
  ])

  const memberships: OrgMembership[] = (rows ?? []).map((m: Record<string, unknown>) => ({
    organizationId: m.organization_id as string,
    organizationName:
      ((m.organizations as { name?: string } | null)?.name) ?? 'Organization',
    organizationLogo: (m.organizations as { logo_url?: string } | null)?.logo_url ?? undefined,
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
    organizationLogo: active?.organizationLogo,
    memberships,
    phone: (profile as { phone?: string } | null)?.phone ?? undefined,
    jobTitle: (profile as { job_title?: string } | null)?.job_title ?? undefined,
    createdAt: (profile as { created_at?: string } | null)?.created_at ?? new Date().toISOString(),
    isActive: true,
  }
}

/** Ensure the user belongs to an org. Priority:
 *  1) accept a pending invitation (join an existing org), else
 *  2) create a new org from `orgName` (normal signup).
 *  Plain inserts only — no DB function. */
/** Re-create the signed-in user's profile row if it's missing. memberships.user_id
 *  has a FK to profiles(id); if the profile was deleted directly in the DB (but the
 *  auth.users row remains), any membership/org insert would fail with a FK error.
 *  Insert-if-absent only — never overwrites an existing profile's edited fields. */
async function healOwnProfile(): Promise<void> {
  if (!supabase) return
  const { data: authData } = await supabase.auth.getUser()
  const u = authData?.user
  if (!u) return
  await supabase.from('profiles').upsert(
    { id: u.id, email: u.email ?? null, name: (u.user_metadata?.name as string) || u.email || 'User' },
    { onConflict: 'id', ignoreDuplicates: true }
  )
}

async function ensureMembership(orgName?: string): Promise<void> {
  if (!supabase) return
  const { data: authData } = await supabase.auth.getUser()
  const uid = authData?.user?.id
  const email = authData?.user?.email
  if (!uid) return

  // Make sure the profile row exists before any membership insert (FK dependency).
  await healOwnProfile()

  // Orgs the user already belongs to (don't early-return — an existing account
  // can still have a pending invite to a DIFFERENT org that must be accepted).
  const { data: mems } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', uid)
  const memberOrgIds = new Set((mems ?? []).map((m: { organization_id: string }) => m.organization_id))

  // 1) Pending invitation for this email → join that org with the invited role.
  //    Skip invites for orgs the user is already in (supports multi-org accept).
  if (email) {
    const { data: invites } = await supabase
      .from('invitations')
      .select('*')
      .eq('status', 'pending')
      .ilike('email', email)
    const invite = (invites ?? []).find(
      (i: { organization_id: string }) => !memberOrgIds.has(i.organization_id)
    )
    if (invite) {
      const { error: memErr } = await supabase.from('memberships').insert({
        user_id: uid,
        organization_id: invite.organization_id,
        organization_name: invite.organization_name,
        role: invite.role,
      })
      if (memErr) throw memErr
      await supabase.from('invitations').update({ status: 'accepted' }).eq('id', invite.id)
      return
    }
  }

  // 2) Fresh signup (no memberships yet) with an org name → create org, become admin
  if (memberOrgIds.size === 0 && orgName) {
    const slug =
      orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 8)

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: orgName.trim(), slug, email: email ?? null })
      .select('id')
      .single()
    if (orgErr) throw orgErr

    const { error: memErr } = await supabase.from('memberships').insert({
      user_id: uid,
      organization_id: org.id,
      organization_name: orgName.trim(),
      role: 'org_admin',
    })
    if (memErr) throw memErr
  }
}

export const supabaseAuth = {
  /** Sign up; returns whether email confirmation is required before sign-in.
   *  Omit orgName when accepting an invitation (membership comes from the invite). */
  async signUp(params: { name: string; email: string; password: string; orgName?: string }): Promise<{ needsConfirmation: boolean }> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: { data: { name: params.name, org_name: params.orgName ?? '' } },
    })
    if (error) throw error

    // Session present ⇒ email confirmation is disabled ⇒ finish setup now
    if (data.session && data.user) {
      await supabase.from('profiles').update({ name: params.name }).eq('id', data.user.id)
      await ensureMembership(params.orgName)
      return { needsConfirmation: false }
    }
    // Otherwise the user must confirm their email; membership is set on first sign-in
    return { needsConfirmation: true }
  },

  async signIn(email: string, password: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // On first sign-in: accept a pending invite, or create the org from signup metadata
    const { data: authData } = await supabase.auth.getUser()
    const orgName = authData?.user?.user_metadata?.org_name as string | undefined
    await ensureMembership(orgName || undefined)
  },

  async signOut(): Promise<void> {
    if (supabase) await supabase.auth.signOut()
  },

  /** Create an additional organization for the CURRENT logged-in user.
   *  This is how one account owns many orgs (no re-signup). */
  async createOrganization(name: string): Promise<{ id: string; name: string }> {
    if (!supabase) throw new Error('Supabase is not configured')
    const { data: authData } = await supabase.auth.getUser()
    const uid = authData?.user?.id
    if (!uid) throw new Error('You must be signed in')

    // Heal a deleted profile first — membership insert FK-depends on it.
    await healOwnProfile()

    const slug =
      name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' + Math.random().toString(36).slice(2, 8)

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name: name.trim(), slug, email: authData?.user?.email ?? null })
      .select('id, name')
      .single()
    if (error) throw error

    const { error: memErr } = await supabase.from('memberships').insert({
      user_id: uid,
      organization_id: org.id,
      organization_name: name.trim(),
      role: 'org_admin',
    })
    if (memErr) throw memErr

    return { id: org.id, name: org.name }
  },
}
