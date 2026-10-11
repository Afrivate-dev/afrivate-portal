-- 2026-10-12 — Task categories: any signed-in user can add, HR/admin manage.
--
-- Changes:
--   1. INSERT policy relaxed from `is_lead_or_above()` → any authenticated user.
--   2. UPDATE and DELETE tightened from `is_lead_or_above()` → `is_hr_or_admin()`
--      so team leads can propose categories but only HR/admin curate the list.
--   3. Case-insensitive UNIQUE constraint on `label` so two staff creating
--      "Fundraising" and "fundraising" from different tabs don't produce
--      duplicate rows.
--   4. Seed the full company-wide default set, keeping the historical
--      dev-focused ids so pre-existing tasks still render correctly.
--
-- Idempotent and safe to re-run. No existing rows are modified.

create table if not exists public.portal_task_categories (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portal_task_categories enable row level security;

-- ─── Policies ───────────────────────────────────────────────────────────────
drop policy if exists "task_categories: all read"    on public.portal_task_categories;
drop policy if exists "task_categories: lead+ insert" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ update" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ delete" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ write"  on public.portal_task_categories;
drop policy if exists "task_categories: all insert"   on public.portal_task_categories;
drop policy if exists "task_categories: hr+ update"   on public.portal_task_categories;
drop policy if exists "task_categories: hr+ delete"   on public.portal_task_categories;

create policy "task_categories: all read"
  on public.portal_task_categories for select
  to authenticated
  using (auth.uid() is not null);

-- Any signed-in team member may add a new category from the task form.
create policy "task_categories: all insert"
  on public.portal_task_categories for insert
  to authenticated
  with check (auth.uid() is not null);

-- Only HR / admin may rename or remove categories.
create policy "task_categories: hr+ update"
  on public.portal_task_categories for update
  to authenticated
  using (public.is_hr_or_admin());

create policy "task_categories: hr+ delete"
  on public.portal_task_categories for delete
  to authenticated
  using (public.is_hr_or_admin());

revoke all on public.portal_task_categories from anon;
grant select, insert, update, delete on public.portal_task_categories to authenticated;

-- ─── Case-insensitive dedupe ────────────────────────────────────────────────
-- Only create the index when no duplicate labels already exist; otherwise the
-- index creation would fail and the migration would error on legacy data.
do $do$
declare
  v_dupes int;
begin
  if to_regclass('public.portal_task_categories') is not null then
    select coalesce(sum(c - 1), 0)
      into v_dupes
      from (
        select count(*) as c
          from public.portal_task_categories
         group by lower(label)
      ) t
     where c > 1;

    if v_dupes = 0 then
      execute 'create unique index if not exists portal_task_categories_label_lower_key
                 on public.portal_task_categories (lower(label))';
    end if;
  end if;
end $do$;

-- ─── Seed company-wide defaults ─────────────────────────────────────────────
-- Legacy ids kept so existing tasks still render with sensible labels.
insert into public.portal_task_categories (id, label, sort_order) values
  ('general',            'General',                      1),
  ('human_resources',    'Human Resources',              2),
  ('admin',              'Operations',                   3),
  ('finance',            'Finance',                      4),
  ('communications',     'Communications',               5),
  ('marketing_media',    'Marketing and Media',          6),
  ('partnerships',       'Partnerships and Outreach',    7),
  ('records',            'Records',                      8),
  ('learning_dev',       'Learning and Development',     9),
  ('design',             'Design',                      10),
  ('product',            'Product',                     11),
  ('frontend',           'Frontend',                    12),
  ('backend',            'Backend',                     13),
  ('react',              'React / Frontend',            14),
  ('wordpress',          'WordPress',                   15),
  ('performance',        'Performance',                 16),
  ('nodejs',             'Node.js',                     17),
  ('freelance',          'Freelance',                   18),
  ('other',              'Other',                       19)
on conflict (id) do nothing;
