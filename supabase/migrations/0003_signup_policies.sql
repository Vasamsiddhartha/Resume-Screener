-- ════════════════════════════════════════════════════════════════════════════
-- ATS Scanner — Self-service organization creation WITHOUT any DB function.
--
-- At signup the client (or, later, your own server) inserts the organization
-- and then its own admin membership. These policies make that safe:
--   • any authenticated user may create an organization (becomes its owner)
--   • a user may add ONLY THEMSELVES as admin to an org THEY created
-- No RPC / SECURITY DEFINER function involved. Safe to run more than once.
-- Requires 0001_schema.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- Track who created each org (so the first membership can be authorized
-- without referencing the memberships table — avoids RLS recursion).
alter table public.organizations
  add column if not exists created_by uuid default auth.uid();

-- Creator can read their org even before the membership row exists.
drop policy if exists "orgs_read" on public.organizations;
create policy "orgs_read" on public.organizations for select
  using (is_org_member(id) or created_by = auth.uid() or is_super_admin());

-- Any authenticated user may create an organization (becomes its owner).
drop policy if exists "orgs_insert" on public.organizations;
create policy "orgs_insert" on public.organizations for insert
  with check (created_by = auth.uid());

-- A user may add THEMSELVES as admin to an org THEY created (the first member).
-- Admins adding OTHER members is still covered by memberships_insert (0001).
drop policy if exists "memberships_self_join" on public.memberships;
create policy "memberships_self_join" on public.memberships for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.created_by = auth.uid()
    )
  );

-- Drop the old function approach if it was ever created (no longer used).
drop function if exists public.create_organization(text, text, text);
