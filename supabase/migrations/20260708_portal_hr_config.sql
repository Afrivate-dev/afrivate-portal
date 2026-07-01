-- HR/admin-managed portal labels: awards, grievances, exit reasons, memo types.
-- Tighten existing category/tag tables to HR+ write. Run after 20260707.

-- ── Config tables ─────────────────────────────────────────────────────────────
create table if not exists public.portal_award_categories (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_grievance_categories (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_exit_reasons (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_memo_categories (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portal_award_categories enable row level security;
alter table public.portal_grievance_categories enable row level security;
alter table public.portal_exit_reasons enable row level security;
alter table public.portal_memo_categories enable row level security;

create policy "award_categories: read" on public.portal_award_categories
  for select to authenticated using (true);
create policy "award_categories: hr+ write" on public.portal_award_categories
  for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

create policy "grievance_categories: read" on public.portal_grievance_categories
  for select to authenticated using (true);
create policy "grievance_categories: hr+ write" on public.portal_grievance_categories
  for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

create policy "exit_reasons: read" on public.portal_exit_reasons
  for select to authenticated using (true);
create policy "exit_reasons: hr+ write" on public.portal_exit_reasons
  for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

create policy "memo_categories: read" on public.portal_memo_categories
  for select to authenticated using (true);
create policy "memo_categories: hr+ write" on public.portal_memo_categories
  for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

grant select, insert, update, delete on
  public.portal_award_categories,
  public.portal_grievance_categories,
  public.portal_exit_reasons,
  public.portal_memo_categories
to authenticated;

insert into public.portal_award_categories (id, label, sort_order) values
  ('innovation', 'Innovation', 1),
  ('team_spirit', 'Team Spirit', 2),
  ('most_improved', 'Most Improved', 3),
  ('embodied_the_way', 'Embodied the Way', 4)
on conflict (id) do nothing;

insert into public.portal_grievance_categories (id, label, sort_order) values
  ('workplace', 'Workplace concern', 1),
  ('harassment', 'Harassment or safety', 2),
  ('other', 'Other', 3)
on conflict (id) do nothing;

insert into public.portal_exit_reasons (id, label, sort_order) values
  ('better_opportunity', 'Better opportunity', 1),
  ('compensation', 'Compensation', 2),
  ('work_life_balance', 'Work-life balance', 3),
  ('relocation', 'Relocation', 4),
  ('career_change', 'Career change', 5),
  ('management_or_culture', 'Management or culture', 6),
  ('role_fit', 'Role fit', 7),
  ('personal_reasons', 'Personal reasons', 8),
  ('retirement', 'Retirement', 9),
  ('other', 'Other', 10)
on conflict (id) do nothing;

insert into public.portal_memo_categories (id, label, sort_order) values
  ('general', 'General memo', 1),
  ('digest', 'HR digest (email mirror)', 2),
  ('policy', 'Policy notice', 3)
on conflict (id) do nothing;

-- Drop fixed enum checks — values now come from config tables
alter table public.portal_quarterly_awards
  drop constraint if exists portal_quarterly_awards_category_check;
alter table public.portal_grievances
  drop constraint if exists portal_grievances_category_check;
alter table public.portal_announcements
  drop constraint if exists portal_announcements_memo_category_check;

-- ── Pulse / eNPS survey templates (HR-managed question sets) ────────────────
create table if not exists public.portal_pulse_survey_templates (
  id           text primary key,
  label        text not null,
  survey_type  text not null check (survey_type in ('pulse', 'enps')),
  description  text,
  questions    jsonb not null default '[]',
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.portal_pulse_survey_templates enable row level security;

create policy "pulse_templates: read" on public.portal_pulse_survey_templates
  for select to authenticated using (true);
create policy "pulse_templates: hr+ write" on public.portal_pulse_survey_templates
  for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

grant select, insert, update, delete on public.portal_pulse_survey_templates to authenticated;

insert into public.portal_pulse_survey_templates (id, label, survey_type, description, questions, sort_order) values
  (
    'tpl_monthly_pulse',
    'Monthly pulse check',
    'pulse',
    'Standard monthly engagement pulse',
    '[
      {"id":"eng","text":"Engagement this month (1–10)","type":"scale","min":1,"max":10},
      {"id":"need","text":"Do you have what you need? (1–10)","type":"scale","min":1,"max":10},
      {"id":"note","text":"Optional comment","type":"text"}
    ]'::jsonb,
    1
  ),
  (
    'tpl_quarterly_enps',
    'Quarterly eNPS',
    'enps',
    'How likely are you to recommend AfriVate as a place to work?',
    '[
      {"id":"nps","text":"Recommendation score (0–10)","type":"scale","min":0,"max":10},
      {"id":"why","text":"What is the main reason for your score? (optional)","type":"text"}
    ]'::jsonb,
    2
  )
on conflict (id) do nothing;

-- Realtime for config tables
do $do$
declare
  t text;
begin
  foreach t in array array[
    'portal_award_categories',
    'portal_grievance_categories',
    'portal_exit_reasons',
    'portal_memo_categories',
    'portal_document_categories',
    'portal_recognition_tags',
    'portal_task_categories',
    'portal_pulse_survey_templates'
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

-- ── Existing label tables: HR+ write only ─────────────────────────────────────
drop policy if exists "doc_categories: lead+ insert" on public.portal_document_categories;
drop policy if exists "doc_categories: lead+ update" on public.portal_document_categories;
drop policy if exists "doc_categories: lead+ delete" on public.portal_document_categories;
drop policy if exists "rec_tags: lead+ insert" on public.portal_recognition_tags;
drop policy if exists "rec_tags: lead+ update" on public.portal_recognition_tags;
drop policy if exists "rec_tags: lead+ delete" on public.portal_recognition_tags;
drop policy if exists "task_categories: lead+ insert" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ update" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ delete" on public.portal_task_categories;

create policy "doc_categories: hr+ insert" on public.portal_document_categories
  for insert to authenticated with check (public.is_hr_or_admin());
create policy "doc_categories: hr+ update" on public.portal_document_categories
  for update to authenticated using (public.is_hr_or_admin());
create policy "doc_categories: hr+ delete" on public.portal_document_categories
  for delete to authenticated using (public.is_hr_or_admin());

create policy "rec_tags: hr+ insert" on public.portal_recognition_tags
  for insert to authenticated with check (public.is_hr_or_admin());
create policy "rec_tags: hr+ update" on public.portal_recognition_tags
  for update to authenticated using (public.is_hr_or_admin());
create policy "rec_tags: hr+ delete" on public.portal_recognition_tags
  for delete to authenticated using (public.is_hr_or_admin());

create policy "task_categories: hr+ insert" on public.portal_task_categories
  for insert to authenticated with check (public.is_hr_or_admin());
create policy "task_categories: hr+ update" on public.portal_task_categories
  for update to authenticated using (public.is_hr_or_admin());
create policy "task_categories: hr+ delete" on public.portal_task_categories
  for delete to authenticated using (public.is_hr_or_admin());
