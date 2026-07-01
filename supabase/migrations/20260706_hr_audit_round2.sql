-- HR audit round 2: scoped RLS, aggregates RPC, constraints, transactional writes.
-- Run after 20260705_hr_audit_remediation.sql

-- ── Helpers ───────────────────────────────────────────────────────────────────
create or replace function public.is_direct_report_of(p_employee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_employee
      and reports_to_id = auth.uid()
  );
$$;

revoke all on function public.is_direct_report_of(uuid) from public;
grant execute on function public.is_direct_report_of(uuid) to authenticated;

-- ── Pulse aggregates (privacy-safe; no individual rows exposed to leads) ───────
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
    select coalesce(array_agg(id), '{}')
      into v_scope
      from public.profiles
      where reports_to_id = auth.uid()
        and coalesce(active, true);
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

-- ── Transactional pulse / learning publish ───────────────────────────────────
create or replace function public.portal_create_pulse_survey(
  p_id text,
  p_title text,
  p_description text,
  p_survey_type text,
  p_questions jsonb,
  p_opens_at timestamptz default null,
  p_closes_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_hr_or_admin() then
    raise exception 'not authorized';
  end if;

  update public.portal_pulse_surveys set active = false where active = true;

  insert into public.portal_pulse_surveys (
    id, title, description, survey_type, questions, active, opens_at, closes_at, created_by
  ) values (
    p_id, p_title, p_description, p_survey_type, p_questions, true, p_opens_at, p_closes_at, auth.uid()
  );

  return p_id;
end;
$fn$;

grant execute on function public.portal_create_pulse_survey(text, text, text, text, jsonb, timestamptz, timestamptz) to authenticated;

create or replace function public.portal_create_learning_assignment(
  p_id text,
  p_title text,
  p_alison_url text,
  p_description text,
  p_due_date date,
  p_month_label text
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_hr_or_admin() then
    raise exception 'not authorized';
  end if;

  update public.portal_learning_assignments set active = false where active = true;

  insert into public.portal_learning_assignments (
    id, title, alison_url, description, due_date, month_label, active
  ) values (
    p_id, p_title, p_alison_url, p_description, p_due_date, p_month_label, true
  );

  return p_id;
end;
$fn$;

grant execute on function public.portal_create_learning_assignment(text, text, text, text, date, text) to authenticated;

-- ── 360° feedback: subjects see self-assessment only ──────────────────────────
drop policy if exists "feedback_entries: read own subject or hr+" on public.portal_feedback_entries;
create policy "feedback_entries: read scoped" on public.portal_feedback_entries
  for select to authenticated
  using (
    reviewer_id = auth.uid()
    or public.is_hr_or_admin()
    or (subject_user_id = auth.uid() and relationship = 'self')
  );

drop policy if exists "feedback_entries: update reviewer" on public.portal_feedback_entries;
create policy "feedback_entries: update reviewer" on public.portal_feedback_entries
  for update to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

-- ── OKRs: scoped to own row or direct manager / HR ────────────────────────────
drop policy if exists "okrs: read own or lead+" on public.portal_okrs;
drop policy if exists "okrs: write own or lead+" on public.portal_okrs;

create policy "okrs: read scoped" on public.portal_okrs
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  );

create policy "okrs: insert own" on public.portal_okrs
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "okrs: update scoped" on public.portal_okrs
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  )
  with check (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  );

create policy "okrs: delete scoped" on public.portal_okrs
  for delete to authenticated
  using (user_id = auth.uid() or public.is_hr_or_admin());

-- ── IDPs: managers review direct reports only ─────────────────────────────────
drop policy if exists "idp: read own or lead+" on public.portal_idps;
drop policy if exists "idp: update own or lead+" on public.portal_idps;

create policy "idp: read scoped" on public.portal_idps
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  );

create policy "idp: update scoped" on public.portal_idps
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  )
  with check (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  );

-- ── Unique constraints (dedupe legacy rows first) ─────────────────────────────
delete from public.portal_learning_submissions a
using public.portal_learning_submissions b
where a.id > b.id
  and a.assignment_id = b.assignment_id
  and a.user_id = b.user_id;

alter table public.portal_learning_submissions
  drop constraint if exists portal_learning_submissions_assignment_user_key;
alter table public.portal_learning_submissions
  add constraint portal_learning_submissions_assignment_user_key
  unique (assignment_id, user_id);

delete from public.portal_okrs a
using public.portal_okrs b
where a.id > b.id
  and a.user_id = b.user_id
  and a.year = b.year
  and a.quarter = b.quarter;

alter table public.portal_okrs
  drop constraint if exists portal_okrs_user_year_quarter_key;
alter table public.portal_okrs
  add constraint portal_okrs_user_year_quarter_key
  unique (user_id, year, quarter);

-- ── Grievance category constraint ─────────────────────────────────────────────
alter table public.portal_grievances
  drop constraint if exists portal_grievances_category_check;
alter table public.portal_grievances
  add constraint portal_grievances_category_check
  check (category in ('workplace', 'harassment', 'other'));

-- ── Getting started checklist: canonical directory paths ──────────────────────
update public.portal_onboarding_checklist
set link = '/people/directory?profile=1'
where id = 'ck_profile';

update public.portal_onboarding_checklist
set link = '/people/directory'
where id = 'ck_people';
