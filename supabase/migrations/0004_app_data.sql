-- ════════════════════════════════════════════════════════════════════════════
-- 0004: organization_name columns, new pasted-JD job style, team invitations.
-- NO database functions (only inline policy subqueries + Supabase built-ins).
-- Requires 0001 + 0003. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Keep the organization name alongside organization_id everywhere it's used
alter table public.memberships add column if not exists organization_name text;
alter table public.jobs        add column if not exists organization_name text;
alter table public.candidates  add column if not exists organization_name text;
alter table public.evaluations add column if not exists organization_name text;

-- 2) New job style: paste a full JD; the app extracts title + type from the text
alter table public.jobs add column if not exists job_type text;     -- e.g. "Full-time, On-site"
alter table public.jobs alter column title set default '';

-- 2b) Denormalized display columns the app reads directly (1:1 with its types)
alter table public.candidates  add column if not exists applied_job_title text;
alter table public.candidates  add column if not exists latest_score numeric;
alter table public.candidates  add column if not exists latest_label text;
alter table public.candidates  add column if not exists resume_text text;

alter table public.evaluations add column if not exists candidate_name text;
alter table public.evaluations add column if not exists candidate_email text;
alter table public.evaluations add column if not exists job_title text;

-- 3) Team invitations (no auth.admin, no functions)
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  organization_name text,
  email text not null,
  role text not null check (role in ('org_admin','recruiter')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists idx_invitations_org   on public.invitations (organization_id);
create index if not exists idx_invitations_email on public.invitations (lower(email));

alter table public.invitations enable row level security;

-- Org members read their org's invites; the invited person reads their own by email
drop policy if exists "invitations_read" on public.invitations;
create policy "invitations_read" on public.invitations for select using (
  organization_id in (select organization_id from public.memberships where user_id = auth.uid())
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Admins create invites
drop policy if exists "invitations_insert" on public.invitations;
create policy "invitations_insert" on public.invitations for insert with check (
  organization_id in (
    select organization_id from public.memberships
    where user_id = auth.uid() and role = 'org_admin'
  )
);

-- Admins manage invites; the invited person can mark their own accepted
drop policy if exists "invitations_update" on public.invitations;
create policy "invitations_update" on public.invitations for update using (
  organization_id in (
    select organization_id from public.memberships
    where user_id = auth.uid() and role = 'org_admin'
  )
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- 3b) Let org co-members read each other's profiles (so the team roster shows names)
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (
  id = auth.uid()
  or id in (
    select m.user_id from public.memberships m
    where m.organization_id in (
      select organization_id from public.memberships where user_id = auth.uid()
    )
  )
);

-- 4) Let an invited user add THEMSELVES with the invited role (accept flow)
drop policy if exists "memberships_accept_invite" on public.memberships;
create policy "memberships_accept_invite" on public.memberships for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.invitations i
    where i.organization_id = organization_id
      and lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and i.status = 'pending'
      and i.role = role
  )
);
