-- Portal integration: admin-only role changes, signup department/job title, profile patch RPC.
-- Run in Supabase SQL Editor after prior migrations.

-- ── Helpers ──

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    ''
  ) = 'admin';
$$;

-- Public department list for signup (no auth required).
create or replace function public.list_signup_departments()
returns table (id text, name text)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.name
  from public.portal_departments d
  order by d.name;
$$;

grant execute on function public.list_signup_departments() to anon, authenticated;

-- ── Access requests: department + job title from signup ──

alter table public.portal_access_requests
  add column if not exists preferred_department_id text
    references public.portal_departments (id) on delete set null;

alter table public.portal_access_requests
  add column if not exists job_title text;

-- Replace submit RPC with extended signature (defaults keep old callers working).
drop function if exists public.submit_portal_access_request(text);

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
  v_admin record;
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

  select requested_at into v_existing
  from public.portal_access_requests
  where user_id = v_uid and status = 'pending';

  if v_existing is not null and v_existing > now() - interval '1 minute' then
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
    insert into public.portal_inbox_notifications (
      id, user_id, type, title, body, link, read, created_at, from_user_id
    ) values (
      'inbox_access_' || v_uid::text || '_' || v_admin.id::text,
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
    on conflict (id) do nothing;
  end loop;

  return jsonb_build_object('success', true, 'already_requested', false);
end;
$$;

grant execute on function public.submit_portal_access_request(text, text, text) to authenticated;

-- ── Only admins may change roles (HR may still approve / patch other fields) ──

create or replace function public.guard_profile_sensitive_fields()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if public.is_portal_admin() then
    return new;
  end if;

  if public.is_hr_or_admin() then
    if old.role is distinct from new.role then
      new.role := old.role;
    end if;
    return new;
  end if;

  if old.role is distinct from new.role then
    new.role := old.role;
  end if;
  if old.active is distinct from new.active then
    new.active := old.active;
  end if;
  if old.approved_at is distinct from new.approved_at then
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$$;

-- HR may approve accounts; only admins may assign non-staff roles.
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

  update public.profiles
  set
    role = v_role,
    department = v_department,
    job_title = v_job_title,
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
      'job_title', v_job_title
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

-- Patch another user's profile via RPC (no Edge Function required).
create or replace function public.admin_patch_portal_profile(
  p_user_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_old_role text;
  v_new_role text;
  v_row public.profiles%rowtype;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if not public.is_hr_or_admin() then
    return jsonb_build_object('success', false, 'error', 'Only administrators and HR can update other profiles');
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'User id is required');
  end if;

  select * into v_row from public.profiles where id = p_user_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Profile not found');
  end if;

  v_old_role := v_row.role;

  if p_patch ? 'email' then
    v_row.email := nullif(trim(p_patch->>'email'), '');
  end if;
  if p_patch ? 'name' then
    v_row.name := coalesce(nullif(trim(p_patch->>'name'), ''), v_row.name);
  end if;
  if p_patch ? 'department' then
    v_row.department := coalesce(nullif(trim(p_patch->>'department'), ''), v_row.department);
  end if;
  if p_patch ? 'job_title' then
    v_row.job_title := coalesce(nullif(trim(p_patch->>'job_title'), ''), v_row.job_title);
  end if;
  if p_patch ? 'avatar_url' then
    v_row.avatar_url := nullif(p_patch->>'avatar_url', '');
  end if;
  if p_patch ? 'avatar_color' then
    v_row.avatar_color := nullif(p_patch->>'avatar_color', '');
  end if;
  if p_patch ? 'bio' then
    v_row.bio := nullif(p_patch->>'bio', '');
  end if;
  if p_patch ? 'skills' and jsonb_typeof(p_patch->'skills') = 'array' then
    v_row.skills := p_patch->'skills';
  end if;
  if p_patch ? 'phone' then
    v_row.phone := nullif(p_patch->>'phone', '');
  end if;
  if p_patch ? 'work_location' then
    v_row.work_location := nullif(p_patch->>'work_location', '');
  end if;
  if p_patch ? 'pronouns' then
    v_row.pronouns := nullif(p_patch->>'pronouns', '');
  end if;
  if p_patch ? 'linkedin_url' then
    v_row.linkedin_url := nullif(p_patch->>'linkedin_url', '');
  end if;
  if p_patch ? 'reports_to_id' then
    v_row.reports_to_id := nullif(p_patch->>'reports_to_id', '');
  end if;
  if p_patch ? 'joined_at' then
    v_row.joined_at := (p_patch->>'joined_at')::date;
  end if;
  if p_patch ? 'active' then
    v_row.active := (p_patch->>'active')::boolean;
  end if;
  if p_patch ? 'approved_at' then
    v_row.approved_at := (p_patch->>'approved_at')::timestamptz;
  end if;

  if p_patch ? 'role' then
    v_new_role := nullif(trim(p_patch->>'role'), '');
    if v_new_role is not null then
      if not public.is_portal_admin() then
        return jsonb_build_object('success', false, 'error', 'Only administrators can change roles');
      end if;
      v_row.role := v_new_role;
    end if;
  end if;

  v_row.updated_at := now();

  update public.profiles set
    email = v_row.email,
    name = v_row.name,
    role = v_row.role,
    department = v_row.department,
    job_title = v_row.job_title,
    avatar_url = v_row.avatar_url,
    avatar_color = v_row.avatar_color,
    bio = v_row.bio,
    skills = v_row.skills,
    phone = v_row.phone,
    work_location = v_row.work_location,
    pronouns = v_row.pronouns,
    linkedin_url = v_row.linkedin_url,
    reports_to_id = v_row.reports_to_id,
    joined_at = v_row.joined_at,
    active = v_row.active,
    approved_at = v_row.approved_at,
    updated_at = v_row.updated_at
  where id = p_user_id;

  if v_old_role is distinct from v_row.role then
    insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
    values (
      v_caller,
      'role_change',
      'user',
      p_user_id::text,
      jsonb_build_object('from_role', v_old_role, 'to_role', v_row.role)
    );
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_patch_portal_profile(uuid, jsonb) to authenticated;

-- ── Seed default departments so signup is not blocked on fresh installs ──

insert into public.portal_departments (id, name, description, created_at)
values
  ('dept_general', 'General', 'Default department — rename or add more in Admin', now()),
  ('dept_engineering', 'Engineering', 'Product and engineering', now()),
  ('dept_operations', 'Operations', 'Operations and admin', now())
on conflict (id) do nothing;
