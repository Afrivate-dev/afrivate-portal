-- Portal domain tables + permissive RLS for authenticated users (single-org internal tool).
-- Run after `profiles` exists. Then set VITE_USE_SUPABASE_DATA=true in the portal.
--
-- Tighten policies (owner-only, HR-only) before exposing broadly.

-- ---- Extend profiles for directory fields (AuthContext already uses some) ----
alter table public.profiles add column if not exists joined_at date;
alter table public.profiles add column if not exists avatar_color text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists work_location text;
alter table public.profiles add column if not exists pronouns text;
alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists reports_to_id uuid references public.profiles (id) on delete set null;

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

-- HR/admin may update any profile (directory edits); own-row policy stays from rls-section-5-and-6
drop policy if exists "profiles_update_hr_admin" on public.profiles;
create policy "profiles_update_hr_admin"
  on public.profiles for update to authenticated
  using (public.is_hr_or_admin());

-- ---- Domain tables ----
create table if not exists public.portal_tasks (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  assignee_id uuid references auth.users (id) on delete set null,
  title text not null,
  description text,
  status text not null,
  priority text not null,
  category text not null,
  due_date date,
  hours_logged numeric,
  estimated_hours numeric,
  blockers text,
  activity jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_weekly_check_ins (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  completed text not null,
  next_week text not null,
  blockers text,
  hours_worked numeric not null default 0,
  submitted_at timestamptz not null default now()
);

create table if not exists public.portal_announcements (
  id text primary key,
  title text not null,
  body text not null,
  audience text not null default 'all',
  priority text not null default 'info',
  posted_by_id uuid not null references auth.users (id) on delete cascade,
  posted_at timestamptz not null default now(),
  read_by jsonb not null default '[]'::jsonb,
  media jsonb default '[]'::jsonb
);

create table if not exists public.portal_leave_requests (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  supporting_doc_name text,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_by_id uuid references auth.users (id) on delete set null,
  reviewer_note text
);

create table if not exists public.portal_onboarding_videos (
  id text primary key,
  title text not null,
  section text not null,
  description text not null default '',
  youtube_url text not null,
  duration text not null,
  sort_order int not null default 0
);

create table if not exists public.portal_onboarding_checklist (
  id text primary key,
  label text not null,
  link text,
  sort_order int not null default 0
);

create table if not exists public.portal_onboarding_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  watched_video_ids jsonb not null default '[]'::jsonb,
  completed_checklist_ids jsonb not null default '[]'::jsonb
);

create table if not exists public.portal_documents (
  id text primary key,
  title text not null,
  description text,
  category text not null,
  file_name text not null,
  file_size text not null,
  uploaded_by_id uuid not null references auth.users (id) on delete cascade,
  uploaded_at timestamptz not null default now(),
  hr_only boolean not null default false,
  management_only boolean not null default false
);

create table if not exists public.portal_recognition_posts (
  id text primary key,
  giver_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  tag text not null,
  created_at timestamptz not null default now(),
  reacted_by jsonb not null default '[]'::jsonb
);

create table if not exists public.portal_inbox_notifications (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text not null default '/',
  read boolean not null default false,
  created_at timestamptz not null default now(),
  from_user_id uuid references auth.users (id) on delete set null,
  task_id text references public.portal_tasks (id) on delete set null,
  recognition_id text references public.portal_recognition_posts (id) on delete set null
);

create table if not exists public.portal_events (
  id text primary key,
  title text not null,
  description text,
  event_date date not null,
  start_time text,
  end_time text,
  location text,
  audience text not null default 'all',
  source text not null default 'workspace'
);

create table if not exists public.portal_teams (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_team_members (
  team_id text not null references public.portal_teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (team_id, user_id)
);

-- ---- RLS ----
alter table public.portal_tasks enable row level security;
alter table public.portal_weekly_check_ins enable row level security;
alter table public.portal_announcements enable row level security;
alter table public.portal_leave_requests enable row level security;
alter table public.portal_onboarding_videos enable row level security;
alter table public.portal_onboarding_checklist enable row level security;
alter table public.portal_onboarding_progress enable row level security;
alter table public.portal_documents enable row level security;
alter table public.portal_recognition_posts enable row level security;
alter table public.portal_inbox_notifications enable row level security;
alter table public.portal_events enable row level security;
alter table public.portal_teams enable row level security;
alter table public.portal_team_members enable row level security;

-- Permissive: any signed-in user (JWT) may read/write portal domain data.
-- Replace with stricter rules per table when you need isolation.
do $do$
declare
  t text;
  tables text[] := array[
    'portal_tasks',
    'portal_weekly_check_ins',
    'portal_announcements',
    'portal_leave_requests',
    'portal_onboarding_videos',
    'portal_onboarding_checklist',
    'portal_onboarding_progress',
    'portal_documents',
    'portal_recognition_posts',
    'portal_events',
    'portal_teams',
    'portal_team_members'
  ];
begin
  foreach t in array tables
  loop
    execute format('drop policy if exists %I on public.%I', 'authenticated_all_select', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated_all_insert', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated_all_update', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated_all_delete', t);
    execute format(
      'create policy "authenticated_all_select" on public.%I for select to authenticated using (true)',
      t
    );
    execute format(
      'create policy "authenticated_all_insert" on public.%I for insert to authenticated with check (true)',
      t
    );
    execute format(
      'create policy "authenticated_all_update" on public.%I for update to authenticated using (true) with check (true)',
      t
    );
    execute format(
      'create policy "authenticated_all_delete" on public.%I for delete to authenticated using (true)',
      t
    );
  end loop;
end
$do$;

drop policy if exists "inbox_select_own" on public.portal_inbox_notifications;
drop policy if exists "inbox_insert_authenticated" on public.portal_inbox_notifications;
drop policy if exists "inbox_update_own" on public.portal_inbox_notifications;
drop policy if exists "authenticated_all_select" on public.portal_inbox_notifications;
drop policy if exists "authenticated_all_insert" on public.portal_inbox_notifications;
drop policy if exists "authenticated_all_update" on public.portal_inbox_notifications;
drop policy if exists "authenticated_all_delete" on public.portal_inbox_notifications;

create policy "inbox_select_own"
  on public.portal_inbox_notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "inbox_insert_for_others_ok"
  on public.portal_inbox_notifications for insert to authenticated
  with check (
    from_user_id is not null
    and from_user_id = (select auth.uid())
  );

create policy "inbox_update_own_row"
  on public.portal_inbox_notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Allow users to delete their own notifications (optional cleanup)
create policy "inbox_delete_own"
  on public.portal_inbox_notifications for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.portal_tasks, public.portal_weekly_check_ins, public.portal_announcements,
  public.portal_leave_requests, public.portal_onboarding_videos, public.portal_onboarding_checklist,
  public.portal_onboarding_progress, public.portal_documents, public.portal_recognition_posts,
  public.portal_inbox_notifications, public.portal_events, public.portal_teams, public.portal_team_members
  from anon;

grant select, insert, update, delete on public.portal_tasks to authenticated;
grant select, insert, update, delete on public.portal_weekly_check_ins to authenticated;
grant select, insert, update, delete on public.portal_announcements to authenticated;
grant select, insert, update, delete on public.portal_leave_requests to authenticated;
grant select, insert, update, delete on public.portal_onboarding_videos to authenticated;
grant select, insert, update, delete on public.portal_onboarding_checklist to authenticated;
grant select, insert, update, delete on public.portal_onboarding_progress to authenticated;
grant select, insert, update, delete on public.portal_documents to authenticated;
grant select, insert, update, delete on public.portal_recognition_posts to authenticated;
grant select, insert, update, delete on public.portal_inbox_notifications to authenticated;
grant select, insert, update, delete on public.portal_events to authenticated;
grant select, insert, update, delete on public.portal_teams to authenticated;
grant select, insert, update, delete on public.portal_team_members to authenticated;

-- Seed teams (empty membership — add rows to portal_team_members when you have real user UUIDs)
insert into public.portal_teams (id, name, description)
values
  ('team_eng', 'Engineering squad', 'Product & web engineering'),
  ('team_design', 'Design studio', 'Product design & research'),
  ('team_ops', 'People & Operations', 'HR, ops, and studio admin')
on conflict (id) do nothing;
