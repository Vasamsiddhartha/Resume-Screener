import type { TeamMember, InviteUserPayload } from '@/types'
import { MOCK_TEAM_MEMBERS } from '@/mock/data'
import { generateId } from '@/lib/utils'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let members = [...MOCK_TEAM_MEMBERS]

export const teamService = {
  async getMembers(orgId: string): Promise<TeamMember[]> {
    await delay(400)
    return members.filter(m => m.organizationId === orgId)
  },

  async invite(orgId: string, payload: InviteUserPayload): Promise<TeamMember> {
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
    await delay(400)
    const idx = members.findIndex(m => m.id === id)
    if (idx === -1) throw new Error('Member not found')
    members[idx] = { ...members[idx], role }
    return members[idx]
  },

  async remove(id: string): Promise<void> {
    await delay(400)
    members = members.filter(m => m.id !== id)
  },
}
