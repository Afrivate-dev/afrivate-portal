-- Assignment-based management scope.
-- Run after 20260710_onboarding_survey_type.sql
--
-- The client derives "who a user manages" from any of:
--   1. Direct reports (profiles.reports_to_id)
--   2. Members of teams they lead (portal_teams.lead_user_id / asst_lead_user_id)
--   3. Members of departments they head (portal_departments.head_user_id)
-- so that leadership is assignment-based and an admin (or any role) assigned as
-- a team lead / department head manages their team.
--
-- Previously the RLS used public.is_direct_report_of(...) only. Because team
-- membership sets a member's reports_to_id to the DEPARTMENT HEAD (see
-- portal_set_team_member), a team lead who is not the department head had no
-- "direct reports" server-side and their approve/review actions were silently
-- filtered out. This migration introduces public.manages_user(...) — a strict
-- superset of is_direct_report_of — and swaps it into the scoped policies and
-- the team pulse-aggregate RPC. HR/admin continue to see everything.

-- ── Helper: everyone the current user manages ───────────────────────────────
create or replace function public.manages_user(p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- 1. direct report
    exists (
      select 1 from public.profiles
      where id = p_target and reports_to_id = auth.uid()
    )
    -- 2. member of a team the caller leads / co-leads
    or exists (
      select 1
      from public.portal_team_members tm
      join public.portal_teams t on t.id = tm.team_id
      where tm.user_id = p_target
        and (t.lead_user_id = auth.uid() or t.asst_lead_user_id = auth.uid())
    )
    -- 3. in a department the caller heads
    or exists (
      select 1
      from public.profiles p
      join public.portal_departments d on d.name = p.department
      where p.id = p_target
        and d.head_user_id = auth.uid()
    );
$$;

revoke all on function public.manages_user(uuid) from public;
grant execute on function public.manages_user(uuid) to authenticated;

-- ── Leave: managers see the people they manage (HR/admin see all) ────────────
drop policy if exists "leave: read scoped" on public.portal_leave_requests;
create policy "leave: read scoped" on public.portal_leave_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(user_id)
  );

drop policy if exists "leave: update scoped" on public.portal_leave_requests;
create policy "leave: update scoped" on public.portal_leave_requests
  for update to authenticated
  using (
    public.is_hr_or_admin()
    or public.manages_user(user_id)
  )
  with check (
    public.is_hr_or_admin()
    or public.manages_user(user_id)
  );

-- ── Leave comments: align with leave visibility ─────────────────────────────
drop policy if exists "leave_comments: read scoped" on public.portal_leave_comments;
create policy "leave_comments: read scoped" on public.portal_leave_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.portal_leave_requests lr
      where lr.id = leave_id
        and (
          lr.user_id = auth.uid()
          or public.is_hr_or_admin()
          or public.manages_user(lr.user_id)
        )
    )
  );

drop policy if exists "leave_comments: insert scoped" on public.portal_leave_comments;
create policy "leave_comments: insert scoped" on public.portal_leave_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.portal_leave_requests lr
      where lr.id = leave_id
        and (
          lr.user_id = auth.uid()
          or public.is_hr_or_admin()
          or public.manages_user(lr.user_id)
        )
    )
  );

-- ── Onboarding milestones: managers manage the people they manage ────────────
drop policy if exists "milestones: read scoped" on public.portal_onboarding_milestones;
create policy "milestones: read scoped" on public.portal_onboarding_milestones
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(user_id)
  );

drop policy if exists "milestones: manager manage reports" on public.portal_onboarding_milestones;
create policy "milestones: manager manage reports" on public.portal_onboarding_milestones
  for all to authenticated
  using (public.is_hr_or_admin() or public.manages_user(user_id))
  with check (public.is_hr_or_admin() or public.manages_user(user_id));

-- ── 1:1 logs: managers read the people they manage ──────────────────────────
drop policy if exists "one_on_one: read scoped" on public.portal_one_on_one_logs;
create policy "one_on_one: read scoped" on public.portal_one_on_one_logs
  for select to authenticated
  using (
    employee_id = auth.uid()
    or manager_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(employee_id)
  );

-- ── OKRs: own row or a manager of the owner / HR ─────────────────────────────
drop policy if exists "okrs: read scoped" on public.portal_okrs;
create policy "okrs: read scoped" on public.portal_okrs
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(user_id)
  );

drop policy if exists "okrs: update scoped" on public.portal_okrs;
create policy "okrs: update scoped" on public.portal_okrs
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(user_id)
  )
  with check (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(user_id)
  );

-- ── IDPs: managers review the people they manage ────────────────────────────
drop policy if exists "idp: read scoped" on public.portal_idps;
create policy "idp: read scoped" on public.portal_idps
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(user_id)
  );

drop policy if exists "idp: update scoped" on public.portal_idps;
create policy "idp: update scoped" on public.portal_idps
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(user_id)
  )
  with check (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(user_id)
  );

-- ── Team pulse aggregates: scope to managed people (assignment-based) ────────
create or replace function public.hr_pulse_aggregates(p_team_scope boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_scope uuid[];
  v_eng numeric;
  v_enps int;
  v_promoters int;
  v_detractors int;
  v_total int;
begin
  if auth.uid() is null then
    return jsonb_build_object('engagement_score', null, 'enps_score', null);
  end if;

  if p_team_scope then
    if not public.is_lead_or_above() then
      return jsonb_build_object('engagement_score', null, 'enps_score', null);
    end if;
    select coalesce(array_agg(distinct p.id), '{}')
      into v_scope
      from public.profiles p
      where coalesce(p.active, true)
        and p.id <> auth.uid()
        and public.manages_user(p.id);
  else
    if not public.is_hr_or_admin() then
      return jsonb_build_object('engagement_score', null, 'enps_score', null);
    end if;
    select coalesce(array_agg(id), '{}')
      into v_scope
      from public.profiles
      where coalesce(active, true);
  end if;

  if coalesce(array_length(v_scope, 1), 0) = 0 then
    return jsonb_build_object('engagement_score', null, 'enps_score', null);
  end if;

  select avg(val)
    into v_eng
    from (
      select (elem.value)::numeric as val
      from public.portal_pulse_responses pr
      join public.portal_pulse_surveys ps on ps.id = pr.survey_id
      cross join lateral jsonb_each(pr.answers) as elem(key, value)
      where ps.survey_type = 'pulse'
        and pr.user_id = any (v_scope)
        and jsonb_typeof(elem.value) = 'number'
    ) nums;

  with first_scores as (
    select (
      select (e.value)::numeric
      from jsonb_each(pr.answers) as e(key, value)
      where jsonb_typeof(e.value) = 'number'
      limit 1
    ) as score
    from public.portal_pulse_responses pr
    join public.portal_pulse_surveys ps on ps.id = pr.survey_id
    where ps.survey_type = 'enps'
      and pr.user_id = any (v_scope)
  )
  select
    count(*) filter (where score >= 9),
    count(*) filter (where score <= 6),
    count(*)
    into v_promoters, v_detractors, v_total
  from first_scores
  where score is not null;

  if coalesce(v_total, 0) > 0 then
    v_enps := round(((v_promoters - v_detractors)::numeric / v_total) * 100);
  end if;

  return jsonb_build_object(
    'engagement_score', v_eng,
    'enps_score', v_enps
  );
end;
$fn$;

revoke all on function public.hr_pulse_aggregates(boolean) from public;
grant execute on function public.hr_pulse_aggregates(boolean) to authenticated;
