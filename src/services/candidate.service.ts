import type { Candidate, CreateCandidatePayload, PaginatedResponse } from '@/types'
import { MOCK_CANDIDATES } from '@/mock/data'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { rowToCandidate } from './mappers'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let candidates = [...MOCK_CANDIDATES]

function paginate<T>(items: T[], page = 1, perPage = 100): PaginatedResponse<T> {
  const start = (page - 1) * perPage
  return { data: items.slice(start, start + perPage), total: items.length, page, perPage }
}

type CandidateExtras = Partial<Pick<Candidate, 'appliedJobTitle' | 'latestScore' | 'latestLabel' | 'status' | 'resumeText'>>

export const candidateService = {
  async getAll(orgId: string, params?: { page?: number; perPage?: number; search?: string; status?: string; jobId?: string; label?: string }): Promise<PaginatedResponse<Candidate>> {
    if (supabase) {
      let q = supabase.from('candidates').select('*').eq('organization_id', orgId).order('latest_score', { ascending: false, nullsFirst: false })
      if (params?.status && params.status !== 'all') q = q.eq('status', params.status)
      if (params?.jobId && params.jobId !== 'all') q = q.eq('applied_job_id', params.jobId)
      if (params?.label && params.label !== 'all') q = q.eq('latest_label', params.label)
      if (params?.search) q = q.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`)
      const { data, error } = await q
      if (error) throw error
      return paginate((data ?? []).map(rowToCandidate), params?.page, params?.perPage)
    }

    await delay(400)
    let filtered = candidates.filter(c => c.organizationId === orgId)
    if (params?.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter(c => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s))
    }
    if (params?.status && params.status !== 'all') filtered = filtered.filter(c => c.status === params.status)
    if (params?.jobId && params.jobId !== 'all') filtered = filtered.filter(c => c.appliedJobId === params.jobId)
    if (params?.label && params.label !== 'all') filtered = filtered.filter(c => c.latestLabel === params.label)
    filtered.sort((a, b) => (b.latestScore ?? 0) - (a.latestScore ?? 0))
    return paginate(filtered, params?.page, params?.perPage)
  },

  async getById(id: string): Promise<Candidate> {
    if (supabase) {
      const { data, error } = await supabase.from('candidates').select('*').eq('id', id).single()
      if (error) throw error
      return rowToCandidate(data)
    }
    await delay(300)
    const candidate = candidates.find(c => c.id === id)
    if (!candidate) throw new Error('Candidate not found')
    return candidate
  },

  async create(orgId: string, payload: CreateCandidatePayload & CandidateExtras): Promise<Candidate> {
    if (supabase) {
      const { data, error } = await supabase.from('candidates').insert({
        organization_id: orgId,
        organization_name: payload.organizationName ?? null,
        name: payload.name,
        email: payload.email || null,
        phone: payload.phone || null,
        applied_job_id: payload.appliedJobId ?? null,
        applied_job_title: payload.appliedJobTitle ?? null,
        latest_score: payload.latestScore ?? null,
        latest_label: payload.latestLabel ?? null,
        resume_text: payload.resumeText ?? null,
        status: payload.status ?? 'new',
      }).select().single()
      if (error) throw error
      return rowToCandidate(data)
    }

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
    if (supabase) {
      const patch: Record<string, unknown> = {}
      if (payload.status !== undefined) patch.status = payload.status
      if (payload.latestScore !== undefined) patch.latest_score = payload.latestScore
      if (payload.latestLabel !== undefined) patch.latest_label = payload.latestLabel
      if (payload.name !== undefined) patch.name = payload.name
      if (payload.email !== undefined) patch.email = payload.email
      if (payload.phone !== undefined) patch.phone = payload.phone
      if (payload.resumeUrl !== undefined) patch.resume_path = payload.resumeUrl
      if (payload.resumeText !== undefined) patch.resume_text = payload.resumeText
      if (payload.appliedJobId !== undefined) patch.applied_job_id = payload.appliedJobId
      if (payload.appliedJobTitle !== undefined) patch.applied_job_title = payload.appliedJobTitle
      const { data, error } = await supabase.from('candidates').update(patch).eq('id', id).select().single()
      if (error) throw error
      return rowToCandidate(data)
    }
    await delay(500)
    const idx = candidates.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Candidate not found')
    candidates[idx] = { ...candidates[idx], ...payload }
    return candidates[idx]
  },

  async delete(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('candidates').delete().eq('id', id)
      if (error) throw error
      return
    }
    await delay(400)
    candidates = candidates.filter(c => c.id !== id)
  },
}
