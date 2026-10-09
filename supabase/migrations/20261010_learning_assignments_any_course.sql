-- 2026-10-10 — Generalise learning assignments: any course link, platform,
-- duration minutes. Historical rows that only have `alison_url` continue to
-- work because the frontend reads `course_url` first and falls back to it.
--
-- Idempotent. Safe to re-run. No rows are modified.

alter table public.portal_learning_assignments
  add column if not exists course_url text,
  add column if not exists platform text,
  add column if not exists duration_minutes integer;

-- Backfill course_url from alison_url so older rows render correctly after
-- deploy (the UI still falls back on the client, but keeping the DB in sync
-- means CSV exports / SQL reports don't have blank URL columns).
update public.portal_learning_assignments
   set course_url = alison_url
 where course_url is null
   and alison_url is not null
   and alison_url <> '';

-- The `alison_url` column was `not null` in 20260704_hr_operations.sql, which
-- blocks courses hosted elsewhere. Drop that constraint; the frontend writes
-- both columns in parallel so we never see NULLs in practice.
do $do$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'portal_learning_assignments'
      and column_name = 'alison_url'
      and is_nullable = 'NO'
  ) then
    execute 'alter table public.portal_learning_assignments alter column alison_url drop not null';
  end if;
end $do$;

-- Policies and grants were set in 20260704_hr_operations.sql; nothing to add.
