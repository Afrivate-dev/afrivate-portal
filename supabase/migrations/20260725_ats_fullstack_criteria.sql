-- Allow Full-Stack ATS scoring criteria profile.
alter table public.portal_ats_criteria
  drop constraint if exists portal_ats_criteria_role_profile_check;

alter table public.portal_ats_criteria
  add constraint portal_ats_criteria_role_profile_check
  check (role_profile in ('frontend', 'backend', 'fullstack', 'designer', 'general'));
