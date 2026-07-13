-- Allow HR/admin to deny (dismiss) portal access requests.

create or replace function public.admin_deny_portal_access(
  p_user_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_note text := nullif(trim(left(coalesce(p_note, ''), 500)), '');
  v_name text;
  v_active boolean;
  v_approved timestamptz;
  v_body text;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if not public.is_hr_or_admin() then
    return jsonb_build_object('success', false, 'error', 'Only HR or administrators can deny access requests');
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'User is required');
  end if;

  if p_user_id = v_caller then
    return jsonb_build_object('success', false, 'error', 'You cannot deny your own access request');
  end if;

  select name, active, approved_at into v_name, v_active, v_approved
  from public.profiles
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  if v_active = true then
    return jsonb_build_object('success', false, 'error', 'This account is already active — deactivate it from Users instead');
  end if;

  -- First-time pending only (approved_at set means previously onboarded / deactivated staff)
  if v_approved is not null then
    return jsonb_build_object('success', false, 'error', 'This account was already approved before — manage it from Users instead');
  end if;

  -- Mark dismissed; keep the applicant's original message intact
  insert into public.portal_access_requests (user_id, status, requested_at)
  values (p_user_id, 'dismissed', now())
  on conflict (user_id) do update set
    status = 'dismissed';

  v_body := coalesce(
    v_note,
    'Your request to join the AfriVate portal was not approved. Contact People & Culture if you believe this is a mistake.'
  );

  -- Best-effort inbox (inactive users mainly see the pending screen)
  begin
    insert into public.portal_inbox_notifications (
      id, user_id, type, title, body, link, read, created_at, from_user_id
    ) values (
      'inbox_denied_' || p_user_id::text,
      p_user_id,
      'access_denied',
      'Access request declined',
      v_body,
      '/',
      false,
      now(),
      v_caller
    )
    on conflict (id) do update set
      title = excluded.title,
      body = excluded.body,
      read = false,
      created_at = now(),
      from_user_id = excluded.from_user_id;
  exception
    when others then
      null;
  end;

  begin
    insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
    values (
      v_caller,
      'access_denied',
      'user',
      p_user_id::text,
      jsonb_build_object('note', v_note, 'name', v_name)
    );
  exception
    when others then
      null;
  end;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_deny_portal_access(uuid, text) to authenticated;

-- Include dismissed so Approvals UI can hide denied signups after reload
create or replace function public.list_portal_access_requests_for_admin()
returns table (
  user_id uuid,
  message text,
  preferred_department_id text,
  job_title text,
  status text,
  requested_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $fn_list_access$
begin
  if not public.is_hr_or_admin() then
    return;
  end if;

  return query
  select
    r.user_id,
    r.message,
    r.preferred_department_id,
    r.job_title,
    r.status,
    r.requested_at
  from public.portal_access_requests r
  where r.status in ('pending', 'acknowledged', 'dismissed')
  order by r.requested_at desc;
end;
$fn_list_access$;

grant execute on function public.list_portal_access_requests_for_admin() to authenticated;

-- After a denial, re-request must re-notify HR (old inbox ids used ON CONFLICT DO NOTHING)
create or replace function public.submit_portal_access_request(
  p_message text default null,
  p_preferred_department_id text default null,
  p_job_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_email text;
  v_active boolean;
  v_msg text := nullif(trim(left(coalesce(p_message, ''), 500)), '');
  v_dept_id text := nullif(trim(coalesce(p_preferred_department_id, '')), '');
  v_job_title text := nullif(trim(left(coalesce(p_job_title, ''), 120)), '');
  v_dept_name text;
  v_existing timestamptz;
  v_existing_status text;
  v_admin record;
  v_inbox_id text;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Not signed in');
  end if;

  select name, email, active into v_name, v_email, v_active
  from public.profiles where id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Profile not found');
  end if;

  if v_active = true then
    return jsonb_build_object('success', false, 'error', 'Your account is already active');
  end if;

  if v_dept_id is not null then
    select name into v_dept_name
    from public.portal_departments
    where id = v_dept_id;
    if v_dept_name is null then
      v_dept_id := null;
    end if;
  end if;

  select requested_at, status into v_existing, v_existing_status
  from public.portal_access_requests
  where user_id = v_uid;

  if v_existing is not null
     and v_existing_status = 'pending'
     and v_existing > now() - interval '1 minute' then
    return jsonb_build_object('success', true, 'already_requested', true);
  end if;

  insert into public.portal_access_requests (
    user_id, message, preferred_department_id, job_title, requested_at, status
  )
  values (v_uid, v_msg, v_dept_id, v_job_title, now(), 'pending')
  on conflict (user_id) do update set
    message = excluded.message,
    preferred_department_id = excluded.preferred_department_id,
    job_title = excluded.job_title,
    requested_at = excluded.requested_at,
    status = 'pending';

  for v_admin in
    select id from public.profiles
    where role in ('hr', 'admin') and active = true
  loop
    v_inbox_id := 'inbox_access_' || v_uid::text || '_' || v_admin.id::text;
    insert into public.portal_inbox_notifications (
      id, user_id, type, title, body, link, read, created_at, from_user_id
    ) values (
      v_inbox_id,
      v_admin.id,
      'access_request',
      'Portal access requested',
      v_name || ' (' || v_email || ') is waiting for approval.'
        || case when v_dept_name is not null then ' Department: ' || v_dept_name else '' end
        || case when v_job_title is not null then ' · Role: ' || v_job_title else '' end
        || case when v_msg is not null then ' Message: ' || v_msg else '' end,
      '/admin',
      false,
      now(),
      v_uid
    )
    on conflict (id) do update set
      title = excluded.title,
      body = excluded.body,
      read = false,
      created_at = now(),
      from_user_id = excluded.from_user_id;
  end loop;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.submit_portal_access_request(text, text, text) to authenticated;
