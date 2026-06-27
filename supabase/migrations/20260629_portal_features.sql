-- Portal features: check-in visibility, leave comments, realtime tables.
-- Safe to re-run: skips missing tables and duplicate publication entries.

-- Weekly check-in visibility (department = dept leads only; all = HR/admin org-wide)
alter table public.portal_weekly_check_ins
  add column if not exists visibility text not null default 'department'
  check (visibility in ('department', 'all'));

-- Leave: optional approved day count (HR may reduce from requested range)
alter table public.portal_leave_requests
  add column if not exists approved_days integer;

-- Leave request conversation thread
create table if not exists public.portal_leave_comments (
  id          text primary key,
  leave_id    text not null references public.portal_leave_requests (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists portal_leave_comments_leave_id_idx
  on public.portal_leave_comments (leave_id, created_at);

alter table public.portal_leave_comments enable row level security;

drop policy if exists "leave_comments: own leave or lead+" on public.portal_leave_comments;
create policy "leave_comments: own leave or lead+"
  on public.portal_leave_comments for select to authenticated
  using (
    exists (
      select 1 from public.portal_leave_requests lr
      where lr.id = leave_id
        and (
          lr.user_id = auth.uid()
          or public.is_hr_or_admin()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and p.role in ('assistant_lead', 'team_lead')
              and p.department = (
                select department from public.profiles where id = lr.user_id
              )
          )
        )
    )
  );

drop policy if exists "leave_comments: insert own or lead+" on public.portal_leave_comments;
create policy "leave_comments: insert own or lead+"
  on public.portal_leave_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.portal_leave_requests lr
      where lr.id = leave_id
        and (
          lr.user_id = auth.uid()
          or public.is_hr_or_admin()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and p.role in ('assistant_lead', 'team_lead')
              and p.department = (
                select department from public.profiles where id = lr.user_id
              )
          )
        )
    )
  );

revoke all on public.portal_leave_comments from anon;
grant select, insert on public.portal_leave_comments to authenticated;

-- Realtime: live portal updates (skip if table missing or already added)
create or replace function public.portal_add_realtime_table(p_table text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if to_regclass('public.' || p_table) is null then
    raise notice 'Skipping realtime for missing table: %', p_table;
    return;
  end if;
  execute format('alter publication supabase_realtime add table public.%I', p_table);
exception
  when duplicate_object then null;
end;
$fn$;

select public.portal_add_realtime_table('portal_inbox_notifications');
select public.portal_add_realtime_table('portal_announcements');
select public.portal_add_realtime_table('portal_leave_requests');
select public.portal_add_realtime_table('portal_leave_comments');
select public.portal_add_realtime_table('portal_events');
select public.portal_add_realtime_table('portal_documents');
select public.portal_add_realtime_table('portal_weekly_check_ins');
select public.portal_add_realtime_table('portal_tasks');
select public.portal_add_realtime_table('portal_recognition_posts');
select public.portal_add_realtime_table('portal_onboarding_progress');

drop function if exists public.portal_add_realtime_table(text);
