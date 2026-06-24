-- ════════════════════════════════════════════════════════════════════════════
-- 0011: Make custom pipeline stages reliable. Re-asserts the table/column and
-- RLS from 0010 (safe to run even if 0010 was applied), and broadens the
-- write policies to also allow a super admin (who may have no org membership).
-- Inline RLS only, no DB functions. Safe to run more than once.
-- Requires 0001_schema.sql.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_stages_org_idx on public.pipeline_stages (organization_id);
alter table public.candidates add column if not exists pipeline_stage text;
alter table public.pipeline_stages enable row level security;

drop policy if exists "pipeline_stages_read" on public.pipeline_stages;
create policy "pipeline_stages_read" on public.pipeline_stages for select
  using (is_org_member(organization_id) or is_super_admin());

drop policy if exists "pipeline_stages_insert" on public.pipeline_stages;
create policy "pipeline_stages_insert" on public.pipeline_stages for insert
  with check (is_org_member(organization_id) or is_super_admin());

drop policy if exists "pipeline_stages_update" on public.pipeline_stages;
create policy "pipeline_stages_update" on public.pipeline_stages for update
  using (is_org_member(organization_id) or is_super_admin())
  with check (is_org_member(organization_id) or is_super_admin());

drop policy if exists "pipeline_stages_delete" on public.pipeline_stages;
create policy "pipeline_stages_delete" on public.pipeline_stages for delete
  using (is_org_member(organization_id) or is_super_admin());

-- Realtime (ignore if already added).
do $$
begin
  begin alter publication supabase_realtime add table public.pipeline_stages; exception when others then null; end;
  begin alter publication supabase_realtime add table public.candidates; exception when others then null; end;
end $$;
