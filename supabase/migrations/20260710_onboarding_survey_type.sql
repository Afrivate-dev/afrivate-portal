-- Allow the 'onboarding' pulse survey type (onboarding satisfaction survey).
-- Run after 20260709_hr_audit_round4.sql
--
-- Adds 'onboarding' to the survey_type CHECK on live surveys and templates,
-- and seeds a default onboarding satisfaction template. This feeds the
-- "Onboarding CSAT" KPI on the HR dashboard.

-- ── Live surveys: widen survey_type CHECK ───────────────────────────────────
alter table public.portal_pulse_surveys
  drop constraint if exists portal_pulse_surveys_survey_type_check;
alter table public.portal_pulse_surveys
  add constraint portal_pulse_surveys_survey_type_check
  check (survey_type in ('pulse', 'enps', 'onboarding'));

-- ── Templates: widen survey_type CHECK ──────────────────────────────────────
alter table public.portal_pulse_survey_templates
  drop constraint if exists portal_pulse_survey_templates_survey_type_check;
alter table public.portal_pulse_survey_templates
  add constraint portal_pulse_survey_templates_survey_type_check
  check (survey_type in ('pulse', 'enps', 'onboarding'));

-- ── Seed the onboarding satisfaction template ───────────────────────────────
insert into public.portal_pulse_survey_templates (id, label, survey_type, description, questions, sort_order)
values (
  'tpl_onboarding_satisfaction',
  'Onboarding satisfaction',
  'onboarding',
  'For new joiners — how was your first-weeks experience at AfriVate?',
  '[
    {"id":"welcome","text":"How welcomed did you feel? (1–10)","type":"scale","min":1,"max":10},
    {"id":"clarity","text":"How clear were your role and first tasks? (1–10)","type":"scale","min":1,"max":10},
    {"id":"support","text":"How well-supported were you by your manager and team? (1–10)","type":"scale","min":1,"max":10},
    {"id":"note","text":"Anything we could improve about onboarding? (optional)","type":"text"}
  ]'::jsonb,
  3
)
on conflict (id) do nothing;
