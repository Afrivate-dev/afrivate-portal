-- Personnel questionnaire blob on employee files (My info rebuild + HR export).

alter table public.portal_employee_profiles
  add column if not exists questionnaire jsonb not null default '{}'::jsonb;
