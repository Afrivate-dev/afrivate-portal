-- Preserve job titles from access requests (do not force "Staff").
-- 1) Signup profile uses metadata title or blank
-- 2) Access request writes job_title onto profiles
-- 3) Approval prefers request/profile title over the "Staff" placeholder
-- 4) Backfill existing pending/approved rows from access requests
--
-- Important: handle_new_user inserts an empty access-request row on signup.
-- submit_portal_access_request must still save job title when called seconds
-- later — do not short-circuit that as "already requested".

alter table public.portal_access_requests
  add column if not exists job_title text;

alter table public.profiles
  add column if not exists job_title text;

-- Drop legacy 1-arg overload so PostgREST always hits the 3-arg version
drop function if exists public.submit_portal_access_request(text);

-- ── handle_new_user: no default job title of Staff ───────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn_handle_new_user$
declare
  v_job_title text := nullif(trim(left(coalesce(new.raw_user_meta_data->>'job_title', ''), 120)), '');
begin
  insert into public.profiles (id, email, name, role, department, job_title, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'staff',
    'Unassigned',
    coalesce(v_job_title, ''),
    false
  )
  on conflict (id) do nothing;

  insert into public.portal_access_requests (user_id, requested_at, status)
  values (new.id, now(), 'pending')
  on conflict (user_id) do nothing;

  return new;
end;
$fn_handle_new_user$;

-- ── submit: copy job title (+ preferred department name) onto profile ────────
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

  -- Rate-limit empty duplicate spam only. Signup creates a blank request row
  -- immediately before this RPC; we must still persist job title / department.
  if v_existing is not null
     and v_existing_status = 'pending'
     and v_existing > now() - interval '1 minute'
     and v_job_title is null
     and v_dept_id is null
     and v_msg is null then
    return jsonb_build_object('success', true, 'already_requested', true);
  end if;

  insert into public.portal_access_requests (
    user_id, message, preferred_department_id, job_title, requested_at, status
  )
  values (v_uid, v_msg, v_dept_id, v_job_title, now(), 'pending')
  on conflict (user_id) do update set
    message = coalesce(excluded.message, portal_access_requests.message),
    preferred_department_id = coalesce(
      excluded.preferred_department_id,
      portal_access_requests.preferred_department_id
    ),
    job_title = coalesce(excluded.job_title, portal_access_requests.job_title),
    requested_at = excluded.requested_at,
    status = 'pending';

  -- Keep the typed job title on the profile so directory/UI never show "Staff"
  update public.profiles
  set
    job_title = case when v_job_title is not null then v_job_title else job_title end,
    department = coalesce(v_dept_name, department),
    updated_at = now()
  where id = v_uid
    and (
      v_job_title is not null
      or v_dept_name is not null
    );

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
        || case when v_job_title is not null then ' · Job title: ' || v_job_title else '' end
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

-- ── approve: never invent "Staff" when a real title exists ───────────────────
create or replace function public.admin_approve_portal_user(
  p_user_id uuid,
  p_role text default 'staff',
  p_department text default 'General',
  p_job_title text default null
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
  v_job_title text := nullif(trim(left(coalesce(p_job_title, ''), 120)), '');
  v_req_title text;
  v_existing_title text;
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

  -- The approval form is pre-filled from the access request. If the approver
  -- leaves it unchanged, that exact requested title is stored. If they edit
  -- it, the explicit edited value is stored (including a deliberate "Staff").
  -- Fall back only when no title was supplied to the RPC.
  if v_job_title is null then
    select nullif(trim(job_title), '') into v_req_title
    from public.portal_access_requests
    where user_id = p_user_id;

    if v_req_title is not null then
      v_job_title := v_req_title;
    end if;
  end if;

  if v_job_title is null then
    select nullif(trim(job_title), '') into v_existing_title
    from public.profiles
    where id = p_user_id;

    v_job_title := coalesce(v_existing_title, '');
  end if;

  v_job_title := coalesce(v_job_title, '');

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

  perform public.portal_seed_onboarding_milestones(p_user_id);

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

-- Backfill: copy requested titles onto profiles still stuck on placeholder Staff / blank
update public.profiles p
set
  job_title = trim(r.job_title),
  updated_at = now()
from public.portal_access_requests r
where r.user_id = p.id
  and nullif(trim(r.job_title), '') is not null
  and lower(trim(r.job_title)) <> 'staff'
  and (
    p.job_title is null
    or trim(p.job_title) = ''
    or lower(trim(p.job_title)) = 'staff'
  );

-- Recover titles lost by the signup race (empty request + early already_requested).
-- Inbox bodies include "Job title: …" or legacy "Role: …".
update public.portal_access_requests r
set job_title = trim(both from recovered.title)
from (
  select distinct on (n.from_user_id)
    n.from_user_id as user_id,
    (regexp_match(n.body, '(?:Job title|Role):\s*([^·\n]+)'))[1] as title
  from public.portal_inbox_notifications n
  where n.type = 'access_request'
    and n.from_user_id is not null
    and n.body ~ '(Job title|Role):'
  order by n.from_user_id, n.created_at desc
) recovered
where r.user_id = recovered.user_id
  and nullif(trim(recovered.title), '') is not null
  and lower(trim(recovered.title)) <> 'staff'
  and (
    r.job_title is null
    or trim(r.job_title) = ''
    or lower(trim(r.job_title)) = 'staff'
  );

update public.profiles p
set
  job_title = trim(r.job_title),
  updated_at = now()
from public.portal_access_requests r
where r.user_id = p.id
  and nullif(trim(r.job_title), '') is not null
  and lower(trim(r.job_title)) <> 'staff'
  and (
    p.job_title is null
    or trim(p.job_title) = ''
    or lower(trim(p.job_title)) = 'staff'
  );
