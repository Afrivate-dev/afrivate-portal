-- HR audit round 3: scoped leave/milestones/1:1 RLS, concurrent pulse+eNPS, learning resubmit.
-- Run after 20260706_hr_audit_round2.sql

-- ── Leave: managers see direct reports only (HR/admin see all) ────────────────
drop policy if exists "leave: own row or lead+" on public.portal_leave_requests;
drop policy if exists "leave: only leads+ can update status" on public.portal_leave_requests;

create policy "leave: read scoped" on public.portal_leave_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  );

create policy "leave: update scoped" on public.portal_leave_requests
  for update to authenticated
  using (
    public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  )
  with check (
    public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  );

-- ── Leave comments: align with leave visibility ─────────────────────────────
drop policy if exists "leave_comments: own leave or lead+" on public.portal_leave_comments;
drop policy if exists "leave_comments: insert own or lead+" on public.portal_leave_comments;

create policy "leave_comments: read scoped" on public.portal_leave_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.portal_leave_requests lr
      where lr.id = leave_id
        and (
          lr.user_id = auth.uid()
          or public.is_hr_or_admin()
          or public.is_direct_report_of(lr.user_id)
        )
    )
  );

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
          or public.is_direct_report_of(lr.user_id)
        )
    )
  );

-- ── Milestones: managers manage direct reports only ───────────────────────────
drop policy if exists "milestones: read own or lead+" on public.portal_onboarding_milestones;
drop policy if exists "milestones: lead+ manage" on public.portal_onboarding_milestones;

create policy "milestones: read scoped" on public.portal_onboarding_milestones
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.is_direct_report_of(user_id)
  );

create policy "milestones: manager manage reports" on public.portal_onboarding_milestones
  for all to authenticated
  using (public.is_hr_or_admin() or public.is_direct_report_of(user_id))
  with check (public.is_hr_or_admin() or public.is_direct_report_of(user_id));

-- ── 1:1 logs: managers read direct reports (not whole org) ────────────────────
drop policy if exists "one_on_one: read involved or lead+" on public.portal_one_on_one_logs;

create policy "one_on_one: read scoped" on public.portal_one_on_one_logs
  for select to authenticated
  using (
    employee_id = auth.uid()
    or manager_id = auth.uid()
    or public.is_hr_or_admin()
    or public.is_direct_report_of(employee_id)
  );

-- ── Learning: staff may update own row (resubmit after rejection) ─────────────
drop policy if exists "learning_submissions: update own" on public.portal_learning_submissions;
create policy "learning_submissions: update own" on public.portal_learning_submissions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Pulse surveys: one active per type (pulse + eNPS can coexist) ─────────────
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

  update public.portal_pulse_surveys
    set active = false
    where active = true
      and survey_type = p_survey_type;

  insert into public.portal_pulse_surveys (
    id, title, description, survey_type, questions, active, opens_at, closes_at, created_by
  ) values (
    p_id, p_title, p_description, p_survey_type, p_questions, true, p_opens_at, p_closes_at, auth.uid()
  );

  return p_id;
end;
$fn$;
