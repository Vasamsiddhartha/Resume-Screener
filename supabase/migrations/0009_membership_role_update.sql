-- ════════════════════════════════════════════════════════════════════════════
-- 0009: Let an org admin (or super admin) UPDATE memberships in their org.
-- Required for the Team Members "change role" feature (Recruiter ↔ Admin).
-- Without this there is no UPDATE policy on memberships, so the role change is
-- silently blocked by RLS (the update touches 0 rows and the call fails).
-- Inline subquery via the existing is_org_admin() helper — no DB function added.
-- Safe to run more than once. Requires 0001_schema.sql.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "memberships_update" on public.memberships;
create policy "memberships_update" on public.memberships for update
  using (is_org_admin(organization_id) or is_super_admin())
  with check (is_org_admin(organization_id) or is_super_admin());
