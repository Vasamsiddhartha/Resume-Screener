// Typed schema for the Supabase Postgres database (mirrors supabase/migrations).
// Pass to createClient<Database>() to get fully-typed queries.

export type OrgStatus = 'active' | 'suspended' | 'inactive'
export type OrgPlan = 'free' | 'starter' | 'professional' | 'enterprise'
export type MembershipRole = 'org_admin' | 'recruiter'
export type JobStatus = 'active' | 'archived' | 'draft'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship'
export type CandidateStatus = 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired'
export type EvalLabel = 'Good Fit' | 'Potential Fit' | 'No Fit'
export type EvalDecision = 'shortlisted' | 'rejected'

export interface ProfileRow {
  id: string
  name: string
  email: string
  avatar_url: string | null
  phone: string | null
  job_title: string | null
  is_super_admin: boolean
  created_at: string
}

export interface OrganizationRow {
  id: string
  name: string
  slug: string
  email: string | null
  logo_url: string | null
  status: OrgStatus
  plan: OrgPlan
  created_at: string
  updated_at: string
}

export interface MembershipRow {
  id: string
  user_id: string
  organization_id: string
  role: MembershipRole
  created_at: string
}

export interface JobRow {
  id: string
  organization_id: string
  title: string
  department: string | null
  location: string | null
  experience_required: string | null
  employment_type: EmploymentType | null
  description: string
  status: JobStatus
  created_at: string
  updated_at: string
}

export interface CandidateRow {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  resume_path: string | null
  applied_job_id: string | null
  status: CandidateStatus
  created_at: string
}

export interface EvaluationRow {
  id: string
  organization_id: string
  candidate_id: string | null
  job_id: string | null
  resume_text: string
  score: number
  label: EvalLabel
  similarity: number | null
  decision: EvalDecision | null
  evaluated_by: string | null
  created_at: string
}

export interface NotificationPreferencesRow {
  user_id: string
  evaluation_completed: boolean
  candidate_shortlisted: boolean
  weekly_report: boolean
  team_invites: boolean
  product_updates: boolean
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>
      organizations: Table<OrganizationRow>
      memberships: Table<MembershipRow>
      jobs: Table<JobRow>
      candidates: Table<CandidateRow>
      evaluations: Table<EvaluationRow>
      notification_preferences: Table<NotificationPreferencesRow>
    }
    Views: { [_ in never]: never }
    Functions: {
      is_org_member: { Args: { org: string }; Returns: boolean }
      is_org_admin: { Args: { org: string }; Returns: boolean }
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
