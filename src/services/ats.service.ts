import type { ATSEvaluation, ATSRequestPayload, ATSResponsePayload, PaginatedResponse } from '@/types'
import { MOCK_EVALUATIONS } from '@/mock/data'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let evaluations = [...MOCK_EVALUATIONS]

// Resume scoring endpoint. Configurable via .env so it stays swappable,
// defaulting to the deployed Hugging Face Space.
const SCORE_API_URL =
  import.meta.env.VITE_SCORE_API_URL ?? 'https://siddhartha1xl-resume-screening.hf.space/score'

export const atsService = {
  async evaluate(payload: ATSRequestPayload): Promise<ATSResponsePayload> {
    // The API expects { resume, job_description } and returns
    // { similarity, ats_score, label }.
    const response = await fetch(SCORE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume: payload.resume_text,
        job_description: payload.job_description,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText)
      throw new Error(`Scoring API responded with ${response.status}: ${text}`)
    }

    const raw = await response.json()
    console.log('[ATS Score API] Raw response:', raw)

    // Tolerate both a bare object and an array-wrapped object
    const item = Array.isArray(raw) ? raw[0] : raw
    if (!item || (item.ats_score == null && item.score == null)) {
      throw new Error('Scoring API returned an unexpected response shape')
    }

    const result: ATSResponsePayload = {
      score: Number(item.ats_score ?? item.score),
      label: item.label ?? 'No Fit',
      similarity: item.similarity != null ? Number(item.similarity) : undefined,
    }

    console.log('[ATS Score API] Parsed result:', result)
    return result
  },

  async saveEvaluation(
    orgId: string,
    data: Omit<ATSEvaluation, 'id' | 'evaluatedAt'>
  ): Promise<ATSEvaluation> {
    await delay(300)
    const evaluation: ATSEvaluation = {
      id: generateId(),
      ...data,
      organizationId: orgId,
      evaluatedAt: new Date().toISOString(),
    }
    evaluations = [evaluation, ...evaluations]

    // Persist to Supabase (resume text + score). Never let a Supabase
    // failure break the evaluation flow — just log it.
    if (supabase) {
      const { error } = await supabase.from('resume_evaluations').insert({
        resume_text: data.resumeText,
        score: data.score,
      })
      if (error) {
        console.error('[Supabase] Failed to store evaluation:', error.message)
      } else {
        console.log('[Supabase] Evaluation stored (resume_text, score)')
      }
    }

    return evaluation
  },

  async getAll(orgId: string, params?: { page?: number; perPage?: number; search?: string; jobId?: string; label?: string }): Promise<PaginatedResponse<ATSEvaluation>> {
    await delay(400)
    let filtered = evaluations.filter(e => e.organizationId === orgId)

    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(e =>
        e.candidateName.toLowerCase().includes(q) || e.jobTitle.toLowerCase().includes(q)
      )
    }
    if (params?.jobId && params.jobId !== 'all') {
      filtered = filtered.filter(e => e.jobId === params.jobId)
    }
    if (params?.label && params.label !== 'all') {
      filtered = filtered.filter(e => e.label === params.label)
    }

    filtered.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())

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

  async getById(id: string): Promise<ATSEvaluation> {
    await delay(300)
    const ev = evaluations.find(e => e.id === id)
    if (!ev) throw new Error('Evaluation not found')
    return ev
  },
}
