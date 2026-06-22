import type { ATSEvaluation, ATSRequestPayload, ATSResponsePayload, PaginatedResponse, EvaluationDecision } from '@/types'
import { MOCK_EVALUATIONS } from '@/mock/data'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { candidateService } from '@/services/candidate.service'
import { rowToEvaluation } from './mappers'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let evaluations = [...MOCK_EVALUATIONS]

// Resume scoring endpoint. Configurable via .env so it stays swappable,
// defaulting to the deployed Hugging Face Space.
const SCORE_API_URL =
  import.meta.env.VITE_SCORE_API_URL ?? 'https://siddhartha1xl-resume-screening.hf.space/score'

// The model may return labels like "Excellent Match" / "Moderate Match" /
// "Poor Match", but the app + DB only use three: Good Fit / Potential Fit / No
// Fit. Normalize by the model's label text, falling back to the score.
function normalizeLabel(raw: unknown, score: number): import('@/types').ATSLabel {
  const l = String(raw ?? '').toLowerCase()
  if (l.includes('excellent') || l.includes('strong') || l.includes('good')) return 'Good Fit'
  if (l.includes('moderate') || l.includes('fair') || l.includes('average') || l.includes('potential')) return 'Potential Fit'
  if (l.includes('weak') || l.includes('poor') || l.includes('no')) return 'No Fit'
  if (score >= 75) return 'Good Fit'
  if (score >= 50) return 'Potential Fit'
  return 'No Fit'
}

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

    const score = Number(item.ats_score ?? item.score)
    const result: ATSResponsePayload = {
      score,
      label: normalizeLabel(item.label, score),
      similarity: item.similarity != null ? Number(item.similarity) : undefined,
    }

    console.log('[ATS Score API] Parsed result:', result)
    return result
  },

  async saveEvaluation(
    orgId: string,
    data: Omit<ATSEvaluation, 'id' | 'evaluatedAt'>
  ): Promise<ATSEvaluation> {
    if (supabase) {
      const { data: row, error } = await supabase.from('evaluations').insert({
        organization_id: orgId,
        organization_name: data.organizationName ?? null,
        candidate_id: data.candidateId,
        candidate_name: data.candidateName,
        candidate_email: data.candidateEmail || null,
        job_id: data.jobId,
        job_title: data.jobTitle,
        resume_text: data.resumeText,
        score: data.score,
        label: data.label,
        similarity: data.similarity ?? null,
        decision: data.decision ?? null,
        evaluated_by: data.evaluatedBy,
      }).select().single()
      if (error) throw error
      return rowToEvaluation(row)
    }

    await delay(300)
    const evaluation: ATSEvaluation = {
      id: generateId(),
      ...data,
      organizationId: orgId,
      evaluatedAt: new Date().toISOString(),
    }
    evaluations = [evaluation, ...evaluations]
    return evaluation
  },

  async getAll(orgId: string, params?: { page?: number; perPage?: number; search?: string; jobId?: string; label?: string }): Promise<PaginatedResponse<ATSEvaluation>> {
    if (supabase) {
      let q = supabase.from('evaluations').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
      if (params?.jobId && params.jobId !== 'all') q = q.eq('job_id', params.jobId)
      if (params?.label && params.label !== 'all') q = q.eq('label', params.label)
      if (params?.search) q = q.or(`candidate_name.ilike.%${params.search}%,job_title.ilike.%${params.search}%`)
      const { data, error } = await q
      if (error) throw error
      const mapped = (data ?? []).map(rowToEvaluation)
      const page = params?.page ?? 1
      const perPage = params?.perPage ?? 100
      const start = (page - 1) * perPage
      return { data: mapped.slice(start, start + perPage), total: mapped.length, page, perPage }
    }

    await delay(400)
    let filtered = evaluations.filter(e => e.organizationId === orgId)
    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(e => e.candidateName.toLowerCase().includes(q) || e.jobTitle.toLowerCase().includes(q))
    }
    if (params?.jobId && params.jobId !== 'all') filtered = filtered.filter(e => e.jobId === params.jobId)
    if (params?.label && params.label !== 'all') filtered = filtered.filter(e => e.label === params.label)
    filtered.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())
    const page = params?.page ?? 1
    const perPage = params?.perPage ?? 10
    const start = (page - 1) * perPage
    return { data: filtered.slice(start, start + perPage), total: filtered.length, page, perPage }
  },

  async getById(id: string): Promise<ATSEvaluation> {
    if (supabase) {
      const { data, error } = await supabase.from('evaluations').select('*').eq('id', id).single()
      if (error) throw error
      return rowToEvaluation(data)
    }
    await delay(300)
    const ev = evaluations.find(e => e.id === id)
    if (!ev) throw new Error('Evaluation not found')
    return ev
  },

  // Shortlist or reject a candidate from an evaluation (#5).
  // Records the decision on the evaluation AND syncs the candidate's status.
  async setDecision(evalId: string, decision: EvaluationDecision): Promise<ATSEvaluation> {
    // decision maps 1:1 to candidate status (shortlisted / rejected / hired)
    if (supabase) {
      const { data: row, error } = await supabase.from('evaluations').update({ decision }).eq('id', evalId).select().single()
      if (error) throw error
      const ev = rowToEvaluation(row)
      if (ev.candidateId) {
        try { await candidateService.update(ev.candidateId, { status: decision }) } catch { /* non-fatal */ }
      }
      return ev
    }

    await delay(300)
    const idx = evaluations.findIndex(e => e.id === evalId)
    if (idx === -1) throw new Error('Evaluation not found')
    evaluations[idx] = { ...evaluations[idx], decision }
    try {
      await candidateService.update(evaluations[idx].candidateId, { status: decision })
    } catch { /* non-fatal */ }
    return evaluations[idx]
  },
}
