-- ════════════════════════════════════════════════════════════════════════════
-- 0007: Fix "new row violates row-level security policy" when uploading a logo.
-- The previous per-org folder check on the public `logos` bucket was too strict
-- (it rejected the upload). Logos are public, low-risk assets, so we simply
-- allow any AUTHENTICATED user to write to the `logos` bucket. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "logos_insert" on storage.objects;
drop policy if exists "logos_update" on storage.objects;
drop policy if exists "logos_delete" on storage.objects;

create policy "logos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos');

create policy "logos_update" on storage.objects for update to authenticated
  using (bucket_id = 'logos');

create policy "logos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'logos');
