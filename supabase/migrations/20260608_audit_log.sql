-- AfriVate Portal — Admin audit log
-- Run in Supabase Dashboard → SQL Editor → New query
-- Creates an append-only log table for administrator actions.
-- This satisfies the NDPR requirement for accountability on data changes.
-- ---------------------------------------------------------------------------

-- ────────────────────────────────────────────────────────────────────────────
-- Audit log table
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.portal_admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  performed_at  timestamptz not null default now(),
  actor_id      uuid not null references public.profiles(id) on delete set null,
  action        text not null,   -- e.g. 'role_change', 'account_approval', 'leave_decision'
  target_type   text,            -- e.g. 'user', 'leave_request'
  target_id     text,            -- the affected record's ID
  detail        jsonb            -- structured payload (old/new values, note, etc.)
);

-- Index for looking up by actor or by date
create index if not exists portal_admin_audit_log_actor_idx
  on public.portal_admin_audit_log (actor_id, performed_at desc);

create index if not exists portal_admin_audit_log_target_idx
  on public.portal_admin_audit_log (target_type, target_id);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS: only HR and admin can read the audit log; no one can delete rows
-- ────────────────────────────────────────────────────────────────────────────
alter table public.portal_admin_audit_log enable row level security;

drop policy if exists "audit_log: hr+ read" on public.portal_admin_audit_log;
create policy "audit_log: hr+ read"
  on public.portal_admin_audit_log for select
  using (get_my_role() in ('hr', 'admin'));

-- INSERT is done via service role (Edge Function or server trigger) only.
-- No user-facing INSERT policy — the service role bypasses RLS.

-- No UPDATE or DELETE policies — the log is append-only.

-- ────────────────────────────────────────────────────────────────────────────
-- Database triggers to auto-log key admin actions
-- ────────────────────────────────────────────────────────────────────────────

-- Trigger: log role changes and account approvals on profiles
create or replace function public.audit_profile_changes()
  returns trigger
  language plpgsql
  security definer
as $$
begin
  -- Log role changes
  if old.role is distinct from new.role then
    insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
    values (
      auth.uid(),
      'role_change',
      'user',
      new.id::text,
      jsonb_build_object('from_role', old.role, 'to_role', new.role)
    );
  end if;

  -- Log account activations (approvals)
  if old.active is distinct from new.active and new.active = true then
    insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
    values (
      auth.uid(),
      'account_approval',
      'user',
      new.id::text,
      jsonb_build_object('email', new.email, 'role', new.role, 'department', new.department)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_profile_changes_trigger on public.profiles;
create trigger audit_profile_changes_trigger
  after update on public.profiles
  for each row execute function public.audit_profile_changes();


-- Trigger: log leave decisions (approve/decline)
create or replace function public.audit_leave_decisions()
  returns trigger
  language plpgsql
  security definer
as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'declined') then
    insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
    values (
      auth.uid(),
      'leave_decision',
      'leave_request',
      new.id::text,
      jsonb_build_object(
        'decision', new.status,
        'user_id', new.user_id,
        'type', new.type,
        'start_date', new.start_date,
        'end_date', new.end_date,
        'reviewer_note', new.reviewer_note
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_leave_decisions_trigger on public.portal_leave_requests;
create trigger audit_leave_decisions_trigger
  after update on public.portal_leave_requests
  for each row execute function public.audit_leave_decisions();
