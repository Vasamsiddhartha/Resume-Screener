// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'org_admin' | 'recruiter'

// A user can belong to multiple organizations, each with its own role.
export interface OrgMembership {
  organizationId: string
  organizationName: string
  organizationLogo?: string
  role: 'org_admin' | 'recruiter'
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  // The ACTIVE organization context (mirrors the selected membership)
  organizationId?: string
  organizationName?: string
  organizationLogo?: string
  // All organizations this user belongs to (empty for super_admin)
  memberships?: OrgMembership[]
  avatar?: string
  phone?: string
  jobTitle?: string
  createdAt: string
  isActive: boolean
}

// User-level notification preferences (#4 — UI now, sending wired later)
export interface NotificationPreferences {
  evaluationCompleted: boolean
  candidateShortlisted: boolean
  weeklyReport: boolean
  teamInvites: boolean
  productUpdates: boolean
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  password: string
  confirmPassword: string
}

// ─── Organization ──────────────────────────────────────────────────────────────

export type OrgStatus = 'active' | 'suspended' | 'inactive'
export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise'

export interface Organization {
  id: string
  name: string
  slug: string
  email: string
  logo?: string
  status: OrgStatus
  plan: SubscriptionPlan
  memberCount: number
  jobCount: number
  evaluationCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateOrganizationPayload {
  name: string
  email: string
  plan: SubscriptionPlan
}

// ─── Job Description ──────────────────────────────────────────────────────────

export type JobStatus = 'active' | 'archived' | 'draft'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship'

export interface Job {
  id: string
  organizationId: string
  organizationName?: string
  title: string
  jobType?: string          // freeform, extracted from the JD (e.g. "Full-time, On-site")
  department: string
  location: string
  experienceRequired: string
  employmentType: EmploymentType
  description: string
  status: JobStatus
  candidateCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateJobPayload {
  title: string
  department: string
  location: string
  experienceRequired: string
  employmentType: EmploymentType
  description: string
  jobType?: string
  organizationName?: string
}

// ─── Candidate ────────────────────────────────────────────────────────────────

export type CandidateStatus = 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired'

export interface Candidate {
  id: string
  organizationId: string
  organizationName?: string
  name: string
  email: string
  phone: string
  resumeUrl?: string
  resumeText?: string
  appliedJobId?: string
  appliedJobTitle?: string
  latestScore?: number
  latestLabel?: string
  status: CandidateStatus
  /** Optional custom pipeline stage (user-defined kanban column). */
  pipelineStage?: string
  createdAt: string
}

export interface PipelineStage {
  id: string
  organizationId: string
  name: string
  position: number
  createdAt: string
}

export interface CreateCandidatePayload {
  name: string
  email: string
  phone: string
  appliedJobId?: string
  organizationName?: string
}

// ─── ATS Evaluation ───────────────────────────────────────────────────────────

// The model returns exactly three labels.
export type ATSLabel = 'Good Fit' | 'Potential Fit' | 'No Fit'

export type EvaluationDecision = 'shortlisted' | 'rejected' | 'hired'

export interface ATSEvaluation {
  id: string
  organizationId: string
  organizationName?: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  jobId: string
  jobTitle: string
  resumeText: string
  score: number
  label: ATSLabel
  similarity?: number
  decision?: EvaluationDecision
  evaluatedAt: string
  evaluatedBy: string
}

export interface ATSRequestPayload {
  resume_text: string
  job_description: string
}

export interface ATSResponsePayload {
  score: number
  label: ATSLabel
  similarity?: number
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface PlatformAnalytics {
  totalOrganizations: number
  activeUsers: number
  totalEvaluations: number
  monthlyUsage: number
  revenue: number
  growthRate: number
}

export interface OrgAnalytics {
  totalCandidates: number
  totalJobs: number
  totalEvaluations: number
  averageScore: number
  scoreDistribution: ScoreDistribution[]
  evaluationTrend: TrendDataPoint[]
}

export interface ScoreDistribution {
  label: ATSLabel
  count: number
  percentage: number
}

export interface TrendDataPoint {
  date: string
  evaluations: number
  avgScore: number
}

// ─── Subscription Plans ───────────────────────────────────────────────────────

export interface Plan {
  id: string
  name: string
  price: number
  billingCycle: 'monthly' | 'yearly'
  features: string[]
  limits: {
    users: number
    jobs: number
    evaluationsPerMonth: number
  }
  isPopular?: boolean
}

// ─── Table ────────────────────────────────────────────────────────────────────

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
}

export interface PaginationState {
  page: number
  perPage: number
  total: number
}

// ─── Team ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  organizationId: string
  name: string
  email: string
  role: 'org_admin' | 'recruiter'
  isActive: boolean
  joinedAt: string
  lastActiveAt?: string
}

export interface InviteUserPayload {
  email: string
  role: 'org_admin' | 'recruiter'
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
}
