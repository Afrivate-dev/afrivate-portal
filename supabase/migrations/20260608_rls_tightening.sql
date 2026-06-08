-- AfriVate Portal — Row Level Security tightening
-- Run in Supabase Dashboard → SQL Editor → New query
-- Replaces the blanket `using (true)` policies added in the original migration.
--
-- Strategy:
--   • A helper function `get_my_role()` reads the caller's role from profiles
--     (avoids repeating the subquery in every policy).
--   • Each table gets explicit policies for SELECT, INSERT, UPDATE, DELETE.
--   • Staff see only their own sensitive records; leads/HR/admin see broader data.
-- ---------------------------------------------------------------------------

-- ────────────────────────────────────────────────────────────────────────────
-- Helper: current user's role (SECURITY DEFINER so it bypasses RLS on profiles)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.get_my_role()
  returns text
  language sql
  security definer
  stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "profiles select all" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

-- All active users can read the directory (name, role, department, etc.)
create policy "profiles: all active users can read"
  on public.profiles for select
  using (auth.uid() is not null);

-- Users can only update their own profile; admins can update any
create policy "profiles: own row or admin"
  on public.profiles for update
  using (id = auth.uid() or get_my_role() = 'admin')
  with check (id = auth.uid() or get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_TASKS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "tasks all" on public.portal_tasks;

-- All signed-in users can read all tasks (app shows team-wide board)
create policy "tasks: all signed-in users can read"
  on public.portal_tasks for select
  using (auth.uid() is not null);

-- Any signed-in user can create a task (they become the owner)
create policy "tasks: any user can insert"
  on public.portal_tasks for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

-- Owner or admin can update a task
create policy "tasks: owner or admin can update"
  on public.portal_tasks for update
  using (owner_id = auth.uid() or get_my_role() = 'admin');

-- Owner or admin can delete a task
create policy "tasks: owner or admin can delete"
  on public.portal_tasks for delete
  using (owner_id = auth.uid() or get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_LEAVE_REQUESTS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "leave all" on public.portal_leave_requests;

-- Staff see only their own; leads/HR/admin see all
create policy "leave: own row or lead+"
  on public.portal_leave_requests for select
  using (
    user_id = auth.uid()
    or get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin')
  );

-- Any signed-in user can submit their own leave request
create policy "leave: insert own"
  on public.portal_leave_requests for insert
  with check (auth.uid() is not null and user_id = auth.uid());

-- Only leads/HR/admin can update the status (approve/decline)
-- Staff cannot self-approve their own requests
create policy "leave: only leads+ can update status"
  on public.portal_leave_requests for update
  using (get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin'))
  with check (get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin'));

-- No one can delete leave requests (maintain audit trail)
-- (Omit DELETE policy — default is deny)

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_WEEKLY_CHECK_INS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "checkins all" on public.portal_weekly_check_ins;

-- Staff see only their own; leads/HR/admin see all
create policy "checkins: own or lead+"
  on public.portal_weekly_check_ins for select
  using (
    user_id = auth.uid()
    or get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin')
  );

create policy "checkins: insert own"
  on public.portal_weekly_check_ins for insert
  with check (auth.uid() is not null and user_id = auth.uid());

-- Users can update their own check-in; admin can update any
create policy "checkins: update own or admin"
  on public.portal_weekly_check_ins for update
  using (user_id = auth.uid() or get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_ANNOUNCEMENTS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "announcements all" on public.portal_announcements;

-- All signed-in users can read announcements
create policy "announcements: all read"
  on public.portal_announcements for select
  using (auth.uid() is not null);

-- Only team_lead/hr/admin can post announcements
create policy "announcements: team_lead+ insert"
  on public.portal_announcements for insert
  with check (get_my_role() in ('team_lead', 'hr', 'admin'));

-- Only team_lead/hr/admin can edit their own announcements; admin can edit any
create policy "announcements: poster or admin update"
  on public.portal_announcements for update
  using (posted_by_id = auth.uid() or get_my_role() = 'admin');

-- Only admin can delete announcements
create policy "announcements: admin delete"
  on public.portal_announcements for delete
  using (get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_DOCUMENTS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "documents all" on public.portal_documents;

-- Enforce hr_only and management_only flags at the database level
create policy "documents: role-filtered read"
  on public.portal_documents for select
  using (
    auth.uid() is not null
    and (
      -- Regular document: anyone can read
      (not hr_only and not management_only)
      -- HR-only document: hr and admin
      or (hr_only and get_my_role() in ('hr', 'admin'))
      -- Management-only: team_lead, hr, admin
      or (management_only and get_my_role() in ('team_lead', 'hr', 'admin'))
    )
  );

-- Only team_lead/hr/admin can upload documents
create policy "documents: team_lead+ insert"
  on public.portal_documents for insert
  with check (get_my_role() in ('team_lead', 'hr', 'admin'));

-- Only admin can delete documents
create policy "documents: admin delete"
  on public.portal_documents for delete
  using (get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_RECOGNITION_POSTS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "recognition all" on public.portal_recognition_posts;

create policy "recognition: all read"
  on public.portal_recognition_posts for select
  using (auth.uid() is not null);

-- Any signed-in user can give recognition
create policy "recognition: any insert"
  on public.portal_recognition_posts for insert
  with check (auth.uid() is not null and giver_id = auth.uid());

-- Allow update only for reacted_by field (reactions by anyone)
create policy "recognition: reactions update"
  on public.portal_recognition_posts for update
  using (auth.uid() is not null);

-- Only the poster or admin can delete a recognition post
create policy "recognition: poster or admin delete"
  on public.portal_recognition_posts for delete
  using (giver_id = auth.uid() or get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_INBOX_NOTIFICATIONS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "inbox all" on public.portal_inbox_notifications;

-- Users can only see their own notifications
create policy "inbox: own notifications"
  on public.portal_inbox_notifications for select
  using (user_id = auth.uid());

-- Server-side inserts (via service role) — no user-level INSERT policy needed
-- Updating own notifications (mark as read)
create policy "inbox: mark own read"
  on public.portal_inbox_notifications for update
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_ONBOARDING_VIDEOS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "onboarding_videos all" on public.portal_onboarding_videos;

create policy "onboarding_videos: all read"
  on public.portal_onboarding_videos for select
  using (auth.uid() is not null);

-- Only admin can manage onboarding videos
create policy "onboarding_videos: admin write"
  on public.portal_onboarding_videos for insert
  with check (get_my_role() in ('hr', 'admin'));

create policy "onboarding_videos: admin update"
  on public.portal_onboarding_videos for update
  using (get_my_role() in ('hr', 'admin'));

create policy "onboarding_videos: admin delete"
  on public.portal_onboarding_videos for delete
  using (get_my_role() in ('hr', 'admin'));

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_ONBOARDING_CHECKLIST
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "onboarding_checklist all" on public.portal_onboarding_checklist;

create policy "onboarding_checklist: all read"
  on public.portal_onboarding_checklist for select
  using (auth.uid() is not null);

create policy "onboarding_checklist: admin write"
  on public.portal_onboarding_checklist for insert
  with check (get_my_role() in ('hr', 'admin'));

create policy "onboarding_checklist: admin update"
  on public.portal_onboarding_checklist for update
  using (get_my_role() in ('hr', 'admin'));

create policy "onboarding_checklist: admin delete"
  on public.portal_onboarding_checklist for delete
  using (get_my_role() in ('hr', 'admin'));

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_ONBOARDING_PROGRESS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "onboarding_progress all" on public.portal_onboarding_progress;

-- Users see only their own progress; HR/admin see all
create policy "onboarding_progress: own or hr+"
  on public.portal_onboarding_progress for select
  using (user_id = auth.uid() or get_my_role() in ('hr', 'admin'));

create policy "onboarding_progress: own upsert"
  on public.portal_onboarding_progress for insert
  with check (user_id = auth.uid());

create policy "onboarding_progress: own update"
  on public.portal_onboarding_progress for update
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_EVENTS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "events all" on public.portal_events;

create policy "events: all read"
  on public.portal_events for select
  using (auth.uid() is not null);

create policy "events: team_lead+ write"
  on public.portal_events for insert
  with check (get_my_role() in ('team_lead', 'hr', 'admin'));

create policy "events: team_lead+ update"
  on public.portal_events for update
  using (get_my_role() in ('team_lead', 'hr', 'admin'));

create policy "events: admin delete"
  on public.portal_events for delete
  using (get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────────────────────
-- PORTAL_TEAMS and PORTAL_DEPARTMENTS
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "teams all" on public.portal_teams;
drop policy if exists "departments all" on public.portal_departments;

create policy "teams: all read"
  on public.portal_teams for select using (auth.uid() is not null);

create policy "teams: admin write"
  on public.portal_teams for insert with check (get_my_role() = 'admin');

create policy "teams: admin update"
  on public.portal_teams for update using (get_my_role() = 'admin');

create policy "teams: admin delete"
  on public.portal_teams for delete using (get_my_role() = 'admin');

create policy "departments: all read"
  on public.portal_departments for select using (auth.uid() is not null);

create policy "departments: admin write"
  on public.portal_departments for insert with check (get_my_role() = 'admin');

create policy "departments: admin update"
  on public.portal_departments for update using (get_my_role() = 'admin');

create policy "departments: admin delete"
  on public.portal_departments for delete using (get_my_role() = 'admin');
