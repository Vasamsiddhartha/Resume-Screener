import { createHashRouter, Navigate } from 'react-router-dom'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout'
import { OrgLayout } from '@/components/layout/OrgLayout'
import { ProtectedRoute } from './ProtectedRoute'

import { LoginPage } from '@/pages/auth/Login'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword'
import { ResetPasswordPage } from '@/pages/auth/ResetPassword'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmail'

import { SuperAdminDashboard } from '@/pages/super-admin/Dashboard'
import { OrganizationsPage } from '@/pages/super-admin/Organizations'
import { UsersPage } from '@/pages/super-admin/Users'
import { AnalyticsPage } from '@/pages/super-admin/Analytics'
import { SubscriptionPlansPage } from '@/pages/super-admin/SubscriptionPlans'
import { SuperAdminSettings } from '@/pages/super-admin/Settings'

import { OrgDashboard } from '@/pages/org/Dashboard'
import { JobsPage } from '@/pages/org/Jobs'
import { CandidatesPage } from '@/pages/org/Candidates'
import { ATSEvaluationsPage } from '@/pages/org/ATSEvaluations'
import { NewEvaluationPage } from '@/pages/org/NewEvaluation'
import { TeamMembersPage } from '@/pages/org/TeamMembers'
import { OrgSettings } from '@/pages/org/Settings'

export const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },

  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
    ],
  },

  // Super Admin routes
  {
    element: <ProtectedRoute allowedRoles={['super_admin']} />,
    children: [
      {
        element: <SuperAdminLayout />,
        children: [
          { path: 'super-admin/dashboard', element: <SuperAdminDashboard /> },
          { path: 'super-admin/organizations', element: <OrganizationsPage /> },
          { path: 'super-admin/users', element: <UsersPage /> },
          { path: 'super-admin/analytics', element: <AnalyticsPage /> },
          { path: 'super-admin/plans', element: <SubscriptionPlansPage /> },
          { path: 'super-admin/settings', element: <SuperAdminSettings /> },
        ],
      },
    ],
  },

  // Org routes (admin + recruiter)
  {
    element: <ProtectedRoute allowedRoles={['org_admin', 'recruiter']} />,
    children: [
      {
        element: <OrgLayout />,
        children: [
          { path: 'org/dashboard', element: <OrgDashboard /> },
          { path: 'org/jobs', element: <JobsPage /> },
          { path: 'org/candidates', element: <CandidatesPage /> },
          { path: 'org/evaluations', element: <ATSEvaluationsPage /> },
          { path: 'org/evaluations/new', element: <NewEvaluationPage /> },
          { path: 'org/team', element: <TeamMembersPage /> },
          { path: 'org/settings', element: <OrgSettings /> },
        ],
      },
    ],
  },
])
