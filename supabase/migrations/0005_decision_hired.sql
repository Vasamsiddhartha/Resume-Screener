-- ════════════════════════════════════════════════════════════════════════════
-- 0005: allow "hired" as an evaluation decision (in addition to shortlisted/rejected).
-- No functions. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.evaluations drop constraint if exists evaluations_decision_check;
alter table public.evaluations
  add constraint evaluations_decision_check
  check (decision is null or decision in ('shortlisted', 'rejected', 'hired'));
