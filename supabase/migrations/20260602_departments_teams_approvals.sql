-- AfriVate portal — Departments, Teams v2, and Approval workflow
-- Run in Supabase Dashboard → SQL Editor → New query
-- Run AFTER the original migration (20260518120000_portal_data_tables.sql)

-- -----------------------------------------------------------------------
-- 1. DEPARTMENTS
-- -----------------------------------------------------------------------
create table if not exists public.portal_departments (
  id         text primary key,
  name       text not null,
  description text,
  head_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.portal_departments enable row level security;
drop policy if exists "dept_select" on public.portal_departments;
drop policy if exists "dept_insert" on public.portal_departments;
drop policy if exists "dept_update" on public.portal_departments;
drop policy if exists "dept_delete" on public.portal_departments;
create policy "dept_select" on public.portal_departments for select to authenticated using (true);
create policy "dept_insert" on public.portal_departments for insert to authenticated with check (true);
create policy "dept_update" on public.portal_departments for update to authenticated using (true) with check (true);
create policy "dept_delete" on public.portal_departments for delete to authenticated using (true);

revoke all on public.portal_departments from anon;
grant select, insert, update, delete on public.portal_departments to authenticated;

-- -----------------------------------------------------------------------
-- 2. EXTEND TEAMS — add department, lead, and assistant lead
-- -----------------------------------------------------------------------
alter table public.portal_teams
  add column if not exists department_id   text references public.portal_departments (id) on delete set null,
  add column if not exists lead_user_id    uuid references auth.users (id) on delete set null,
  add column if not exists asst_lead_user_id uuid references auth.users (id) on delete set null;

-- Remove the seeded dummy teams from the original migration
delete from public.portal_teams where id in ('team_eng', 'team_design', 'team_ops');

-- -----------------------------------------------------------------------
-- 3. APPROVAL WORKFLOW — new accounts start inactive
-- -----------------------------------------------------------------------

-- Add approved_at column so admin can see when they approved
alter table public.profiles
  add column if not exists approved_at timestamptz;

-- Trigger: when a new auth user is created, insert a pending profile row
-- (active = false by default from the profiles table definition)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, department, job_title, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'staff',
    'Unassigned',
    'Staff',
    false   -- ← requires admin approval before they can access the portal
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------
-- 4. UPDATE HELPER FUNCTION — include assistant_lead in lead checks
-- -----------------------------------------------------------------------
create or replace function public.is_hr_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
    and p.role in ('hr', 'admin')
  );
$$;

create or replace function public.is_lead_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
    and p.role in ('team_lead', 'assistant_lead', 'hr', 'admin')
  );
$$;

-- -----------------------------------------------------------------------
-- 5. UPDATE PROFILES — allow admin to approve any row
-- -----------------------------------------------------------------------
drop policy if exists "profiles_update_hr_admin" on public.profiles;
create policy "profiles_update_hr_admin"
  on public.profiles for update to authenticated
  using (public.is_hr_or_admin());
