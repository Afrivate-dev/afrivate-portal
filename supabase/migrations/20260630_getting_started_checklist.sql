-- Seed user-friendly getting started checklist (safe to re-run).
insert into public.portal_onboarding_checklist (id, label, link, sort_order)
values
  ('ck_profile', 'Add your photo and contact details', '/directory?profile=1', 1),
  ('ck_handbook', 'Browse the staff resources library', '/documents', 2),
  ('ck_videos', 'Watch the welcome onboarding videos', '/onboarding', 3),
  ('ck_checkin', 'Submit your first weekly check-in', '/checkin', 4),
  ('ck_people', 'Find your team lead in the directory', '/directory', 5),
  ('ck_memos', 'Read the latest team memos', '/announcements', 6)
on conflict (id) do update set
  label = excluded.label,
  link = excluded.link,
  sort_order = excluded.sort_order;
