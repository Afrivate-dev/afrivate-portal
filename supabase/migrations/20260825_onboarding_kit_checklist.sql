-- Expand Getting started checklist to match AFRI-ONB-01 / AFRI-EOH-01 first week.
-- Safe to re-run. Existing progress rows keep completed ids; new items start unchecked.

insert into public.portal_onboarding_checklist (id, label, link, sort_order)
values
  ('ck_profile', 'Add your photo and contact details', '/people/directory?profile=1', 1),
  ('ck_myinfo', 'Complete My Info (including emergency contact)', '/people/my-info', 2),
  ('ck_people', 'Find your team lead in the directory', '/people/directory', 3),
  ('ck_videos', 'Watch the welcome onboarding videos', '/onboarding', 4),
  ('ck_slack', 'Join Slack and set your name and photo', null, 5),
  ('ck_handbook', 'Browse the staff resources library', '/documents', 6),
  ('ck_policies', 'Acknowledge required policies in Resources', '/documents', 7),
  ('ck_tasks', 'Review your assigned work in My work', '/tasks', 8),
  ('ck_okrs', 'Record 3–5 KPIs in Growth', '/people/growth?tab=okrs', 9),
  ('ck_checkin', 'Submit your first weekly check-in', '/checkin', 10),
  ('ck_learning', 'Complete assigned learning (if any)', '/people/learning', 11),
  ('ck_memos', 'Read the latest team memos', '/announcements', 12)
on conflict (id) do update set
  label = excluded.label,
  link = excluded.link,
  sort_order = excluded.sort_order;
