-- Reliable own-profile read for the signed-in user (bypasses RLS edge cases).
-- Used by the portal client so active/role match the database after admin bootstrap.

create or replace function public.get_my_portal_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles%rowtype;
begin
  if v_uid is null then
    return null;
  end if;

  select * into v_row from public.profiles where id = v_uid;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'email', v_row.email,
    'name', v_row.name,
    'role', v_row.role,
    'department', v_row.department,
    'job_title', v_row.job_title,
    'avatar_url', v_row.avatar_url,
    'active', coalesce(v_row.active, false)
  );
end;
$$;

grant execute on function public.get_my_portal_profile() to authenticated;
