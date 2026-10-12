-- 2026-10-13 — Audit fixes (idempotent).
--
-- 1. Task category saves were rejected (HTTP 400) when a check constraint
--    still limited portal_tasks.category to the old dev list. Drop those
--    checks so company-wide ids such as "partnerships" can be saved.
-- 2. Every active profile gets an employee file if one is missing.
-- 3. Peace Udotong's employee-file start date is 15 Oct 2025.
-- 4. Nobody can report to themselves.
-- 5. Empty duplicate open requisitions are closed so the open count is real.

-- ── Tasks: category is free text, not a short allow-list ────────────────────
alter table public.portal_tasks
  alter column category type text;

do $do$
declare
  r record;
begin
  if to_regclass('public.portal_tasks') is null then
    return;
  end if;
  for r in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'portal_tasks'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%category%'
  loop
    execute format('alter table public.portal_tasks drop constraint %I', r.conname);
  end loop;
end
$do$;

insert into public.portal_task_categories (id, label, sort_order) values
  ('partnerships', 'Partnerships and Outreach', 7)
on conflict (id) do nothing;

-- ── Employee files for every active person ──────────────────────────────────
insert into public.portal_employee_profiles (
  id,
  user_id,
  engagement_type,
  employment_status,
  archived,
  profile_completeness
)
select
  'epr_' || p.id::text,
  p.id,
  'employee',
  'active',
  false,
  0
from public.profiles p
where p.active is true
  and not exists (
    select 1
    from public.portal_employee_profiles e
    where e.user_id = p.id
  )
on conflict (user_id) do nothing;

-- Peace Udotong — start date from the hand-dated HR letter (15 Oct 2025).
-- Match the directory name only. Do not rewrite anyone else's dates or notes.
update public.portal_employee_profiles e
set
  start_date = date '2025-10-15',
  archived = false,
  employment_status = case
    when e.employment_status = 'archived' then 'active'
    else e.employment_status
  end,
  updated_at = now()
from public.profiles p
where e.user_id = p.id
  and lower(trim(p.name)) = 'peace udotong';

-- ── Block self-reporting ────────────────────────────────────────────────────
update public.profiles
set reports_to_id = null,
    updated_at = now()
where reports_to_id is not null
  and reports_to_id = id;

create or replace function public.profiles_block_self_report()
returns trigger
language plpgsql
as $$
begin
  if new.reports_to_id is not null and new.reports_to_id = new.id then
    new.reports_to_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_no_self_report on public.profiles;
create trigger profiles_no_self_report
  before insert or update of reports_to_id on public.profiles
  for each row
  execute function public.profiles_block_self_report();

-- ── Recruitment: close empty duplicate open roles ───────────────────────────
-- Keeps the oldest open row per title + department. Rows that already have
-- candidates are left open so applications are not detached.
with ranked as (
  select
    j.id,
    row_number() over (
      partition by lower(trim(j.title)), lower(trim(coalesce(j.department, '')))
      order by j.created_at asc
    ) as rn,
    (
      select count(*)
      from public.portal_job_candidates c
      where c.requisition_id = j.id
    ) as candidate_count
  from public.portal_job_requisitions j
  where j.status = 'open'
)
update public.portal_job_requisitions j
set status = 'closed'
from ranked r
where j.id = r.id
  and r.rn > 1
  and r.candidate_count = 0;
