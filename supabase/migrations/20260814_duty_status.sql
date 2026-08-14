-- Duty status (PIP / suspension) on profiles.
-- HR sets this; leads/HR/admin see it. Suspended users can read memos & resources only.

alter table public.profiles
  add column if not exists duty_status text not null default 'none';

alter table public.profiles
  drop constraint if exists profiles_duty_status_check;

alter table public.profiles
  add constraint profiles_duty_status_check
  check (duty_status in ('none', 'pip', 'suspended'));

create index if not exists profiles_duty_status_idx
  on public.profiles (duty_status)
  where duty_status <> 'none';

-- ── Own-profile RPC includes duty_status ──

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
  v_duty_status text;
begin
  if v_uid is null then
    return null;
  end if;

  select p.id, p.email, p.name, p.role, p.department, p.job_title, p.active, p.duty_status
  into v_id, v_email, v_name, v_role, v_department, v_job_title, v_active, v_duty_status
  from public.profiles p
  where p.id = v_uid;

  if not found then
    insert into public.profiles (id, email, name, role, department, job_title, active, duty_status)
    select
      u.id,
      u.email,
      coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(u.email, '@', 1)),
      'staff',
      'Unassigned',
      'Staff',
      false,
      'none'
    from auth.users u
    where u.id = v_uid
    returning id, email, name, role, department, job_title, active, duty_status
    into v_id, v_email, v_name, v_role, v_department, v_job_title, v_active, v_duty_status;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'email', v_email,
    'name', v_name,
    'role', v_role,
    'department', v_department,
    'job_title', v_job_title,
    'active', coalesce(v_active, false),
    'duty_status', coalesce(v_duty_status, 'none')
  );
end;
$$;

grant execute on function public.get_my_portal_profile() to authenticated;

-- ── Block self-service changes to duty_status ──

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
  if old.duty_status is distinct from new.duty_status then
    new.duty_status := old.duty_status;
  end if;
  return new;
end;
$$;

-- ── Helper for write policies ──

create or replace function public.is_suspended()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.duty_status = 'suspended' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_suspended() to authenticated;

-- ── Admin patch: duty_status + block suspended callers ──

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
  v_duty text;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if not public.is_hr_or_admin() then
    return jsonb_build_object('success', false, 'error', 'Only administrators and HR can update other profiles');
  end if;

  if public.is_suspended() then
    return jsonb_build_object('success', false, 'error', 'Your account is on suspension; you cannot change profiles.');
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

  if jsonb_exists(p_patch, 'duty_status') then
    v_duty := coalesce(nullif(trim(p_patch->>'duty_status'), ''), 'none');
    if v_duty not in ('none', 'pip', 'suspended') then
      return jsonb_build_object('success', false, 'error', 'Invalid duty status');
    end if;
    if p_user_id = v_caller and v_duty = 'suspended' then
      return jsonb_build_object('success', false, 'error', 'You cannot suspend your own account while signed in.');
    end if;
    v_row.duty_status := v_duty;
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
    duty_status = v_row.duty_status,
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

-- ── Restrictive write policies while suspended (SELECT still allowed) ──

do $$
declare
  t text;
  tables text[] := array[
    'portal_tasks',
    'portal_weekly_check_ins',
    'portal_announcements',
    'portal_leave_requests',
    'portal_leave_comments',
    'portal_onboarding_progress',
    'portal_documents',
    'portal_recognition_posts',
    'portal_recognition_comments',
    'portal_events',
    'portal_workspace_notes',
    'portal_pulse_responses',
    'portal_learning_submissions',
    'portal_document_acknowledgments',
    'portal_okrs',
    'portal_one_on_one_logs',
    'portal_idps',
    'portal_feedback_entries',
    'portal_grievances',
    'portal_employee_profiles',
    'portal_discipline_cases',
    'portal_launch_checklist_progress',
    'portal_inbox_notifications'
  ];
begin
  foreach t in array tables
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('drop policy if exists %I on public.%I', 'suspended_no_insert', t);
    execute format('drop policy if exists %I on public.%I', 'suspended_no_update', t);
    execute format('drop policy if exists %I on public.%I', 'suspended_no_delete', t);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (not public.is_suspended())',
      'suspended_no_insert', t
    );
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (not public.is_suspended()) with check (not public.is_suspended())',
      'suspended_no_update', t
    );
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (not public.is_suspended())',
      'suspended_no_delete', t
    );
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end
$$;
