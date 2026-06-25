import { createHashRouter, Navigate } from 'react-router-dom'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout'
import { OrgLayout } from '@/components/layout/OrgLayout'
import { ProtectedRoute } from './ProtectedRoute'

import { LoginPage } from '@/pages/auth/Login'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword'
import { ResetPasswordPage } from '@/pages/auth/ResetPassword'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmail'
import { SelectOrganizationPage } from '@/pages/auth/SelectOrganization'
import { SignUpPage } from '@/pages/auth/SignUp'
import { AcceptInvitePage } from '@/pages/auth/AcceptInvite'

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
import { PipelinePage } from '@/pages/org/Pipeline'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { TeamMembersPage } from '@/pages/org/TeamMembers'
import {
  SettingsProfilePage, SettingsTeamPage, SettingsNotificationsPage,
  SettingsModelPage, SettingsOrganizationPage,
} from '@/pages/org/Settings'

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
      { path: 'signup', element: <SignUpPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'select-organization', element: <SelectOrganizationPage /> },
      { path: 'accept-invite', element: <AcceptInvitePage /> },
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
          { path: 'super-admin/notifications', element: <NotificationsPage /> },
        ],
      },
    ],
  },

  // Org routes (admin + recruiter)
  {
    element: <ProtectedRoute allowedRoles={['org_admin', 'recruiter']} />,
    children: [
      {
        // The first segment is the organization name slug (e.g. /green-land/jobs).
        // It also matches the literal "org", so existing /org/* links keep working;
        // OrgLayout rewrites the slug to the real org name for display.
        path: ':orgSlug',
        element: <OrgLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <OrgDashboard /> },
          { path: 'jobs', element: <JobsPage /> },
          { path: 'candidates', element: <CandidatesPage /> },
          { path: 'pipeline', element: <PipelinePage /> },
          { path: 'evaluations', element: <ATSEvaluationsPage /> },
          { path: 'evaluations/new', element: <NewEvaluationPage /> },
          { path: 'analytics', element: <Navigate to="dashboard" replace /> },
          { path: 'team', element: <TeamMembersPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'settings', element: <Navigate to="profile" replace /> },
          { path: 'settings/profile', element: <SettingsProfilePage /> },
          { path: 'settings/team', element: <SettingsTeamPage /> },
          { path: 'settings/notifications', element: <SettingsNotificationsPage /> },
          { path: 'settings/appearance', element: <Navigate to="profile" replace /> },
          { path: 'settings/model', element: <SettingsModelPage /> },
          { path: 'settings/organization', element: <SettingsOrganizationPage /> },
        ],
      },
    ],
  },
])
