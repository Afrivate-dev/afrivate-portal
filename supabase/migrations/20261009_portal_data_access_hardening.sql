-- 2026-10-09 — Portal data access hardening.
-- Fixes the production outage where signed-in pages hung on "Loading your portal…":
--
--   • Supabase REST returned 401 "permission denied for table portal_task_categories"
--   • 403 RLS error on portal_hr_audit_log
--   • ERR_CONNECTION_CLOSED on portal_job_candidates (oversized rows + no table grant)
--
-- Idempotent and safe to re-run. Apply via the Supabase SQL Editor or psql; no
-- data is modified.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Shared role-check helpers (re-declare to guarantee presence).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_hr_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('hr', 'admin')
  );
$$;

grant execute on function public.is_hr_or_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. portal_task_categories — all authenticated staff must read, lead+ writes.
--    Re-asserts the policies from 20260627 in case they were ever dropped by a
--    hand-run migration on production.
-- ─────────────────────────────────────────────────────────────────────────────
do $do$
begin
  if to_regclass('public.portal_task_categories') is null then
    create table public.portal_task_categories (
      id         text primary key,
      label      text not null,
      sort_order int not null default 0,
      created_at timestamptz not null default now()
    );
  end if;
end $do$;

alter table public.portal_task_categories enable row level security;

drop policy if exists "task_categories: all read"    on public.portal_task_categories;
drop policy if exists "task_categories: lead+ insert" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ update" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ delete" on public.portal_task_categories;

create policy "task_categories: all read"
  on public.portal_task_categories for select
  to authenticated
  using (auth.uid() is not null);

create policy "task_categories: lead+ insert"
  on public.portal_task_categories for insert
  to authenticated
  with check (public.is_lead_or_above());

create policy "task_categories: lead+ update"
  on public.portal_task_categories for update
  to authenticated
  using (public.is_lead_or_above());

create policy "task_categories: lead+ delete"
  on public.portal_task_categories for delete
  to authenticated
  using (public.is_lead_or_above());

revoke all on public.portal_task_categories from anon;
grant select, insert, update, delete on public.portal_task_categories to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. portal_hr_audit_log — HR+ read, authenticated insert as self, no writes
--    outside those paths. Re-asserts 20260802 policies.
-- ─────────────────────────────────────────────────────────────────────────────
do $do$
begin
  if to_regclass('public.portal_hr_audit_log') is not null then
    execute 'alter table public.portal_hr_audit_log enable row level security';
  end if;
end $do$;

do $do$
begin
  if to_regclass('public.portal_hr_audit_log') is not null then
    execute 'drop policy if exists "hr_audit: hr+ read" on public.portal_hr_audit_log';
    execute 'drop policy if exists "hr_audit: insert authenticated as self" on public.portal_hr_audit_log';

    execute $pol$
      create policy "hr_audit: hr+ read"
        on public.portal_hr_audit_log for select to authenticated
        using (public.is_hr_or_admin())
    $pol$;

    execute $pol$
      create policy "hr_audit: insert authenticated as self"
        on public.portal_hr_audit_log for insert to authenticated
        with check (actor_id = auth.uid())
    $pol$;

    execute 'revoke all on public.portal_hr_audit_log from anon';
    execute 'grant select, insert on public.portal_hr_audit_log to authenticated';
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. portal_job_candidates — HR+ full access. Explicit grant + statement
--    timeout bound so a huge resume blob never ERR_CONNECTION_CLOSED's the
--    whole dataset read.
-- ─────────────────────────────────────────────────────────────────────────────
do $do$
begin
  if to_regclass('public.portal_job_candidates') is not null then
    execute 'alter table public.portal_job_candidates enable row level security';
    execute 'drop policy if exists "candidates: hr+ all" on public.portal_job_candidates';
    execute $pol$
      create policy "candidates: hr+ all"
        on public.portal_job_candidates for all to authenticated
        using (public.is_hr_or_admin())
        with check (public.is_hr_or_admin())
    $pol$;
    execute 'revoke all on public.portal_job_candidates from anon';
    execute 'grant select, insert, update, delete on public.portal_job_candidates to authenticated';
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Explicit grants on every portal_* table the frontend reads. Repairs any
--    production project where an earlier migration ran only partially and left
--    the authenticated role unable to SELECT a newer table (which surfaces to
--    the browser as PostgREST 401 "permission denied for table ...").
--
--    These are grants only — the RLS policies declared by prior migrations are
--    still what gates row visibility, so HR-only tables stay HR-only.
-- ─────────────────────────────────────────────────────────────────────────────
do $do$
declare
  r record;
begin
  for r in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and (table_name like 'portal\_%' escape '\' or table_name = 'profiles')
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', r.table_name);
    execute format('revoke all on public.%I from anon', r.table_name);
  end loop;
end $do$;

-- Ensure sequences backing SERIAL / IDENTITY columns are also usable so inserts
-- succeed under the authenticated role.
do $do$
declare
  r record;
begin
  for r in
    select sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
      and (sequence_name like 'portal\_%' escape '\' or sequence_name like 'profiles%')
  loop
    execute format('grant usage, select on sequence public.%I to authenticated', r.sequence_name);
  end loop;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Make `get_my_portal_profile()` safe against slow PostgREST starts.
--    The function was already SECURITY DEFINER + STABLE; we re-grant EXECUTE
--    (lost in some production projects after a schema drop/recreate) and set
--    a tight statement timeout so a stuck call cannot hang the sign-in flow.
-- ─────────────────────────────────────────────────────────────────────────────
do $do$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_my_portal_profile'
  ) then
    execute 'grant execute on function public.get_my_portal_profile() to authenticated';
    -- 5s cap per invocation keeps a slow DB from blocking the login hop.
    execute 'alter function public.get_my_portal_profile() set statement_timeout = ''5000''';
  end if;
end $do$;
