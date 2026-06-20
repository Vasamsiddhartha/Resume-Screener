import type { TeamMember, InviteUserPayload } from '@/types'
import { MOCK_TEAM_MEMBERS } from '@/mock/data'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mailService } from '@/services/mail.service'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let members = [...MOCK_TEAM_MEMBERS]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function acceptInviteUrl(email: string): string {
  // HashRouter URL the invited person uses to set a password
  return `${window.location.origin}${window.location.pathname}#/accept-invite?email=${encodeURIComponent(email)}`
}

export const teamService = {
  async getMembers(orgId: string): Promise<TeamMember[]> {
    if (supabase) {
      // Active members (memberships joined to profiles) + pending invitations
      const [{ data: mems }, { data: invites }] = await Promise.all([
        supabase
          .from('memberships')
          .select('id, role, organization_id, organization_name, created_at, profiles(name, email)')
          .eq('organization_id', orgId),
        supabase
          .from('invitations')
          .select('*')
          .eq('organization_id', orgId)
          .eq('status', 'pending'),
      ])

      const active: TeamMember[] = (mems ?? []).map((m: Row) => ({
        id: m.id,
        organizationId: m.organization_id,
        name: m.profiles?.name || m.profiles?.email || 'Member',
        email: m.profiles?.email || '',
        role: m.role,
        isActive: true,
        joinedAt: m.created_at,
      }))

      const pending: TeamMember[] = (invites ?? []).map((i: Row) => ({
        id: i.id,
        organizationId: i.organization_id,
        name: i.email.split('@')[0].replace(/[._]/g, ' '),
        email: i.email,
        role: i.role,
        isActive: false,
        joinedAt: i.created_at,
      }))

      return [...active, ...pending]
    }

    await delay(400)
    return members.filter(m => m.organizationId === orgId)
  },

  async invite(orgId: string, payload: InviteUserPayload & { organizationName?: string }): Promise<TeamMember> {
    if (supabase) {
      const { data: authData } = await supabase.auth.getUser()
      // Save the invitation row (needed for the accept flow)
      const { data: row, error } = await supabase
        .from('invitations')
        .insert({
          organization_id: orgId,
          organization_name: payload.organizationName ?? null,
          email: payload.email,
          role: payload.role,
          invited_by: authData?.user?.id ?? null,
        })
        .select()
        .single()

      // Send the invite email REGARDLESS of the DB result — same mechanism as the
      // signup welcome email. (mailService catches its own errors and never throws.)
      const sent = await mailService.send({
        to: payload.email,
        subject: `You're invited to ${payload.organizationName ?? 'an organization'} on ATS Scanner`,
        html: `<p>You've been invited as <strong>${payload.role === 'org_admin' ? 'Admin' : 'Recruiter'}</strong>.</p>
               <p>Click below to set your password and join:</p>
               <p><a href="${acceptInviteUrl(payload.email)}">Accept invitation &amp; set password</a></p>`,
      })

      // Surface a clear reason if the invitation couldn't be saved
      if (error) {
        throw new Error(
          `${sent ? 'Invite email sent, but' : 'Could not'} save the invitation: ${error.message}. ` +
          `If this mentions a missing table/column, run supabase/migrations/0004_app_data.sql.`
        )
      }

      return {
        id: row.id,
        organizationId: orgId,
        name: payload.email.split('@')[0].replace(/[._]/g, ' '),
        email: payload.email,
        role: payload.role,
        isActive: false,
        joinedAt: row.created_at,
      }
    }

    await delay(800)
    const existing = members.find(m => m.email === payload.email && m.organizationId === orgId)
    if (existing) throw new Error('User with this email already exists in the organization')
    const newMember: TeamMember = {
      id: generateId(),
      organizationId: orgId,
      name: payload.email.split('@')[0].replace(/[._]/g, ' '),
      email: payload.email,
      role: payload.role,
      isActive: false,
      joinedAt: new Date().toISOString(),
    }
    members = [...members, newMember]
    return newMember
  },

  async updateRole(id: string, role: TeamMember['role']): Promise<TeamMember> {
    if (supabase) {
      const { data, error } = await supabase.from('memberships').update({ role }).eq('id', id).select().single()
      if (error) throw error
      return {
        id: data.id, organizationId: data.organization_id, name: '', email: '',
        role: data.role, isActive: true, joinedAt: data.created_at,
      }
    }
    await delay(400)
    const idx = members.findIndex(m => m.id === id)
    if (idx === -1) throw new Error('Member not found')
    members[idx] = { ...members[idx], role }
    return members[idx]
  },

  async remove(id: string, isPending = false): Promise<void> {
    if (supabase) {
      const table = isPending ? 'invitations' : 'memberships'
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      return
    }
    await delay(400)
    members = members.filter(m => m.id !== id)
  },
}
