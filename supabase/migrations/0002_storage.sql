-- ════════════════════════════════════════════════════════════════════════════
-- ATS Scanner — Resume storage, isolated per organization (#7)
--
-- Strategy: ONE private bucket `resumes`, with each org's files namespaced under
-- a folder named by its organization_id:
--
--     resumes/{organization_id}/{candidate_id}/{filename}
--
-- RLS on storage.objects restricts every operation to members of the org named
-- in the first path segment — so each organization can only ever see its own
-- resumes. This is the Supabase-recommended multi-tenant pattern (a literal
-- bucket-per-org doesn't scale and hits bucket limits). The isolation is
-- identical to separate buckets.
-- Requires 0001_schema.sql (uses public.is_org_member).
-- ════════════════════════════════════════════════════════════════════════════

-- Create the private bucket
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- First folder of the object path = organization_id
-- (storage.foldername(name) returns the path segments as a text[])

create policy "resumes_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and public.is_org_member( ((storage.foldername(name))[1])::uuid )
  );

create policy "resumes_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'resumes'
    and public.is_org_member( ((storage.foldername(name))[1])::uuid )
  );

create policy "resumes_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'resumes'
    and public.is_org_member( ((storage.foldername(name))[1])::uuid )
  );

create policy "resumes_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'resumes'
    and public.is_org_member( ((storage.foldername(name))[1])::uuid )
  );
