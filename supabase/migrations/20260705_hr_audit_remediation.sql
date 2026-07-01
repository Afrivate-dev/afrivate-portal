-- HR audit remediation: RLS fixes, privacy, realtime, enum constraints.
-- Run after 20260704_hr_operations.sql

-- ── Pulse survey writes: HR-only (match UI) ─────────────────────────────────
drop policy if exists "pulse_surveys: lead+ write" on public.portal_pulse_surveys;
create policy "pulse_surveys: hr+ write" on public.portal_pulse_surveys
  for all to authenticated
  using (public.is_hr_or_admin())
  with check (public.is_hr_or_admin());

-- ── Pulse responses: own update (upsert) + HR-only read of others ───────────
drop policy if exists "pulse_responses: read own or lead+" on public.portal_pulse_responses;
create policy "pulse_responses: read own or hr+" on public.portal_pulse_responses
  for select to authenticated
  using (user_id = auth.uid() or public.is_hr_or_admin());

create policy "pulse_responses: update own" on public.portal_pulse_responses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── 360° feedback: reviewer may update own entry (upsert) ───────────────────
drop policy if exists "feedback_entries: update reviewer" on public.portal_feedback_entries;
create policy "feedback_entries: update reviewer" on public.portal_feedback_entries
  for update to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

-- ── Onboarding milestones: staff seed & complete own items ──────────────────
drop policy if exists "milestones: lead+ write" on public.portal_onboarding_milestones;

create policy "milestones: insert own" on public.portal_onboarding_milestones
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "milestones: update own" on public.portal_onboarding_milestones
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "milestones: lead+ manage" on public.portal_onboarding_milestones
  for all to authenticated
  using (public.is_lead_or_above())
  with check (public.is_lead_or_above());

-- ── Enum-like constraints on free-text columns ──────────────────────────────
alter table public.portal_job_candidates
  drop constraint if exists portal_job_candidates_stage_check;
alter table public.portal_job_candidates
  add constraint portal_job_candidates_stage_check
  check (stage in ('applied', 'screen', 'interview', 'offer', 'hired', 'rejected'));

alter table public.portal_quarterly_awards
  drop constraint if exists portal_quarterly_awards_category_check;
alter table public.portal_quarterly_awards
  add constraint portal_quarterly_awards_category_check
  check (category in ('innovation', 'team_spirit', 'most_improved', 'embodied_the_way'));

-- ── Realtime: all HR operational tables ─────────────────────────────────────
do $do$
declare
  t text;
begin
  foreach t in array array[
    'portal_pulse_surveys',
    'portal_pulse_responses',
    'portal_learning_assignments',
    'portal_learning_submissions',
    'portal_document_acknowledgments',
    'portal_okrs',
    'portal_one_on_one_logs',
    'portal_idps',
    'portal_feedback_cycles',
    'portal_feedback_entries',
    'portal_job_requisitions',
    'portal_job_candidates',
    'portal_grievances',
    'portal_onboarding_milestones',
    'portal_quarterly_awards',
    'portal_exit_interviews'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end if;
  end loop;
end $do$;
