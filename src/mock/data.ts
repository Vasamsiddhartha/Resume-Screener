import type {
  User, Organization, Job, Candidate, ATSEvaluation,
  TeamMember, Plan, PlatformAnalytics, OrgAnalytics,
} from '@/types'

// ─── Users ────────────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    email: 'superadmin@atsscorer.io',
    name: 'Alex Morgan',
    role: 'super_admin',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: 'u2',
    email: 'admin@techcorp.com',
    name: 'Jordan Smith',
    role: 'org_admin',
    organizationId: 'org1',
    organizationName: 'TechCorp Inc.',
    memberships: [
      { organizationId: 'org1', organizationName: 'TechCorp Inc.', role: 'org_admin' },
      { organizationId: 'org3', organizationName: 'Fintech Solutions', role: 'org_admin' },
    ],
    phone: '+1 (555) 200-1000',
    jobTitle: 'Head of Talent',
    createdAt: '2024-02-15T00:00:00Z',
    isActive: true,
  },
  {
    id: 'u3',
    email: 'recruiter@techcorp.com',
    name: 'Sam Rivera',
    role: 'recruiter',
    organizationId: 'org1',
    organizationName: 'TechCorp Inc.',
    memberships: [
      { organizationId: 'org1', organizationName: 'TechCorp Inc.', role: 'recruiter' },
      { organizationId: 'org5', organizationName: 'HealthTech Labs', role: 'recruiter' },
    ],
    phone: '+1 (555) 200-2000',
    jobTitle: 'Technical Recruiter',
    createdAt: '2024-03-01T00:00:00Z',
    isActive: true,
  },
  {
    id: 'u4',
    email: 'admin@designstudio.io',
    name: 'Casey Lee',
    role: 'org_admin',
    organizationId: 'org2',
    organizationName: 'Design Studio',
    memberships: [
      { organizationId: 'org2', organizationName: 'Design Studio', role: 'org_admin' },
    ],
    createdAt: '2024-03-10T00:00:00Z',
    isActive: true,
  },
]

export const MOCK_CREDENTIALS: Record<string, string> = {
  'superadmin@atsscorer.io': 'password',
  'admin@techcorp.com': 'password',
  'recruiter@techcorp.com': 'password',
  'admin@designstudio.io': 'password',
}

// ─── Organizations ────────────────────────────────────────────────────────────

export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'org1',
    name: 'TechCorp Inc.',
    slug: 'techcorp',
    email: 'contact@techcorp.com',
    status: 'active',
    plan: 'professional',
    memberCount: 12,
    jobCount: 8,
    evaluationCount: 245,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'org2',
    name: 'Design Studio',
    slug: 'design-studio',
    email: 'contact@designstudio.io',
    status: 'active',
    plan: 'starter',
    memberCount: 5,
    jobCount: 3,
    evaluationCount: 87,
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2024-06-10T00:00:00Z',
  },
  {
    id: 'org3',
    name: 'Fintech Solutions',
    slug: 'fintech-solutions',
    email: 'hr@fintechsolutions.com',
    status: 'active',
    plan: 'enterprise',
    memberCount: 34,
    jobCount: 21,
    evaluationCount: 1204,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-06-15T00:00:00Z',
  },
  {
    id: 'org4',
    name: 'StartupXYZ',
    slug: 'startupxyz',
    email: 'team@startupxyz.io',
    status: 'suspended',
    plan: 'free',
    memberCount: 2,
    jobCount: 1,
    evaluationCount: 14,
    createdAt: '2024-05-20T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'org5',
    name: 'HealthTech Labs',
    slug: 'healthtech-labs',
    email: 'careers@healthtechlabs.com',
    status: 'active',
    plan: 'professional',
    memberCount: 18,
    jobCount: 11,
    evaluationCount: 432,
    createdAt: '2024-02-28T00:00:00Z',
    updatedAt: '2024-06-12T00:00:00Z',
  },
]

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const MOCK_JOBS: Job[] = [
  {
    id: 'job1',
    organizationId: 'org1',
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Remote',
    experienceRequired: '5+ years',
    employmentType: 'full_time',
    description: `We are looking for a Senior Frontend Engineer to join our growing team.

**Responsibilities:**
- Lead frontend architecture decisions
- Build scalable React applications with TypeScript
- Mentor junior developers
- Collaborate with design and backend teams

**Requirements:**
- 5+ years of React experience
- Strong TypeScript skills
- Experience with state management (Redux, Zustand)
- Knowledge of performance optimization
- Experience with testing frameworks (Jest, React Testing Library)

**Nice to have:**
- Experience with Next.js
- Knowledge of GraphQL
- Open source contributions`,
    status: 'active',
    candidateCount: 24,
    createdAt: '2024-05-15T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'job2',
    organizationId: 'org1',
    title: 'Backend Engineer (Node.js)',
    department: 'Engineering',
    location: 'New York, NY',
    experienceRequired: '3-5 years',
    employmentType: 'full_time',
    description: `Join our backend team to build robust APIs and microservices.

**Requirements:**
- 3+ years of Node.js experience
- Strong knowledge of REST and GraphQL APIs
- Experience with PostgreSQL and Redis
- Understanding of microservices architecture
- Familiarity with Docker and Kubernetes`,
    status: 'active',
    candidateCount: 18,
    createdAt: '2024-05-20T00:00:00Z',
    updatedAt: '2024-06-05T00:00:00Z',
  },
  {
    id: 'job3',
    organizationId: 'org1',
    title: 'Product Designer',
    department: 'Design',
    location: 'San Francisco, CA',
    experienceRequired: '3+ years',
    employmentType: 'full_time',
    description: `We're seeking a talented Product Designer to shape the future of our product.

**Requirements:**
- Strong portfolio showcasing product design work
- Proficiency in Figma
- Experience with user research and usability testing
- Ability to create design systems`,
    status: 'active',
    candidateCount: 31,
    createdAt: '2024-04-10T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'job4',
    organizationId: 'org1',
    title: 'DevOps Engineer',
    department: 'Infrastructure',
    location: 'Remote',
    experienceRequired: '4+ years',
    employmentType: 'full_time',
    description: `Help us build and maintain our cloud infrastructure.

**Requirements:**
- Strong experience with AWS or GCP
- Kubernetes and Docker expertise
- CI/CD pipeline experience
- Infrastructure as Code (Terraform, Pulumi)`,
    status: 'draft',
    candidateCount: 0,
    createdAt: '2024-06-10T00:00:00Z',
    updatedAt: '2024-06-10T00:00:00Z',
  },
  {
    id: 'job5',
    organizationId: 'org1',
    title: 'Data Scientist',
    department: 'Data',
    location: 'Remote',
    experienceRequired: '2+ years',
    employmentType: 'full_time',
    description: `Build ML models and data pipelines for our analytics platform.

**Requirements:**
- Python and SQL proficiency
- Experience with PyTorch or TensorFlow
- Statistical analysis expertise
- Experience with data visualization tools`,
    status: 'archived',
    candidateCount: 42,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-05-01T00:00:00Z',
  },
]

// ─── Candidates ───────────────────────────────────────────────────────────────

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    organizationId: 'org1',
    name: 'Emily Chen',
    email: 'emily.chen@email.com',
    phone: '+1 (555) 123-4567',
    appliedJobId: 'job1',
    appliedJobTitle: 'Senior Frontend Engineer',
    latestScore: 87.3,
    latestLabel: 'Good Fit',
    status: 'shortlisted',
    createdAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'c2',
    organizationId: 'org1',
    name: 'Marcus Johnson',
    email: 'marcus.j@email.com',
    phone: '+1 (555) 234-5678',
    appliedJobId: 'job1',
    appliedJobTitle: 'Senior Frontend Engineer',
    latestScore: 92.1,
    latestLabel: 'Good Fit',
    status: 'shortlisted',
    createdAt: '2024-06-02T00:00:00Z',
  },
  {
    id: 'c3',
    organizationId: 'org1',
    name: 'Sarah Williams',
    email: 'sarah.w@email.com',
    phone: '+1 (555) 345-6789',
    appliedJobId: 'job2',
    appliedJobTitle: 'Backend Engineer (Node.js)',
    latestScore: 65.8,
    latestLabel: 'Potential Fit',
    status: 'reviewing',
    createdAt: '2024-06-03T00:00:00Z',
  },
  {
    id: 'c4',
    organizationId: 'org1',
    name: 'David Park',
    email: 'david.park@email.com',
    phone: '+1 (555) 456-7890',
    appliedJobId: 'job3',
    appliedJobTitle: 'Product Designer',
    latestScore: 78.5,
    latestLabel: 'Good Fit',
    status: 'reviewing',
    createdAt: '2024-06-04T00:00:00Z',
  },
  {
    id: 'c5',
    organizationId: 'org1',
    name: 'Aisha Patel',
    email: 'aisha.patel@email.com',
    phone: '+1 (555) 567-8901',
    appliedJobId: 'job1',
    appliedJobTitle: 'Senior Frontend Engineer',
    latestScore: 45.2,
    latestLabel: 'No Fit',
    status: 'rejected',
    createdAt: '2024-06-05T00:00:00Z',
  },
  {
    id: 'c6',
    organizationId: 'org1',
    name: 'Ryan Thompson',
    email: 'ryan.t@email.com',
    phone: '+1 (555) 678-9012',
    appliedJobId: 'job2',
    appliedJobTitle: 'Backend Engineer (Node.js)',
    latestScore: 31.7,
    latestLabel: 'No Fit',
    status: 'rejected',
    createdAt: '2024-06-06T00:00:00Z',
  },
  {
    id: 'c7',
    organizationId: 'org1',
    name: 'Olivia Martinez',
    email: 'olivia.m@email.com',
    phone: '+1 (555) 789-0123',
    appliedJobId: 'job3',
    appliedJobTitle: 'Product Designer',
    latestScore: 94.8,
    latestLabel: 'Good Fit',
    status: 'hired',
    createdAt: '2024-05-28T00:00:00Z',
  },
  {
    id: 'c8',
    organizationId: 'org1',
    name: 'James Wilson',
    email: 'james.w@email.com',
    phone: '+1 (555) 890-1234',
    appliedJobId: 'job2',
    appliedJobTitle: 'Backend Engineer (Node.js)',
    latestScore: 71.4,
    latestLabel: 'Potential Fit',
    status: 'new',
    createdAt: '2024-06-10T00:00:00Z',
  },
]

// ─── ATS Evaluations ──────────────────────────────────────────────────────────

export const MOCK_EVALUATIONS: ATSEvaluation[] = [
  {
    id: 'eval1',
    organizationId: 'org1',
    candidateId: 'c2',
    candidateName: 'Marcus Johnson',
    candidateEmail: 'marcus.j@email.com',
    jobId: 'job1',
    jobTitle: 'Senior Frontend Engineer',
    resumeText: 'Senior React developer with 7 years experience...',
    score: 92.1,
    label: 'Good Fit',
    evaluatedAt: '2024-06-02T10:30:00Z',
    evaluatedBy: 'Sam Rivera',
  },
  {
    id: 'eval2',
    organizationId: 'org1',
    candidateId: 'c7',
    candidateName: 'Olivia Martinez',
    candidateEmail: 'olivia.m@email.com',
    jobId: 'job3',
    jobTitle: 'Product Designer',
    resumeText: 'Product designer with 6 years at top tech companies...',
    score: 94.8,
    label: 'Good Fit',
    evaluatedAt: '2024-05-28T14:15:00Z',
    evaluatedBy: 'Sam Rivera',
  },
  {
    id: 'eval3',
    organizationId: 'org1',
    candidateId: 'c1',
    candidateName: 'Emily Chen',
    candidateEmail: 'emily.chen@email.com',
    jobId: 'job1',
    jobTitle: 'Senior Frontend Engineer',
    resumeText: 'Frontend engineer specializing in React and Vue.js...',
    score: 87.3,
    label: 'Good Fit',
    evaluatedAt: '2024-06-01T09:45:00Z',
    evaluatedBy: 'Jordan Smith',
  },
  {
    id: 'eval4',
    organizationId: 'org1',
    candidateId: 'c4',
    candidateName: 'David Park',
    candidateEmail: 'david.park@email.com',
    jobId: 'job3',
    jobTitle: 'Product Designer',
    resumeText: 'UX/UI designer with 4 years of product experience...',
    score: 78.5,
    label: 'Good Fit',
    evaluatedAt: '2024-06-04T11:20:00Z',
    evaluatedBy: 'Sam Rivera',
  },
  {
    id: 'eval5',
    organizationId: 'org1',
    candidateId: 'c8',
    candidateName: 'James Wilson',
    candidateEmail: 'james.w@email.com',
    jobId: 'job2',
    jobTitle: 'Backend Engineer (Node.js)',
    resumeText: 'Backend developer with 3 years of Node.js experience...',
    score: 71.4,
    label: 'Potential Fit',
    evaluatedAt: '2024-06-10T16:00:00Z',
    evaluatedBy: 'Jordan Smith',
  },
  {
    id: 'eval6',
    organizationId: 'org1',
    candidateId: 'c3',
    candidateName: 'Sarah Williams',
    candidateEmail: 'sarah.w@email.com',
    jobId: 'job2',
    jobTitle: 'Backend Engineer (Node.js)',
    resumeText: 'Full stack developer transitioning to backend focus...',
    score: 65.8,
    label: 'Potential Fit',
    evaluatedAt: '2024-06-03T13:30:00Z',
    evaluatedBy: 'Sam Rivera',
  },
  {
    id: 'eval7',
    organizationId: 'org1',
    candidateId: 'c5',
    candidateName: 'Aisha Patel',
    candidateEmail: 'aisha.patel@email.com',
    jobId: 'job1',
    jobTitle: 'Senior Frontend Engineer',
    resumeText: 'Junior developer with 1 year experience in HTML and CSS...',
    score: 45.2,
    label: 'No Fit',
    evaluatedAt: '2024-06-05T10:00:00Z',
    evaluatedBy: 'Sam Rivera',
  },
  {
    id: 'eval8',
    organizationId: 'org1',
    candidateId: 'c6',
    candidateName: 'Ryan Thompson',
    candidateEmail: 'ryan.t@email.com',
    jobId: 'job2',
    jobTitle: 'Backend Engineer (Node.js)',
    resumeText: 'Recent graduate with basic programming knowledge...',
    score: 31.7,
    label: 'No Fit',
    evaluatedAt: '2024-06-06T09:00:00Z',
    evaluatedBy: 'Jordan Smith',
  },
]

// ─── Team Members ─────────────────────────────────────────────────────────────

export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'u2',
    organizationId: 'org1',
    name: 'Jordan Smith',
    email: 'admin@techcorp.com',
    role: 'org_admin',
    isActive: true,
    joinedAt: '2024-02-15T00:00:00Z',
    lastActiveAt: '2024-06-17T08:30:00Z',
  },
  {
    id: 'u3',
    organizationId: 'org1',
    name: 'Sam Rivera',
    email: 'recruiter@techcorp.com',
    role: 'recruiter',
    isActive: true,
    joinedAt: '2024-03-01T00:00:00Z',
    lastActiveAt: '2024-06-17T09:15:00Z',
  },
  {
    id: 'tm1',
    organizationId: 'org1',
    name: 'Taylor Brown',
    email: 'taylor@techcorp.com',
    role: 'recruiter',
    isActive: true,
    joinedAt: '2024-04-10T00:00:00Z',
    lastActiveAt: '2024-06-16T17:00:00Z',
  },
  {
    id: 'tm2',
    organizationId: 'org1',
    name: 'Morgan Davis',
    email: 'morgan@techcorp.com',
    role: 'recruiter',
    isActive: false,
    joinedAt: '2024-03-20T00:00:00Z',
    lastActiveAt: '2024-05-30T12:00:00Z',
  },
]

// ─── Subscription Plans ───────────────────────────────────────────────────────

export const MOCK_PLANS: Plan[] = [
  {
    id: 'plan_free',
    name: 'Free',
    price: 0,
    billingCycle: 'monthly',
    features: [
      '1 Admin user',
      'Up to 3 job postings',
      '50 ATS evaluations/month',
      'Basic reporting',
      'Email support',
    ],
    limits: { users: 2, jobs: 3, evaluationsPerMonth: 50 },
  },
  {
    id: 'plan_starter',
    name: 'Starter',
    price: 49,
    billingCycle: 'monthly',
    features: [
      'Up to 5 team members',
      '10 job postings',
      '500 ATS evaluations/month',
      'Advanced reporting',
      'CSV export',
      'Priority email support',
    ],
    limits: { users: 5, jobs: 10, evaluationsPerMonth: 500 },
  },
  {
    id: 'plan_professional',
    name: 'Professional',
    price: 149,
    billingCycle: 'monthly',
    isPopular: true,
    features: [
      'Up to 20 team members',
      'Unlimited job postings',
      '5,000 ATS evaluations/month',
      'Full analytics suite',
      'PDF & CSV export',
      'API access',
      'Priority chat support',
    ],
    limits: { users: 20, jobs: -1, evaluationsPerMonth: 5000 },
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    price: 499,
    billingCycle: 'monthly',
    features: [
      'Unlimited team members',
      'Unlimited job postings',
      'Unlimited ATS evaluations',
      'Custom analytics',
      'White-label option',
      'Dedicated account manager',
      'SLA guarantee',
      'SSO / SAML',
    ],
    limits: { users: -1, jobs: -1, evaluationsPerMonth: -1 },
  },
]

// ─── Analytics ────────────────────────────────────────────────────────────────

export const MOCK_PLATFORM_ANALYTICS: PlatformAnalytics = {
  totalOrganizations: 5,
  activeUsers: 71,
  totalEvaluations: 1982,
  monthlyUsage: 312,
  revenue: 3847,
  growthRate: 18.4,
}

export const MOCK_ORG_ANALYTICS: OrgAnalytics = {
  totalCandidates: 8,
  totalJobs: 5,
  totalEvaluations: 8,
  averageScore: 70.9,
  scoreDistribution: [
    { label: 'Good Fit', count: 4, percentage: 50 },
    { label: 'Potential Fit', count: 2, percentage: 25 },
    { label: 'No Fit', count: 2, percentage: 25 },
  ],
  evaluationTrend: [
    { date: 'Jan', evaluations: 18, avgScore: 68.2 },
    { date: 'Feb', evaluations: 25, avgScore: 71.5 },
    { date: 'Mar', evaluations: 31, avgScore: 69.8 },
    { date: 'Apr', evaluations: 42, avgScore: 73.1 },
    { date: 'May', evaluations: 38, avgScore: 72.4 },
    { date: 'Jun', evaluations: 8, avgScore: 70.9 },
  ],
}
