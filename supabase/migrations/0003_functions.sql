-- ════════════════════════════════════════════════════════════════════════════
-- ATS Scanner — Self-service organization creation (for signup)
--
-- RLS intentionally blocks a brand-new user from INSERTing an organization or
-- their first membership (no membership yet ⇒ not an admin ⇒ chicken-and-egg).
-- This SECURITY DEFINER function performs both inserts atomically as the owner,
-- making the caller the org's first admin. Requires 0001_schema.sql.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.create_organization(
  p_name  text,
  p_email text default null,
  p_plan  text default 'free'
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  public.organizations;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Unique slug from the name + a short random suffix
  v_slug := lower(regexp_replace(trim(p_name), '\s+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6);

  insert into public.organizations (name, slug, email, plan)
  values (p_name, v_slug, p_email, p_plan)
  returning * into v_org;

  insert into public.memberships (user_id, organization_id, role)
  values (auth.uid(), v_org.id, 'org_admin');

  return v_org;
end;
$$;

grant execute on function public.create_organization(text, text, text) to authenticated;
