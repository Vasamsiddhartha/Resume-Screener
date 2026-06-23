import type { Job, CreateJobPayload, PaginatedResponse } from '@/types'
import { MOCK_JOBS } from '@/mock/data'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { rowToJob } from './mappers'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let jobs = [...MOCK_JOBS]

function paginate<T>(items: T[], page = 1, perPage = 100): PaginatedResponse<T> {
  const start = (page - 1) * perPage
  return { data: items.slice(start, start + perPage), total: items.length, page, perPage }
}

export const jobService = {
  async getAll(orgId: string, params?: { page?: number; perPage?: number; search?: string; status?: string }): Promise<PaginatedResponse<Job>> {
    if (supabase) {
      let q = supabase.from('jobs').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
      if (params?.status && params.status !== 'all') q = q.eq('status', params.status)
      if (params?.search) q = q.ilike('title', `%${params.search}%`)
      const { data, error } = await q
      if (error) throw error
      return paginate((data ?? []).map(rowToJob), params?.page, params?.perPage)
    }

    await delay(400)
    let filtered = jobs.filter(j => j.organizationId === orgId)
    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter(j => j.title.toLowerCase().includes(s) || j.department.toLowerCase().includes(s))
    }
    if (params?.status && params.status !== 'all') filtered = filtered.filter(j => j.status === params.status)
    return paginate(filtered, params?.page, params?.perPage)
  },

  async getById(id: string): Promise<Job> {
    if (supabase) {
      const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single()
      if (error) throw error
      return rowToJob(data)
    }
    await delay(300)
    const job = jobs.find(j => j.id === id)
    if (!job) throw new Error('Job not found')
    return job
  },

  async create(orgId: string, payload: CreateJobPayload): Promise<Job> {
    if (supabase) {
      const { data, error } = await supabase.from('jobs').insert({
        organization_id: orgId,
        organization_name: payload.organizationName ?? null,
        title: payload.title,
        department: payload.department,
        location: payload.location,
        experience_required: payload.experienceRequired,
        employment_type: payload.employmentType,
        description: payload.description,
        status: 'active',
      }).select().single()
      if (error) throw error
      return rowToJob(data)
    }

    await delay(600)
    const newJob: Job = {
      id: generateId(),
      organizationId: orgId,
      organizationName: payload.organizationName,
      title: payload.title,
      department: payload.department,
      location: payload.location,
      experienceRequired: payload.experienceRequired,
      employmentType: payload.employmentType,
      description: payload.description,
      status: 'active',
      candidateCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    jobs = [newJob, ...jobs]
    return newJob
  },

  async update(id: string, payload: Partial<Job>): Promise<Job> {
    if (supabase) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (payload.title !== undefined) patch.title = payload.title
      if (payload.department !== undefined) patch.department = payload.department
      if (payload.location !== undefined) patch.location = payload.location
      if (payload.experienceRequired !== undefined) patch.experience_required = payload.experienceRequired
      if (payload.employmentType !== undefined) patch.employment_type = payload.employmentType
      if (payload.description !== undefined) patch.description = payload.description
      if (payload.status !== undefined) patch.status = payload.status
      const { data, error } = await supabase.from('jobs').update(patch).eq('id', id).select().single()
      if (error) throw error
      return rowToJob(data)
    }
    await delay(500)
    const idx = jobs.findIndex(j => j.id === id)
    if (idx === -1) throw new Error('Job not found')
    jobs[idx] = { ...jobs[idx], ...payload, updatedAt: new Date().toISOString() }
    return jobs[idx]
  },

  async archive(id: string): Promise<Job> {
    return this.update(id, { status: 'archived' })
  },

  async delete(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('jobs').delete().eq('id', id)
      if (error) throw error
      return
    }
    await delay(400)
    jobs = jobs.filter(j => j.id !== id)
  },
}
