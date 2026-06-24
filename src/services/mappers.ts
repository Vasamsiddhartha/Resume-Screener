import type { Job, Candidate, ATSEvaluation } from '@/types'

// Map Supabase rows (snake_case) → app entities (camelCase).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export function rowToJob(r: Row): Job {
  return {
    id: r.id,
    organizationId: r.organization_id,
    organizationName: r.organization_name ?? undefined,
    title: r.title ?? '',
    jobType: r.job_type ?? undefined,
    department: r.department ?? '',
    location: r.location ?? '',
    experienceRequired: r.experience_required ?? '',
    employmentType: r.employment_type ?? 'full_time',
    description: r.description ?? '',
    status: r.status ?? 'active',
    candidateCount: 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  }
}

export function rowToCandidate(r: Row): Candidate {
  return {
    id: r.id,
    organizationId: r.organization_id,
    organizationName: r.organization_name ?? undefined,
    name: r.name,
    email: r.email ?? '',
    phone: r.phone ?? '',
    resumeUrl: r.resume_path ?? undefined,
    resumeText: r.resume_text ?? undefined,
    appliedJobId: r.applied_job_id ?? undefined,
    appliedJobTitle: r.applied_job_title ?? undefined,
    latestScore: r.latest_score != null ? Number(r.latest_score) : undefined,
    latestLabel: r.latest_label ?? undefined,
    status: r.status,
    pipelineStage: r.pipeline_stage ?? undefined,
    createdAt: r.created_at,
  }
}

export function rowToEvaluation(r: Row): ATSEvaluation {
  return {
    id: r.id,
    organizationId: r.organization_id,
    organizationName: r.organization_name ?? undefined,
    candidateId: r.candidate_id ?? '',
    candidateName: r.candidate_name ?? '',
    candidateEmail: r.candidate_email ?? '',
    jobId: r.job_id ?? '',
    jobTitle: r.job_title ?? '',
    resumeText: r.resume_text ?? '',
    score: Number(r.score),
    label: r.label,
    similarity: r.similarity != null ? Number(r.similarity) : undefined,
    decision: r.decision ?? undefined,
    evaluatedAt: r.created_at,
    evaluatedBy: r.evaluated_by ?? '',
  }
}
