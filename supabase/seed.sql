-- ════════════════════════════════════════════════════════════════════════════
-- ATS Scanner — Optional demo seed (organizations + a few jobs)
-- Run AFTER 0001_schema.sql. Safe to re-run (uses fixed ids + ON CONFLICT).
--
-- Note: memberships, candidates, and evaluations are intentionally NOT seeded —
-- memberships need a real auth user id (created on signup). After you sign up,
-- use the snippet at the bottom to join an organization.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.organizations (id, name, slug, email, status, plan) values
  ('00000000-0000-0000-0000-000000000001', 'TechCorp Inc.',      'techcorp',          'contact@techcorp.com',         'active',    'professional'),
  ('00000000-0000-0000-0000-000000000002', 'Design Studio',      'design-studio',     'contact@designstudio.io',      'active',    'starter'),
  ('00000000-0000-0000-0000-000000000003', 'Fintech Solutions',  'fintech-solutions', 'hr@fintechsolutions.com',      'active',    'enterprise'),
  ('00000000-0000-0000-0000-000000000005', 'HealthTech Labs',    'healthtech-labs',   'careers@healthtechlabs.com',   'active',    'professional')
on conflict (id) do nothing;

insert into public.jobs (id, organization_id, title, department, location, experience_required, employment_type, description, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Senior Frontend Engineer', 'Engineering',    'Remote',            '5+ years', 'full_time', 'Lead frontend architecture, build scalable React + TypeScript apps, mentor engineers.', 'active'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Backend Engineer (Node.js)','Engineering',   'New York, NY',      '3-5 years','full_time', 'Build robust APIs and microservices with Node.js, PostgreSQL, and Redis.',             'active'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Product Designer',         'Design',         'San Francisco, CA', '3+ years', 'full_time', 'Shape product direction; strong Figma + design-systems experience.',                   'active')
on conflict (id) do nothing;

-- ─── After you sign up, run this to join an org as admin ──────────────────────
-- Replace the email with your signup email.
--
--   insert into public.memberships (user_id, organization_id, role)
--   select p.id, '00000000-0000-0000-0000-000000000001', 'org_admin'
--   from public.profiles p
--   where p.email = 'you@example.com'
--   on conflict (user_id, organization_id) do nothing;
--
-- To make yourself a platform super admin:
--   update public.profiles set is_super_admin = true where email = 'you@example.com';
