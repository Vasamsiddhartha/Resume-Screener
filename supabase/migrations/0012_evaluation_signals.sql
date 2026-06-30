-- 0012: local-engine evaluation signals.
-- The in-browser ATS engine produces extra per-evaluation signals beyond the
-- score: how related the resume's domain is to the job (domain_compatibility)
-- and the share of the job's skills found in the resume (skill_depth), both 0-100.
-- These are null for evaluations scored by the remote endpoint.

alter table public.evaluations add column if not exists domain_compatibility numeric;
alter table public.evaluations add column if not exists skill_depth numeric;
