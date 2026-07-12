-- Shared revival launch checklist progress (Emmanuel, Daniel, Opemipo only).

create table if not exists public.portal_launch_checklist_progress (
  task_id text primary key,
  completed_at timestamptz not null default now(),
  completed_by uuid references auth.users (id) on delete set null,
  auto_completed boolean not null default false
);

alter table public.portal_launch_checklist_progress enable row level security;

create or replace function public.is_revival_launch_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        lower(coalesce(p.name, '')) ~ '(emmanuel|okpiaifo|daniel|opemipo|adesoye|dorcas)'
        or lower(coalesce(p.email, '')) ~ '(emmanuel|okpiaifo|daniel|opemipo|adesoye|dorcas)'
      )
  );
$$;

grant execute on function public.is_revival_launch_operator() to authenticated;

drop policy if exists "launch_checklist_select" on public.portal_launch_checklist_progress;
create policy "launch_checklist_select"
  on public.portal_launch_checklist_progress
  for select
  to authenticated
  using (public.is_revival_launch_operator());

drop policy if exists "launch_checklist_insert" on public.portal_launch_checklist_progress;
create policy "launch_checklist_insert"
  on public.portal_launch_checklist_progress
  for insert
  to authenticated
  with check (public.is_revival_launch_operator());

drop policy if exists "launch_checklist_update" on public.portal_launch_checklist_progress;
create policy "launch_checklist_update"
  on public.portal_launch_checklist_progress
  for update
  to authenticated
  using (public.is_revival_launch_operator())
  with check (public.is_revival_launch_operator());

drop policy if exists "launch_checklist_delete" on public.portal_launch_checklist_progress;
create policy "launch_checklist_delete"
  on public.portal_launch_checklist_progress
  for delete
  to authenticated
  using (public.is_revival_launch_operator());

grant select, insert, update, delete on public.portal_launch_checklist_progress to authenticated;
