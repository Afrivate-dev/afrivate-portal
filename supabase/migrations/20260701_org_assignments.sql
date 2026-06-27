-- Department & team assignment by HR/admin, department heads, and team leads.
-- Safe to re-run.

create or replace function public.is_department_head(p_department_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_departments d
    where d.id = p_department_id
      and d.head_user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_team(p_team_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_teams t
    where t.id = p_team_id
      and (
        t.lead_user_id = auth.uid()
        or t.asst_lead_user_id = auth.uid()
      )
  );
$$;

-- Assign a user to a department; sets reports_to to the department head.
create or replace function public.portal_assign_user_department(
  p_user_id uuid,
  p_department_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_caller uuid := auth.uid();
  v_dept public.portal_departments%rowtype;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if p_user_id is null or nullif(trim(p_department_id), '') is null then
    return jsonb_build_object('success', false, 'error', 'User and department are required');
  end if;

  select * into v_dept from public.portal_departments where id = p_department_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Department not found');
  end if;

  if not (
    public.is_hr_or_admin()
    or public.is_department_head(p_department_id)
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Only HR, administrators, or the department lead can assign departments'
    );
  end if;

  if not public.is_hr_or_admin() and not public.is_department_head(p_department_id) then
    return jsonb_build_object('success', false, 'error', 'You can only assign people to your department');
  end if;

  update public.profiles
  set
    department = v_dept.name,
    reports_to_id = v_dept.head_user_id,
    updated_at = now()
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Profile not found');
  end if;

  return jsonb_build_object('success', true);
end;
$fn$;

grant execute on function public.portal_assign_user_department(uuid, text) to authenticated;

-- Add or remove a team member; aligns profile department with the team's department.
create or replace function public.portal_set_team_member(
  p_team_id text,
  p_user_id uuid,
  p_add boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_caller uuid := auth.uid();
  v_team public.portal_teams%rowtype;
  v_dept public.portal_departments%rowtype;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if p_user_id is null or nullif(trim(p_team_id), '') is null then
    return jsonb_build_object('success', false, 'error', 'User and team are required');
  end if;

  select * into v_team from public.portal_teams where id = p_team_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Team not found');
  end if;

  if not (public.is_hr_or_admin() or public.can_manage_team(p_team_id)) then
    return jsonb_build_object(
      'success', false,
      'error', 'Only HR, administrators, or this team''s lead can manage membership'
    );
  end if;

  if p_add then
    if v_team.department_id is null then
      return jsonb_build_object(
        'success', false,
        'error', 'This team must belong to a department before adding members'
      );
    end if;

    insert into public.portal_team_members (team_id, user_id)
    values (p_team_id, p_user_id)
    on conflict do nothing;

    select * into v_dept from public.portal_departments where id = v_team.department_id;
    if found then
      update public.profiles
      set
        department = v_dept.name,
        reports_to_id = v_dept.head_user_id,
        updated_at = now()
      where id = p_user_id;
    end if;
  else
    delete from public.portal_team_members
    where team_id = p_team_id and user_id = p_user_id;
  end if;

  return jsonb_build_object('success', true);
end;
$fn$;

grant execute on function public.portal_set_team_member(text, uuid, boolean) to authenticated;

-- Team leads may manage membership on their teams (RPC is security definer; keep RLS read-only for direct writes).
drop policy if exists "team_members: admin write" on public.portal_team_members;
drop policy if exists "team_members: admin update" on public.portal_team_members;
drop policy if exists "team_members: admin delete" on public.portal_team_members;

create policy "team_members: admin write"
  on public.portal_team_members for insert
  with check (public.is_hr_or_admin());

create policy "team_members: admin delete"
  on public.portal_team_members for delete
  using (public.is_hr_or_admin());
