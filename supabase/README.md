# Supabase Backend Scaffold

Ready-to-apply SQL + client code to back ATS Scanner with a real multi-tenant
Postgres database and per-organization resume storage.

The frontend keeps working on its in-memory mock layer until you apply this and
the data services are switched over (see **Roadmap** below).

## What's here

| File | Purpose |
|------|---------|
| `migrations/0001_schema.sql` | Tables (profiles, organizations, memberships, jobs, candidates, evaluations, notification_preferences) + **Row Level Security** + signup trigger |
| `migrations/0002_storage.sql` | Private `resumes` bucket + storage RLS (per-org isolation, #7) |
| `migrations/0003_signup_policies.sql` | Policies so a new user can create their org with plain inserts (no DB function) |
| `seed.sql` | Optional demo organizations + jobs |
| `../src/lib/supabase.ts` | Typed Supabase client (null until configured) |
| `../src/services/storage.service.ts` | Upload / signed-URL / delete resumes |
| `../src/types/database.ts` | Typed schema for `createClient<Database>()` |

## Apply (≈3 minutes)

1. **Create a project** at [supabase.com](https://supabase.com) (or use your existing one).
2. **Run the SQL** — Dashboard → **SQL Editor** → New query, paste and **Run**, in order:
   1. `migrations/0001_schema.sql`
   2. `migrations/0002_storage.sql`
   3. `migrations/0003_signup_policies.sql`
   4. `seed.sql` *(optional)*
3. **Get your keys** — Dashboard → **Settings → API**: copy the **Project URL** and the **anon public** key into `.env`:
   ```env
   VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...
   ```
4. **Restart the dev server** (Vite reads `.env` at startup).
5. **Sign up** a user (Supabase Auth) — the trigger auto-creates their `profiles`
   row + default notification preferences. Then link them to an org with the
   snippet at the bottom of `seed.sql`.

## How multi-tenant isolation works

- **`memberships`** is the user↔org join table — a user can belong to many orgs (#1).
- Every org-scoped table carries `organization_id`, and RLS policies allow access
  only when `is_org_member(organization_id)` is true (admins get write via
  `is_org_admin`). `is_super_admin()` can read across all orgs.
- The helper functions are `security definer` so membership checks don't recurse.
- **Resumes** live in one private bucket namespaced by org id
  (`resumes/{org_id}/{candidate_id}/file`); storage RLS enforces the same
  membership check, so each org only sees its own files — identical isolation to
  separate buckets, without the per-bucket scaling limits.

## Roadmap — switching the app onto Supabase

This scaffold is the backend. To make the app read/write it (instead of mock data):

1. **Auth** — replace `authService` mock login with `supabase.auth.signInWithPassword`;
   load the user's `memberships` to drive the org switcher.
2. **Data services** — point `jobService`, `candidateService`, `atsService`,
   `teamService` at Supabase queries (the typed client + `database.ts` make this
   mechanical). IDs become UUIDs.
3. **Resumes** — in the New Evaluation flow, call
   `storageService.uploadResume(orgId, candidateId, file)` and save the returned
   path to `candidates.resume_path`.
4. **Email (#4)** — wire a Supabase Edge Function (or a provider like Resend) to
   the notification preferences; the UI toggles already exist.

Say the word and I'll do step-by-step service migration next.
