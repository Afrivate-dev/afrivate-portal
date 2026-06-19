-- DEPRECATED: Do not run after 20260619_security_hardening.sql or 20260620_audit_remediation.sql.
-- The hardened migration includes a stronger inbox insert policy (active-user check).
-- This file is kept only for recovering failed initial portal_data_tables runs.

-- Run this ONLY if portal_data_tables.sql failed on inbox_insert_for_others_ok
-- Safe to run multiple times.

drop policy if exists "inbox_select_own" on public.portal_inbox_notifications;
drop policy if exists "inbox_insert_authenticated" on public.portal_inbox_notifications;
drop policy if exists "inbox_update_own" on public.portal_inbox_notifications;
drop policy if exists "inbox_insert_for_others_ok" on public.portal_inbox_notifications;
drop policy if exists "inbox_update_own_row" on public.portal_inbox_notifications;
drop policy if exists "inbox_delete_own" on public.portal_inbox_notifications;
drop policy if exists "authenticated_all_select" on public.portal_inbox_notifications;
drop policy if exists "authenticated_all_insert" on public.portal_inbox_notifications;
drop policy if exists "authenticated_all_update" on public.portal_inbox_notifications;
drop policy if exists "authenticated_all_delete" on public.portal_inbox_notifications;
drop policy if exists "inbox: own notifications" on public.portal_inbox_notifications;
drop policy if exists "inbox: insert as sender to active users" on public.portal_inbox_notifications;
drop policy if exists "inbox: mark own read" on public.portal_inbox_notifications;
drop policy if exists "inbox: delete own" on public.portal_inbox_notifications;

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

create policy "inbox_delete_own"
  on public.portal_inbox_notifications for delete to authenticated
  using (user_id = (select auth.uid()));
