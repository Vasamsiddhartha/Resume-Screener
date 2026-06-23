-- ════════════════════════════════════════════════════════════════════════════
-- 0008: Allow any org MEMBER to update their organization row (e.g. logo_url).
-- Only needed if you see "Logo shown, but it couldn't be saved..." — this makes
-- the logo persist across reloads. Inline subquery, no function. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "orgs_update" on public.organizations;
create policy "orgs_update" on public.organizations for update
  using (
    id in (select organization_id from public.memberships where user_id = auth.uid())
  )
  with check (
    id in (select organization_id from public.memberships where user_id = auth.uid())
  );
