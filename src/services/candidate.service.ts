import type { Candidate, CreateCandidatePayload, PaginatedResponse } from '@/types'
import { MOCK_CANDIDATES } from '@/mock/data'
import { generateId } from '@/lib/utils'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let candidates = [...MOCK_CANDIDATES]

export const candidateService = {
  async getAll(orgId: string, params?: { page?: number; perPage?: number; search?: string; status?: string; jobId?: string; label?: string }): Promise<PaginatedResponse<Candidate>> {
    await delay(400)
    let filtered = candidates.filter(c => c.organizationId === orgId)

    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      )
    }
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter(c => c.status === params.status)
    }
    if (params?.jobId && params.jobId !== 'all') {
      filtered = filtered.filter(c => c.appliedJobId === params.jobId)
    }
    if (params?.label && params.label !== 'all') {
      filtered = filtered.filter(c => c.latestLabel === params.label)
    }

    filtered.sort((a, b) => (b.latestScore ?? 0) - (a.latestScore ?? 0))

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

  async getById(id: string): Promise<Candidate> {
    await delay(300)
    const candidate = candidates.find(c => c.id === id)
    if (!candidate) throw new Error('Candidate not found')
    return candidate
  },

  async create(
    orgId: string,
    payload: CreateCandidatePayload &
      Partial<Pick<Candidate, 'appliedJobTitle' | 'latestScore' | 'latestLabel' | 'status' | 'resumeText'>>
  ): Promise<Candidate> {
    await delay(600)
    const newCandidate: Candidate = {
      id: generateId(),
      organizationId: orgId,
      status: 'new',
      createdAt: new Date().toISOString(),
      ...payload,
    }
    candidates = [newCandidate, ...candidates]
    return newCandidate
  },

  async update(id: string, payload: Partial<Candidate>): Promise<Candidate> {
    await delay(500)
    const idx = candidates.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Candidate not found')
    candidates[idx] = { ...candidates[idx], ...payload }
    return candidates[idx]
  },

  async delete(id: string): Promise<void> {
    await delay(400)
    candidates = candidates.filter(c => c.id !== id)
  },
}
