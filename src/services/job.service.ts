import type { Job, CreateJobPayload, PaginatedResponse } from '@/types'
import { MOCK_JOBS } from '@/mock/data'
import { generateId } from '@/lib/utils'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let jobs = [...MOCK_JOBS]

export const jobService = {
  async getAll(orgId: string, params?: { page?: number; perPage?: number; search?: string; status?: string }): Promise<PaginatedResponse<Job>> {
    await delay(400)
    let filtered = jobs.filter(j => j.organizationId === orgId)

    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(j =>
        j.title.toLowerCase().includes(q) || j.department.toLowerCase().includes(q)
      )
    }
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter(j => j.status === params.status)
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

  async getById(id: string): Promise<Job> {
    await delay(300)
    const job = jobs.find(j => j.id === id)
    if (!job) throw new Error('Job not found')
    return job
  },

  async create(orgId: string, payload: CreateJobPayload): Promise<Job> {
    await delay(600)
    const newJob: Job = {
      id: generateId(),
      organizationId: orgId,
      ...payload,
      status: 'active',
      candidateCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    jobs = [newJob, ...jobs]
    return newJob
  },

  async update(id: string, payload: Partial<Job>): Promise<Job> {
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
    await delay(400)
    jobs = jobs.filter(j => j.id !== id)
  },
}
