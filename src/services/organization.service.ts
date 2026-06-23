import type { Organization, CreateOrganizationPayload, PaginatedResponse } from '@/types'
import { MOCK_ORGANIZATIONS } from '@/mock/data'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let organizations = [...MOCK_ORGANIZATIONS]

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function mapOrg(o: Row, counts?: { members?: number; jobs?: number; evaluations?: number }): Organization {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    email: o.email ?? '',
    logo: o.logo_url ?? undefined,
    status: o.status,
    plan: o.plan,
    memberCount: counts?.members ?? 0,
    jobCount: counts?.jobs ?? 0,
    evaluationCount: counts?.evaluations ?? 0,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  }
}

// Count rows by organization_id from a list of {organization_id} rows
function tally(rows: Row[] | null | undefined): Record<string, number> {
  const map: Record<string, number> = {}
  for (const r of rows ?? []) map[r.organization_id] = (map[r.organization_id] ?? 0) + 1
  return map
}

export const organizationService = {
  async getAll(params?: { page?: number; perPage?: number; search?: string; status?: string }): Promise<PaginatedResponse<Organization>> {
    if (supabase) {
      // Super admin reads every org (RLS allows is_super_admin); usage counts are
      // tallied client-side from lightweight id-only selects across all tenants.
      const [{ data: orgs, error }, { data: mems }, { data: jobs }, { data: evals }] = await Promise.all([
        supabase.from('organizations').select('*').order('created_at', { ascending: false }),
        supabase.from('memberships').select('organization_id'),
        supabase.from('jobs').select('organization_id'),
        supabase.from('evaluations').select('organization_id'),
      ])
      if (error) throw error

      const memCount = tally(mems)
      const jobCount = tally(jobs)
      const evalCount = tally(evals)

      let mapped = (orgs ?? []).map((o: Row) =>
        mapOrg(o, { members: memCount[o.id], jobs: jobCount[o.id], evaluations: evalCount[o.id] })
      )

      if (params?.search) {
        const q = params.search.toLowerCase()
        mapped = mapped.filter(o => o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))
      }
      if (params?.status && params.status !== 'all') {
        mapped = mapped.filter(o => o.status === params.status)
      }

      const page = params?.page ?? 1
      const perPage = params?.perPage ?? 10
      const start = (page - 1) * perPage
      return { data: mapped.slice(start, start + perPage), total: mapped.length, page, perPage }
    }

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
    if (supabase) {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', id).single()
      if (error) throw error
      return mapOrg(data)
    }
    await delay(300)
    const org = organizations.find(o => o.id === id)
    if (!org) throw new Error('Organization not found')
    return org
  },

  async create(payload: CreateOrganizationPayload): Promise<Organization> {
    if (supabase) {
      const { data, error } = await supabase
        .from('organizations')
        .insert({ name: payload.name, slug: slugify(payload.name), email: payload.email, plan: payload.plan })
        .select('*')
        .single()
      if (error) throw error
      return mapOrg(data)
    }
    await delay(600)
    const newOrg: Organization = {
      id: generateId(),
      name: payload.name,
      slug: slugify(payload.name),
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
    if (supabase) {
      const patch: Row = { updated_at: new Date().toISOString() }
      if (payload.name !== undefined) patch.name = payload.name
      if (payload.email !== undefined) patch.email = payload.email
      if (payload.status !== undefined) patch.status = payload.status
      if (payload.plan !== undefined) patch.plan = payload.plan
      if (payload.logo !== undefined) patch.logo_url = payload.logo
      const { data, error } = await supabase.from('organizations').update(patch).eq('id', id).select('*').single()
      if (error) throw error
      return mapOrg(data)
    }
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
    if (supabase) {
      const { error } = await supabase.from('organizations').delete().eq('id', id)
      if (error) throw error
      return
    }
    await delay(400)
    organizations = organizations.filter(o => o.id !== id)
  },
}
