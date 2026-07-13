-- Peer 360 auto-assignment, department-move inbox notify, org user removal cleanup.

-- ── Open feedback cycle: self + manager/report + peer (same dept / teammates) ─
create or replace function public.portal_open_feedback_cycle(
  p_template_id text,
  p_title text default null,
  p_year int default null,
  p_half text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tpl record;
  v_cycle_id text;
  v_year int := coalesce(p_year, extract(year from current_date)::int);
  v_half text := coalesce(nullif(trim(p_half), ''), case when extract(month from current_date) <= 6 then 'H1' else 'H2' end);
  v_title text;
  u record;
  m uuid;
  peer_id uuid;
  v_mgrs uuid[];
begin
  if not public.is_hr_or_admin() then
    raise exception 'Only HR or admin may open feedback cycles';
  end if;

  select * into v_tpl from public.portal_feedback_templates where id = p_template_id;
  if not found then
    raise exception 'Feedback template not found';
  end if;

  v_title := coalesce(nullif(trim(p_title), ''), v_tpl.label || ' — ' || v_year::text || ' ' || v_half);
  v_cycle_id := 'fc_' || replace(gen_random_uuid()::text, '-', '');

  update public.portal_feedback_cycles set status = 'closed' where status = 'open';

  insert into public.portal_feedback_cycles (id, title, year, half, status, questions)
  values (v_cycle_id, v_title, v_year, v_half, 'open', v_tpl.questions);

  for u in
    select p.id, p.department
    from public.profiles p
    where p.active = true
  loop
    insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
    values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, u.id, u.id, 'self')
    on conflict do nothing;

    select coalesce(array_agg(distinct mgr_id), '{}'::uuid[])
    into v_mgrs
    from (
      select p.reports_to_id as mgr_id
      from public.profiles p
      where p.id = u.id and p.reports_to_id is not null
      union
      select t.lead_user_id
      from public.portal_team_members tm
      join public.portal_teams t on t.id = tm.team_id
      where tm.user_id = u.id and t.lead_user_id is not null
      union
      select t.asst_lead_user_id
      from public.portal_team_members tm
      join public.portal_teams t on t.id = tm.team_id
      where tm.user_id = u.id and t.asst_lead_user_id is not null
      union
      select d.head_user_id
      from public.profiles p
      join public.portal_departments d on d.name = p.department
      where p.id = u.id and d.head_user_id is not null
    ) mgrs
    join public.profiles mp on mp.id = mgrs.mgr_id and mp.active = true
    where mgr_id is not null and mgr_id <> u.id;

    foreach m in array v_mgrs
    loop
      insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
      values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, u.id, m, 'manager')
      on conflict do nothing;

      insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
      values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, m, u.id, 'report')
      on conflict do nothing;
    end loop;

    -- Peers: same department and/or shared team, excluding self and managers (cap 8)
    for peer_id in
      select peer_uid
      from (
        select distinct p2.id as peer_uid, p2.name as peer_name
        from public.profiles p2
        where p2.active = true
          and p2.id <> u.id
          and nullif(trim(coalesce(u.department, '')), '') is not null
          and p2.department = u.department
          and not (p2.id = any (v_mgrs))
        union
        select distinct tm2.user_id, p2.name
        from public.portal_team_members tm1
        join public.portal_team_members tm2 on tm2.team_id = tm1.team_id and tm2.user_id <> tm1.user_id
        join public.profiles p2 on p2.id = tm2.user_id and p2.active = true
        where tm1.user_id = u.id
          and not (tm2.user_id = any (v_mgrs))
      ) peers
      order by peer_name
      limit 8
    loop
      insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
      values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, u.id, peer_id, 'peer')
      on conflict do nothing;
    end loop;
  end loop;

  return v_cycle_id;
end;
$$;

grant execute on function public.portal_open_feedback_cycle(text, text, int, text) to authenticated;

-- ── Department assign: notify the person when department actually changes ────
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
  v_prev_dept text;
  v_name text;
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

  select p.department, p.name into v_prev_dept, v_name
  from public.profiles p
  where p.id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Profile not found');
  end if;

  update public.profiles
  set
    department = v_dept.name,
    reports_to_id = v_dept.head_user_id,
    updated_at = now()
  where id = p_user_id;

  if coalesce(nullif(trim(v_prev_dept), ''), '') is distinct from v_dept.name then
    insert into public.portal_inbox_notifications (
      id, user_id, type, title, body, link, read, created_at, from_user_id
    ) values (
      'inbox_' || replace(gen_random_uuid()::text, '-', ''),
      p_user_id,
      'department_changed',
      'Department updated',
      case
        when nullif(trim(coalesce(v_prev_dept, '')), '') is null then
          'You have been assigned to the ' || v_dept.name || ' department.'
        else
          'You have been moved from ' || v_prev_dept || ' to ' || v_dept.name || '.'
      end,
      '/people/directory',
      false,
      now(),
      v_caller
    );
  end if;

  return jsonb_build_object('success', true, 'department', v_dept.name);
end;
$fn$;

grant execute on function public.portal_assign_user_department(uuid, text) to authenticated;

-- Audit log: allow null actor so removing a past admin does not fail FK
alter table public.portal_admin_audit_log
  alter column actor_id drop not null;

-- ── Org cleanup before auth delete (called by edge function / admins) ────────
create or replace function public.portal_prepare_user_removal(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_admin_count int;
  v_target_role text;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if public.get_my_role() <> 'admin' then
    return jsonb_build_object('success', false, 'error', 'Only administrators can remove users');
  end if;

  if p_user_id = v_caller then
    return jsonb_build_object('success', false, 'error', 'You cannot remove your own account');
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  if v_target_role = 'admin' then
    select count(*) into v_admin_count
    from public.profiles
    where role = 'admin' and active = true and id <> p_user_id;
    if v_admin_count < 1 then
      return jsonb_build_object('success', false, 'error', 'Cannot remove the last active administrator');
    end if;
  end if;

  -- Detach org structure references
  update public.profiles set reports_to_id = null where reports_to_id = p_user_id;
  update public.portal_departments set head_user_id = null where head_user_id = p_user_id;
  update public.portal_teams
  set
    lead_user_id = case when lead_user_id = p_user_id then null else lead_user_id end,
    asst_lead_user_id = case when asst_lead_user_id = p_user_id then null else asst_lead_user_id end
  where lead_user_id = p_user_id or asst_lead_user_id = p_user_id;

  delete from public.portal_team_members where user_id = p_user_id;

  -- Notes: updated_by_id has no ON DELETE — reassign to caller
  update public.portal_workspace_notes
  set updated_by_id = v_caller
  where updated_by_id = p_user_id;

  -- Preserve audit history without blocking auth delete
  update public.portal_admin_audit_log
  set actor_id = null
  where actor_id = p_user_id;

  -- Do not deactivate here — auth delete succeeds or fails atomically from the caller's view.

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.portal_prepare_user_removal(uuid) to authenticated;
