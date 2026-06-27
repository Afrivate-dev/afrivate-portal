-- Access request / approval flow hardening
-- NOTE: Supabase SQL Editor treats "?" as a placeholder — this file uses jsonb_exists(), not jsonb ?.

-- ── 1. Auto-create pending access request when auth user is created ──

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn_handle_new_user$
begin
  insert into public.profiles (id, email, name, role, department, job_title, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'staff',
    'Unassigned',
    'Staff',
    false
  )
  on conflict (id) do nothing;

  insert into public.portal_access_requests (user_id, requested_at, status)
  values (new.id, now(), 'pending')
  on conflict (user_id) do nothing;

  return new;
end;
$fn_handle_new_user$;

-- Backfill: inactive never-approved users missing an access request row
insert into public.portal_access_requests (user_id, requested_at, status)
select p.id, coalesce(p.updated_at, p.joined_at::timestamptz, now()), 'pending'
from public.profiles p
where p.active = false
  and p.approved_at is null
  and not exists (
    select 1 from public.portal_access_requests r where r.user_id = p.id
  )
on conflict (user_id) do nothing;

-- ── 2. Block first-time activation outside admin_approve_portal_user ──

create or replace function public.guard_first_portal_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn_guard_activation$
begin
  if tg_op = 'UPDATE'
    and old.active = false
    and new.active = true
    and new.approved_at is null
  then
    raise exception using
      errcode = '42501',
      message = 'New accounts must be approved from the Approvals tab.';
  end if;
  return new;
end;
$fn_guard_activation$;

drop trigger if exists guard_first_portal_activation on public.profiles;
create trigger guard_first_portal_activation
  before update on public.profiles
  for each row execute procedure public.guard_first_portal_activation();

-- ── 3. admin_patch_portal_profile: reject bypass activation ──

create or replace function public.admin_patch_portal_profile(
  p_user_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn_admin_patch$
declare
  v_caller uuid := auth.uid();
  v_old_role text;
  v_new_role text;
  v_row public.profiles%rowtype;
  v_wants_active boolean;
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

  if jsonb_exists(p_patch, 'email') then
    v_row.email := nullif(trim(p_patch->>'email'), '');
  end if;
  if jsonb_exists(p_patch, 'name') then
    v_row.name := coalesce(nullif(trim(p_patch->>'name'), ''), v_row.name);
  end if;
  if jsonb_exists(p_patch, 'department') then
    v_row.department := coalesce(nullif(trim(p_patch->>'department'), ''), v_row.department);
  end if;
  if jsonb_exists(p_patch, 'job_title') then
    v_row.job_title := coalesce(nullif(trim(p_patch->>'job_title'), ''), v_row.job_title);
  end if;
  if jsonb_exists(p_patch, 'avatar_url') then
    v_row.avatar_url := nullif(p_patch->>'avatar_url', '');
  end if;
  if jsonb_exists(p_patch, 'avatar_color') then
    v_row.avatar_color := nullif(p_patch->>'avatar_color', '');
  end if;
  if jsonb_exists(p_patch, 'bio') then
    v_row.bio := nullif(p_patch->>'bio', '');
  end if;
  if jsonb_exists(p_patch, 'skills') and jsonb_typeof(p_patch->'skills') = 'array' then
    v_row.skills := p_patch->'skills';
  end if;
  if jsonb_exists(p_patch, 'phone') then
    v_row.phone := nullif(p_patch->>'phone', '');
  end if;
  if jsonb_exists(p_patch, 'work_location') then
    v_row.work_location := nullif(p_patch->>'work_location', '');
  end if;
  if jsonb_exists(p_patch, 'pronouns') then
    v_row.pronouns := nullif(p_patch->>'pronouns', '');
  end if;
  if jsonb_exists(p_patch, 'linkedin_url') then
    v_row.linkedin_url := nullif(p_patch->>'linkedin_url', '');
  end if;
  if jsonb_exists(p_patch, 'reports_to_id') then
    v_row.reports_to_id := nullif(p_patch->>'reports_to_id', '');
  end if;
  if jsonb_exists(p_patch, 'joined_at') then
    v_row.joined_at := (p_patch->>'joined_at')::date;
  end if;
  if jsonb_exists(p_patch, 'active') then
    v_wants_active := (p_patch->>'active')::boolean;
    if v_wants_active = true and v_row.approved_at is null then
      return jsonb_build_object(
        'success', false,
        'error', 'New accounts must be approved from the Approvals tab, not activated here.'
      );
    end if;
    v_row.active := v_wants_active;
  end if;
  if jsonb_exists(p_patch, 'approved_at') then
    if not public.is_portal_admin() then
      return jsonb_build_object('success', false, 'error', 'Only administrators can set approval timestamps');
    end if;
    v_row.approved_at := (p_patch->>'approved_at')::timestamptz;
  end if;

  if jsonb_exists(p_patch, 'role') then
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
$fn_admin_patch$;

-- ── 4. HR+ list access requests (security definer fallback for admin UI) ──

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
  where r.status in ('pending', 'acknowledged')
  order by r.requested_at desc;
end;
$fn_list_access$;

grant execute on function public.list_portal_access_requests_for_admin() to authenticated;
