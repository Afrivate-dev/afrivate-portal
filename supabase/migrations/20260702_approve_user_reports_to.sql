-- Set reports_to_id to the department head when HR/admin approves a new user.
-- Safe to re-run.

create or replace function public.admin_approve_portal_user(
  p_user_id uuid,
  p_role text default 'staff',
  p_department text default 'General',
  p_job_title text default 'Staff'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_email text;
  v_name text;
  v_role text := coalesce(nullif(trim(p_role), ''), 'staff');
  v_department text := coalesce(nullif(trim(p_department), ''), 'General');
  v_job_title text := coalesce(nullif(trim(p_job_title), ''), 'Staff');
  v_head_user_id uuid;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if not public.is_hr_or_admin() then
    return jsonb_build_object('success', false, 'error', 'Only administrators and HR can approve users');
  end if;

  if not public.is_portal_admin() and v_role <> 'staff' then
    v_role := 'staff';
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'User id is required');
  end if;

  select d.head_user_id
  into v_head_user_id
  from public.portal_departments d
  where d.name = v_department
  limit 1;

  update public.profiles
  set
    role = v_role,
    department = v_department,
    job_title = v_job_title,
    reports_to_id = v_head_user_id,
    active = true,
    approved_at = now(),
    updated_at = now()
  where id = p_user_id
  returning email, name into v_email, v_name;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Profile not found');
  end if;

  update public.portal_access_requests
  set status = 'approved'
  where user_id = p_user_id;

  insert into public.portal_inbox_notifications (
    id, user_id, type, title, body, link, read, created_at, from_user_id
  ) values (
    'inbox_approved_' || p_user_id::text,
    p_user_id,
    'access_granted',
    'Access approved',
    'Your AfriVate portal account is now active. Sign in to get started.',
    '/',
    false,
    now(),
    v_caller
  )
  on conflict (id) do update set
    read = false,
    title = excluded.title,
    body = excluded.body,
    created_at = excluded.created_at;

  insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
  values (
    v_caller,
    'account_approval',
    'user',
    p_user_id::text,
    jsonb_build_object(
      'email', v_email,
      'name', v_name,
      'role', v_role,
      'department', v_department,
      'job_title', v_job_title,
      'reports_to_id', v_head_user_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_email,
    'name', v_name
  );
end;
$$;

grant execute on function public.admin_approve_portal_user(uuid, text, text, text) to authenticated;
