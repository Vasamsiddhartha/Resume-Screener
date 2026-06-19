-- ════════════════════════════════════════════════════════════════════════════
-- ATS Scanner — Multi-tenant schema + Row Level Security
-- Apply in: Supabase Dashboard → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Tables ───────────────────────────────────────────────────────────────────

-- Mirrors auth.users (Supabase Auth owns identity; this holds app profile fields)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  avatar_url text,
  phone text,
  job_title text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  email text,
  logo_url text,
  status text not null default 'active' check (status in ('active','suspended','inactive')),
  plan text not null default 'free' check (plan in ('free','starter','professional','enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A user can belong to many organizations, each with its own role (#1)
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('org_admin','recruiter')),
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  department text,
  location text,
  experience_required text,
  employment_type text check (employment_type in ('full_time','part_time','contract','freelance','internship')),
  description text not null default '',
  status text not null default 'active' check (status in ('active','archived','draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  resume_path text,                       -- path within the 'resumes' storage bucket
  applied_job_id uuid references public.jobs (id) on delete set null,
  status text not null default 'new' check (status in ('new','reviewing','shortlisted','rejected','hired')),
  created_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  candidate_id uuid references public.candidates (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  resume_text text not null default '',
  score numeric(5,2) not null,
  label text not null check (label in ('Good Fit','Potential Fit','No Fit')),
  similarity numeric,
  decision text check (decision in ('shortlisted','rejected')),
  evaluated_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  evaluation_completed boolean not null default true,
  candidate_shortlisted boolean not null default true,
  weekly_report boolean not null default false,
  team_invites boolean not null default true,
  product_updates boolean not null default false
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_memberships_org  on public.memberships (organization_id);
create index if not exists idx_memberships_user on public.memberships (user_id);
create index if not exists idx_jobs_org         on public.jobs (organization_id);
create index if not exists idx_candidates_org   on public.candidates (organization_id);
create index if not exists idx_candidates_job   on public.candidates (applied_job_id);
create index if not exists idx_evaluations_org  on public.evaluations (organization_id);
create index if not exists idx_evaluations_job  on public.evaluations (job_id);
create index if not exists idx_evaluations_cand on public.evaluations (candidate_id);

-- ─── Helper functions ─────────────────────────────────────────────────────────
-- SECURITY DEFINER so they bypass RLS on `memberships` (avoids infinite recursion
-- when a membership policy needs to read memberships).

create or replace function public.is_org_member(org uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid() and m.role = 'org_admin'
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin = true
  );
$$;

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.profiles                enable row level security;
alter table public.organizations           enable row level security;
alter table public.memberships             enable row level security;
alter table public.jobs                    enable row level security;
alter table public.candidates              enable row level security;
alter table public.evaluations             enable row level security;
alter table public.notification_preferences enable row level security;

-- profiles: read your own (+ super admin reads all); update/insert your own
create policy "profiles_read"   on public.profiles for select using (id = auth.uid() or is_super_admin());
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- organizations: members read their orgs (+ super admin all); admins update
create policy "orgs_read"   on public.organizations for select using (is_org_member(id) or is_super_admin());
create policy "orgs_insert" on public.organizations for insert with check (is_super_admin());
create policy "orgs_update" on public.organizations for update using (is_org_admin(id) or is_super_admin()) with check (is_org_admin(id) or is_super_admin());
create policy "orgs_delete" on public.organizations for delete using (is_super_admin());

-- memberships: read memberships in your orgs (or your own); admins manage
create policy "memberships_read"   on public.memberships for select using (user_id = auth.uid() or is_org_member(organization_id) or is_super_admin());
create policy "memberships_insert" on public.memberships for insert with check (is_org_admin(organization_id) or is_super_admin());
create policy "memberships_delete" on public.memberships for delete using (is_org_admin(organization_id) or is_super_admin());

-- jobs: members read; admins manage (spec: admins create/edit jobs)
create policy "jobs_read"  on public.jobs for select using (is_org_member(organization_id) or is_super_admin());
create policy "jobs_write" on public.jobs for all   using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));

-- candidates: any org member reads + writes (recruiters add candidates / run evaluations)
create policy "candidates_read"  on public.candidates for select using (is_org_member(organization_id) or is_super_admin());
create policy "candidates_write" on public.candidates for all   using (is_org_member(organization_id)) with check (is_org_member(organization_id));

-- evaluations: any org member reads + writes
create policy "evaluations_read"  on public.evaluations for select using (is_org_member(organization_id) or is_super_admin());
create policy "evaluations_write" on public.evaluations for all   using (is_org_member(organization_id)) with check (is_org_member(organization_id));

-- notification preferences: only your own
create policy "notif_all" on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── On signup: auto-create a profile + default notification preferences ───────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
