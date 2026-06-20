-- Fix portal_task_categories table grants and RLS (permission denied on load).
-- Safe to re-run.

create table if not exists public.portal_task_categories (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portal_task_categories enable row level security;

drop policy if exists "task_categories: all read" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ insert" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ update" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ delete" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ write" on public.portal_task_categories;

create policy "task_categories: all read"
  on public.portal_task_categories for select
  to authenticated
  using (auth.uid() is not null);

create policy "task_categories: lead+ insert"
  on public.portal_task_categories for insert
  to authenticated
  with check (public.is_lead_or_above());

create policy "task_categories: lead+ update"
  on public.portal_task_categories for update
  to authenticated
  using (public.is_lead_or_above());

create policy "task_categories: lead+ delete"
  on public.portal_task_categories for delete
  to authenticated
  using (public.is_lead_or_above());

revoke all on public.portal_task_categories from anon;
grant select, insert, update, delete on public.portal_task_categories to authenticated;

insert into public.portal_task_categories (id, label, sort_order)
values
  ('react', 'React / Frontend', 1),
  ('wordpress', 'WordPress', 2),
  ('performance', 'Performance', 3),
  ('nodejs', 'Node.js', 4),
  ('freelance', 'Freelance', 5),
  ('admin', 'Operations', 6),
  ('other', 'Other', 7)
on conflict (id) do nothing;
