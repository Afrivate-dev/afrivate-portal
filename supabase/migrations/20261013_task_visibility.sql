-- Restrict who can read portal_tasks.
--
-- Admins (public.is_portal_admin) see every task.
-- Someone who leads or co-leads a team sees their own tasks plus every task
-- whose owner or any assignee is a member of a team they lead. Leadership is
-- the assignment on portal_teams (lead_user_id / asst_lead_user_id), the same
-- team clause as public.manages_user in 20260711_assignment_based_management.sql.
-- manages_user itself is not used here: it also matches direct reports and
-- department members, which is wider than "on a team they lead."
-- Everyone else sees tasks they own or are assigned to.
--
-- INSERT / UPDATE / DELETE policies are left as they stand
-- (20260619_security_hardening.sql and 20260715_audit_hardening.sql).

-- ── Visibility helper ────────────────────────────────────────────────────────
-- Parameterised so inbox inserts can check the recipient, not only auth.uid().
-- SECURITY DEFINER + fixed search_path: reads tasks and team membership
-- without depending on the caller's RLS.

create or replace function public.user_can_view_task(p_user_id uuid, p_task_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and p_task_id is not null
    and exists (
      select 1
      from public.portal_tasks as task
      where task.id = p_task_id
        and (
          -- Admin check. is_portal_admin() is auth.uid(); the profile read
          -- covers a recipient who is not the caller (inbox inserts).
          (p_user_id = auth.uid() and public.is_portal_admin())
          or exists (
            select 1
            from public.profiles as profile
            where profile.id = p_user_id
              and profile.role = 'admin'
          )
          or task.owner_id = p_user_id
          or task.assignee_id = p_user_id
          or (
            task.assignee_ids is not null
            and task.assignee_ids ? p_user_id::text
          )
          or exists (
            select 1
            from public.portal_team_members as member
            join public.portal_teams as team on team.id = member.team_id
            where (team.lead_user_id = p_user_id or team.asst_lead_user_id = p_user_id)
              and (
                member.user_id = task.owner_id
                or member.user_id = task.assignee_id
                or (
                  task.assignee_ids is not null
                  and task.assignee_ids ? member.user_id::text
                )
              )
          )
        )
    );
$$;

create or replace function public.can_view_task(p_task_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_can_view_task(auth.uid(), p_task_id);
$$;

revoke all on function public.user_can_view_task(uuid, text) from public, anon, authenticated;
revoke all on function public.can_view_task(text) from public, anon, authenticated;
grant execute on function public.user_can_view_task(uuid, text) to authenticated;
grant execute on function public.can_view_task(text) to authenticated;

-- ── SELECT: replace the signed-in-users-can-read-every-row policy ───────────
drop policy if exists "tasks: all signed-in users can read" on public.portal_tasks;
drop policy if exists "tasks all" on public.portal_tasks;
drop policy if exists "tasks: scoped read" on public.portal_tasks;

create policy "tasks: scoped read"
  on public.portal_tasks
  for select
  to authenticated
  using (public.can_view_task(id));

-- ── Inbox: do not store a task title for someone who cannot open the task ───
-- Assignment and mention rows copy the title into body. Block new rows, and
-- clear bodies already stored for recipients outside the new rule.
-- Titles stay ("Alex assigned you a task") because they do not include the task name.

drop policy if exists "inbox: insert as sender to active users" on public.portal_inbox_notifications;
create policy "inbox: insert as sender to active users"
  on public.portal_inbox_notifications
  for insert
  to authenticated
  with check (
    from_user_id = auth.uid()
    and user_id is not null
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = user_id
        and profile.active = true
    )
    and (
      task_id is null
      or public.user_can_view_task(user_id, task_id)
    )
  );

update public.portal_inbox_notifications as notice
set body = null
where notice.task_id is not null
  and not public.user_can_view_task(notice.user_id, notice.task_id);
