import type { ATSEvaluation, ATSRequestPayload, ATSResponsePayload, PaginatedResponse, EvaluationDecision } from '@/types'
import { MOCK_EVALUATIONS } from '@/mock/data'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { candidateService } from '@/services/candidate.service'
import { rowToEvaluation } from './mappers'
import { getPrimaryModelUrl, getFallbackModelUrl, getScoringMode } from '@/store/settings.store'
import { scoreLocally } from '@/ats-engine'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
let evaluations = [...MOCK_EVALUATIONS]

// Call one scoring endpoint and parse its response.
async function callModel(url: string, payload: ATSRequestPayload): Promise<ATSResponsePayload> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume: payload.resume_text, job_description: payload.job_description }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`Scoring API responded with ${response.status}: ${text}`)
  }
  const raw = await response.json()
  const item = Array.isArray(raw) ? raw[0] : raw
  if (!item || (item.ats_score == null && item.score == null)) {
    throw new Error('Scoring API returned an unexpected response shape')
  }
  const score = Number(item.ats_score ?? item.score)
  return {
    score,
    label: normalizeLabel(item.label, score),
    similarity: item.similarity != null ? Number(item.similarity) : undefined,
  }
}

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

// Score in-browser with the local AI engine (semantic + domain models).
// No network call per evaluation; models download once and cache in the browser.
async function scoreWithLocalEngine(payload: ATSRequestPayload): Promise<ATSResponsePayload> {
  const result = await scoreLocally(payload.resume_text, payload.job_description)
  const score = Math.round(result.overallScore)
  return {
    score,
    label: normalizeLabel(undefined, score),
    // breakdown.semanticMatch.score is a 0–100 percentage; expose as a 0–1 fraction
    // to match the remote endpoint's similarity semantics.
    similarity: result.breakdown?.semanticMatch
      ? result.breakdown.semanticMatch.score / 100
      : undefined,
    domainCompatibility: typeof result.domainCompatibility === 'number'
      ? Math.round(result.domainCompatibility)
      : undefined,
    skillDepth: typeof result.skillDepth === 'number'
      ? Math.round(result.skillDepth)
      : undefined,
    warnings: result.warnings && result.warnings.length ? result.warnings : undefined,
  }
}

export const atsService = {
  async evaluate(payload: ATSRequestPayload): Promise<ATSResponsePayload> {
    // Default: score locally in the browser (no per-evaluation API call).
    // Users can switch to the hosted endpoint in Settings → Model.
    if (getScoringMode() === 'local') {
      return await scoreWithLocalEngine(payload)
    }

    // Remote mode: try the primary (default) endpoint. If it fails and a
    // fallback endpoint is configured in Settings → Model, retry with it.
    try {
      return await callModel(getPrimaryModelUrl(), payload)
    } catch (primaryErr) {
      const fallback = getFallbackModelUrl()
      if (fallback) {
        console.warn('[ATS] primary model failed, trying fallback:', primaryErr)
        return await callModel(fallback, payload)
      }
      throw primaryErr
    }
  },

  async saveEvaluation(
    orgId: string,
    data: Omit<ATSEvaluation, 'id' | 'evaluatedAt'>
  ): Promise<ATSEvaluation> {
    if (supabase) {
      const base = {
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
      }
      // domain_compatibility / skill_depth come from the local engine (null for remote).
      const withSignals = {
        ...base,
        domain_compatibility: data.domainCompatibility ?? null,
        skill_depth: data.skillDepth ?? null,
      }
      let res = await supabase.from('evaluations').insert(withSignals).select().single()
      // If those columns don't exist yet (migration 0012 not applied), retry
      // without them so saving an evaluation never fails.
      if (res.error && /domain_compatibility|skill_depth|schema cache|PGRST204/i.test(`${res.error.message ?? ''} ${res.error.code ?? ''}`)) {
        console.warn('[ATS] evaluation signal columns missing — saving without them. Run supabase migration 0012.', res.error.message)
        res = await supabase.from('evaluations').insert(base).select().single()
      }
      if (res.error) throw res.error
      return rowToEvaluation(res.data)
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
