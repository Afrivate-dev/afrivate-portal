-- AfriVate Portal — Security hardening (audit remediation)
-- Run AFTER all prior migrations. Drops stale permissive RLS policies, adds
-- profile/recognition guards, team_members RLS, workspace notes table, and fixes audit logging.
-- ---------------------------------------------------------------------------

-- ── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.get_my_role()
  returns text
  language sql
  security definer
  stable
  set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ── Drop ALL existing policies on portal tables (fixes OR'd permissive leftovers) ──

do $drop$
declare
  pol record;
  tables text[] := array[
    'profiles',
    'portal_tasks',
    'portal_weekly_check_ins',
    'portal_announcements',
    'portal_leave_requests',
    'portal_onboarding_videos',
    'portal_onboarding_checklist',
    'portal_onboarding_progress',
    'portal_documents',
    'portal_recognition_posts',
    'portal_inbox_notifications',
    'portal_events',
    'portal_teams',
    'portal_team_members',
    'portal_departments',
    'portal_admin_audit_log',
    'portal_workspace_notes'
  ];
  t text;
begin
  foreach t in array tables
  loop
    if to_regclass('public.' || t) is not null then
      for pol in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = t
      loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, t);
      end loop;
    end if;
  end loop;
end
$drop$;

-- ── Profile sensitive-field guard (blocks self-service role/active escalation) ──

create or replace function public.guard_profile_sensitive_fields()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if public.is_hr_or_admin() then
    return new;
  end if;
  if old.role is distinct from new.role then
    new.role := old.role;
  end if;
  if old.active is distinct from new.active then
    new.active := old.active;
  end if;
  if old.approved_at is distinct from new.approved_at then
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_sensitive_fields_trigger on public.profiles;
create trigger guard_profile_sensitive_fields_trigger
  before update on public.profiles
  for each row execute function public.guard_profile_sensitive_fields();

-- ── Recognition: non-giver/non-HR may only change reacted_by ──

create or replace function public.guard_recognition_post_update()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if public.is_hr_or_admin() or old.giver_id = auth.uid() then
    return new;
  end if;
  if old.message is distinct from new.message
    or old.giver_id is distinct from new.giver_id
    or old.receiver_id is distinct from new.receiver_id
    or old.tag is distinct from new.tag
    or old.created_at is distinct from new.created_at
  then
    raise exception 'Only reaction data can be updated on recognition posts';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_recognition_post_update_trigger on public.portal_recognition_posts;
create trigger guard_recognition_post_update_trigger
  before update on public.portal_recognition_posts
  for each row execute function public.guard_recognition_post_update();

-- ── Audit log: allow null actor for service-role ops; skip trigger when no JWT ──

alter table public.portal_admin_audit_log
  alter column actor_id drop not null;

create or replace function public.audit_profile_changes()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    return new;
  end if;

  if old.role is distinct from new.role then
    insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
    values (
      v_actor,
      'role_change',
      'user',
      new.id::text,
      jsonb_build_object('from_role', old.role, 'to_role', new.role)
    );
  end if;

  if old.active is distinct from new.active and new.active = true then
    insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
    values (
      v_actor,
      'account_approval',
      'user',
      new.id::text,
      jsonb_build_object('email', new.email, 'role', new.role, 'department', new.department)
    );
  end if;

  return new;
end;
$$;

-- ── PROFILES policies ──

create policy "profiles: authenticated read"
  on public.profiles for select to authenticated
  using (auth.uid() is not null);

create policy "profiles: insert own row"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles: update own or hr+"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_hr_or_admin())
  with check (id = auth.uid() or public.is_hr_or_admin());

-- ── PORTAL_TASKS ──

create policy "tasks: all signed-in users can read"
  on public.portal_tasks for select using (auth.uid() is not null);

create policy "tasks: any user can insert"
  on public.portal_tasks for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

create policy "tasks: owner or admin can update"
  on public.portal_tasks for update
  using (owner_id = auth.uid() or get_my_role() = 'admin');

create policy "tasks: owner or admin can delete"
  on public.portal_tasks for delete
  using (owner_id = auth.uid() or get_my_role() = 'admin');

-- ── PORTAL_LEAVE_REQUESTS ──

create policy "leave: own row or lead+"
  on public.portal_leave_requests for select
  using (
    user_id = auth.uid()
    or get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin')
  );

create policy "leave: insert own"
  on public.portal_leave_requests for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "leave: only leads+ can update status"
  on public.portal_leave_requests for update
  using (get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin'))
  with check (get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin'));

-- ── PORTAL_WEEKLY_CHECK_INS ──

create policy "checkins: own or lead+"
  on public.portal_weekly_check_ins for select
  using (
    user_id = auth.uid()
    or get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin')
  );

create policy "checkins: insert own"
  on public.portal_weekly_check_ins for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "checkins: update own or admin"
  on public.portal_weekly_check_ins for update
  using (user_id = auth.uid() or get_my_role() = 'admin');

-- ── PORTAL_ANNOUNCEMENTS ──

create policy "announcements: all read"
  on public.portal_announcements for select using (auth.uid() is not null);

create policy "announcements: team_lead+ insert"
  on public.portal_announcements for insert
  with check (get_my_role() in ('team_lead', 'hr', 'admin'));

create policy "announcements: poster or admin update"
  on public.portal_announcements for update
  using (posted_by_id = auth.uid() or get_my_role() = 'admin');

create policy "announcements: admin delete"
  on public.portal_announcements for delete
  using (get_my_role() = 'admin');

-- ── PORTAL_DOCUMENTS ──

create policy "documents: role-filtered read"
  on public.portal_documents for select
  using (
    auth.uid() is not null
    and (
      (not hr_only and not management_only)
      or (hr_only and get_my_role() in ('hr', 'admin'))
      or (management_only and get_my_role() in ('team_lead', 'hr', 'admin'))
    )
  );

create policy "documents: team_lead+ insert"
  on public.portal_documents for insert
  with check (get_my_role() in ('team_lead', 'hr', 'admin'));

create policy "documents: admin delete"
  on public.portal_documents for delete
  using (get_my_role() = 'admin');

-- ── PORTAL_RECOGNITION_POSTS ──

create policy "recognition: all read"
  on public.portal_recognition_posts for select using (auth.uid() is not null);

create policy "recognition: any insert"
  on public.portal_recognition_posts for insert
  with check (auth.uid() is not null and giver_id = auth.uid());

create policy "recognition: authenticated update"
  on public.portal_recognition_posts for update
  using (auth.uid() is not null);

create policy "recognition: poster or admin delete"
  on public.portal_recognition_posts for delete
  using (giver_id = auth.uid() or get_my_role() = 'admin');

-- ── PORTAL_INBOX_NOTIFICATIONS ──

create policy "inbox: own notifications"
  on public.portal_inbox_notifications for select
  using (user_id = auth.uid());

create policy "inbox: insert as sender to active users"
  on public.portal_inbox_notifications for insert
  with check (
    from_user_id = auth.uid()
    and user_id is not null
    and exists (
      select 1 from public.profiles p
      where p.id = user_id and p.active = true
    )
  );

create policy "inbox: mark own read"
  on public.portal_inbox_notifications for update
  using (user_id = auth.uid());

create policy "inbox: delete own"
  on public.portal_inbox_notifications for delete
  using (user_id = auth.uid());

-- ── ONBOARDING ──

create policy "onboarding_videos: all read"
  on public.portal_onboarding_videos for select using (auth.uid() is not null);

create policy "onboarding_videos: admin write"
  on public.portal_onboarding_videos for insert
  with check (get_my_role() in ('hr', 'admin'));

create policy "onboarding_videos: admin update"
  on public.portal_onboarding_videos for update
  using (get_my_role() in ('hr', 'admin'));

create policy "onboarding_videos: admin delete"
  on public.portal_onboarding_videos for delete
  using (get_my_role() in ('hr', 'admin'));

create policy "onboarding_checklist: all read"
  on public.portal_onboarding_checklist for select using (auth.uid() is not null);

create policy "onboarding_checklist: admin write"
  on public.portal_onboarding_checklist for insert
  with check (get_my_role() in ('hr', 'admin'));

create policy "onboarding_checklist: admin update"
  on public.portal_onboarding_checklist for update
  using (get_my_role() in ('hr', 'admin'));

create policy "onboarding_checklist: admin delete"
  on public.portal_onboarding_checklist for delete
  using (get_my_role() in ('hr', 'admin'));

create policy "onboarding_progress: own or hr+"
  on public.portal_onboarding_progress for select
  using (user_id = auth.uid() or get_my_role() in ('hr', 'admin'));

create policy "onboarding_progress: own upsert"
  on public.portal_onboarding_progress for insert
  with check (user_id = auth.uid());

create policy "onboarding_progress: own update"
  on public.portal_onboarding_progress for update
  using (user_id = auth.uid());

-- ── PORTAL_EVENTS ──

create policy "events: all read"
  on public.portal_events for select using (auth.uid() is not null);

create policy "events: team_lead+ write"
  on public.portal_events for insert
  with check (get_my_role() in ('team_lead', 'hr', 'admin'));

create policy "events: team_lead+ update"
  on public.portal_events for update
  using (get_my_role() in ('team_lead', 'hr', 'admin'));

create policy "events: admin delete"
  on public.portal_events for delete
  using (get_my_role() = 'admin');

-- ── PORTAL_TEAMS ──

create policy "teams: all read"
  on public.portal_teams for select using (auth.uid() is not null);

create policy "teams: admin write"
  on public.portal_teams for insert with check (get_my_role() = 'admin');

create policy "teams: admin update"
  on public.portal_teams for update using (get_my_role() = 'admin');

create policy "teams: admin delete"
  on public.portal_teams for delete using (get_my_role() = 'admin');

-- ── PORTAL_TEAM_MEMBERS (was missing from tightening) ──

create policy "team_members: all read"
  on public.portal_team_members for select using (auth.uid() is not null);

create policy "team_members: admin write"
  on public.portal_team_members for insert with check (get_my_role() = 'admin');

create policy "team_members: admin update"
  on public.portal_team_members for update using (get_my_role() = 'admin');

create policy "team_members: admin delete"
  on public.portal_team_members for delete using (get_my_role() = 'admin');

-- ── PORTAL_DEPARTMENTS ──

create policy "departments: all read"
  on public.portal_departments for select using (auth.uid() is not null);

create policy "departments: admin write"
  on public.portal_departments for insert with check (get_my_role() = 'admin');

create policy "departments: admin update"
  on public.portal_departments for update using (get_my_role() = 'admin');

create policy "departments: admin delete"
  on public.portal_departments for delete using (get_my_role() = 'admin');

-- ── AUDIT LOG ──

create policy "audit_log: hr+ read"
  on public.portal_admin_audit_log for select
  using (get_my_role() in ('hr', 'admin'));

-- ── WORKSPACE NOTES (Postgres persistence + RLS) ──

create table if not exists public.portal_workspace_notes (
  id            text primary key,
  title         text not null default 'Untitled note',
  body          text not null default '',
  blocks        jsonb not null default '[]'::jsonb,
  parent_id     text references public.portal_workspace_notes (id) on delete set null,
  icon_emoji    text,
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by_id uuid not null references public.profiles (id),
  version       bigint not null default 0,
  share         jsonb not null default '{"scope":"workspace"}'::jsonb
);

alter table public.portal_workspace_notes enable row level security;

create or replace function public.can_view_workspace_note(
  p_owner_id uuid,
  p_share jsonb
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_scope text;
  v_my_dept text;
begin
  if v_uid is null then
    return false;
  end if;

  if p_owner_id = v_uid then
    return true;
  end if;

  v_scope := coalesce(p_share->>'scope', 'workspace');

  if v_scope = 'workspace' then
    return true;
  end if;

  if v_scope = 'private' then
    return false;
  end if;

  select department into v_my_dept from public.profiles where id = v_uid;

  if v_scope = 'departments' then
    return exists (
      select 1
      from jsonb_array_elements_text(coalesce(p_share->'departments', '[]'::jsonb)) as dep(val)
      where dep.val = v_my_dept
    );
  end if;

  if v_scope = 'teams' then
    return exists (
      select 1
      from jsonb_array_elements_text(coalesce(p_share->'teamIds', '[]'::jsonb)) as t(val)
      join public.portal_team_members tm on tm.team_id = t.val and tm.user_id = v_uid
    );
  end if;

  if v_scope = 'people' then
    return exists (
      select 1
      from jsonb_array_elements_text(coalesce(p_share->'peopleUserIds', '[]'::jsonb)) as p(val)
      where p.val::uuid = v_uid
    );
  end if;

  return false;
end;
$fn$;

create policy "notes: visible read"
  on public.portal_workspace_notes for select
  using (public.can_view_workspace_note(owner_id, share));

create policy "notes: owner insert"
  on public.portal_workspace_notes for insert
  with check (owner_id = auth.uid());

create policy "notes: owner or hr+ update"
  on public.portal_workspace_notes for update
  using (owner_id = auth.uid() or public.is_hr_or_admin());

create policy "notes: owner or hr+ delete"
  on public.portal_workspace_notes for delete
  using (owner_id = auth.uid() or public.is_hr_or_admin());

revoke all on public.portal_workspace_notes from anon;
grant select, insert, update, delete on public.portal_workspace_notes to authenticated;
