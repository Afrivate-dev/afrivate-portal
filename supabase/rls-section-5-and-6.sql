-- NerdzFactory portal — run in Supabase Dashboard → SQL → New query
-- After §4.1 (`profiles` table). Implements setup doc §5 (profiles RLS) + §6 (private Realtime).
--
-- SECTION 5 — Row Level Security on `public.profiles`
-- Only logged-in Supabase users (`authenticated` role) can read/insert/update.
-- Anonymous visitors (anon key without login) get no access via PostgREST.

alter table public.profiles enable row level security;

-- Remove §4.1 sample policies if present; safe if names differ (drop returns no error for missing in PG... actually DROP POLICY IF EXISTS is required)
drop policy if exists "Users can read profiles in their org" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_insert_own_row" on public.profiles;
drop policy if exists "profiles_update_own_row" on public.profiles;

create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles_insert_own_row"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own_row"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id);

revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;

-- Optional: backfill one staff row (replace id/email with your auth.users id + email).
-- insert into public.profiles (id, email, name, role, department, job_title)
-- values (
--   '8b4e560d-8042-4631-84c8-d793d4fa1bd2',
--   'emmanuel@nerdzfactory.co',
--   'Emmanuel Okpiaifo',
--   'admin',
--   'Communications',
--   'Technology, Design and Media Associate'
-- )
-- on conflict (id) do nothing;


-- SECTION 6 — Private Realtime channel `nf-portal-workspace`
-- You MUST turn off "Allow public access" in Dashboard → Realtime → Settings
-- after these policies exist; otherwise private channels are not enforced.
-- The portal uses topic name exactly: nf-portal-workspace (see CollabContext.tsx).

alter table realtime.messages enable row level security;

drop policy if exists "nf_portal_collab_select" on realtime.messages;
drop policy if exists "nf_portal_collab_insert" on realtime.messages;

create policy "nf_portal_collab_select"
  on realtime.messages
  for select
  to authenticated
  using (
    (select realtime.topic()) = 'nf-portal-workspace'
    and realtime.messages.extension in ('broadcast', 'presence')
  );

create policy "nf_portal_collab_insert"
  on realtime.messages
  for insert
  to authenticated
  with check (
    (select realtime.topic()) = 'nf-portal-workspace'
    and realtime.messages.extension in ('broadcast', 'presence')
  );
