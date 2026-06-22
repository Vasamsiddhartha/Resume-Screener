-- ════════════════════════════════════════════════════════════════════════════
-- 0006: Organization logos — a PUBLIC bucket so logos can render in the app
-- and in emails. Files namespaced per org: logos/{org_id}/logo-*.png
-- organizations.logo_url already exists (0001). No functions. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Public read is automatic for a public bucket. Writes are restricted to
-- members of the org named in the first path segment (inline, no function).

drop policy if exists "logos_insert" on storage.objects;
create policy "logos_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (((storage.foldername(name))[1])::uuid) in (
      select organization_id from public.memberships where user_id = auth.uid()
    )
  );

drop policy if exists "logos_update" on storage.objects;
create policy "logos_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (((storage.foldername(name))[1])::uuid) in (
      select organization_id from public.memberships where user_id = auth.uid()
    )
  );

drop policy if exists "logos_delete" on storage.objects;
create policy "logos_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (((storage.foldername(name))[1])::uuid) in (
      select organization_id from public.memberships where user_id = auth.uid()
    )
  );
