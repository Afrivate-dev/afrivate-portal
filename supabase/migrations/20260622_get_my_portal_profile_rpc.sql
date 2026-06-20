-- Reliable own-profile read for the signed-in user (bypasses RLS edge cases).
-- Superseded by 20260623_profiles_schema_fix.sql — kept for idempotent re-runs.

create or replace function public.get_my_portal_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_email text;
  v_name text;
  v_role text;
  v_department text;
  v_job_title text;
  v_active boolean;
begin
  if v_uid is null then
    return null;
  end if;

  select p.id, p.email, p.name, p.role, p.department, p.job_title, p.active
  into v_id, v_email, v_name, v_role, v_department, v_job_title, v_active
  from public.profiles p
  where p.id = v_uid;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'email', v_email,
    'name', v_name,
    'role', v_role,
    'department', v_department,
    'job_title', v_job_title,
    'active', coalesce(v_active, false)
  );
end;
$$;

grant execute on function public.get_my_portal_profile() to authenticated;
