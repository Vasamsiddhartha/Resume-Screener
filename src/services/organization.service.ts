import type { Organization, CreateOrganizationPayload, PaginatedResponse } from '@/types'
import { MOCK_ORGANIZATIONS } from '@/mock/data'
import { generateId } from '@/lib/utils'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let organizations = [...MOCK_ORGANIZATIONS]

export const organizationService = {
  async getAll(params?: { page?: number; perPage?: number; search?: string; status?: string }): Promise<PaginatedResponse<Organization>> {
    await delay(400)
    let filtered = [...organizations]

    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q)
      )
    }
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter(o => o.status === params.status)
    }

    const page = params?.page ?? 1
    const perPage = params?.perPage ?? 10
    const start = (page - 1) * perPage
    return {
      data: filtered.slice(start, start + perPage),
      total: filtered.length,
      page,
      perPage,
    }
  },

  async getById(id: string): Promise<Organization> {
    await delay(300)
    const org = organizations.find(o => o.id === id)
    if (!org) throw new Error('Organization not found')
    return org
  },

  async create(payload: CreateOrganizationPayload): Promise<Organization> {
    await delay(600)
    const newOrg: Organization = {
      id: generateId(),
      name: payload.name,
      slug: payload.name.toLowerCase().replace(/\s+/g, '-'),
      email: payload.email,
      status: 'active',
      plan: payload.plan,
      memberCount: 0,
      jobCount: 0,
      evaluationCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    organizations = [newOrg, ...organizations]
    return newOrg
  },

  async update(id: string, payload: Partial<Organization>): Promise<Organization> {
    await delay(500)
    const idx = organizations.findIndex(o => o.id === id)
    if (idx === -1) throw new Error('Organization not found')
    organizations[idx] = { ...organizations[idx], ...payload, updatedAt: new Date().toISOString() }
    return organizations[idx]
  },

  async suspend(id: string): Promise<Organization> {
    return this.update(id, { status: 'suspended' })
  },

  async activate(id: string): Promise<Organization> {
    return this.update(id, { status: 'active' })
  },

  async delete(id: string): Promise<void> {
    await delay(400)
    organizations = organizations.filter(o => o.id !== id)
  },
}
