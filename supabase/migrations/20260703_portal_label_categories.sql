-- User-managed document categories and recognition tags (Resources + Shout-outs).
-- Safe to re-run.

create table if not exists public.portal_document_categories (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_recognition_tags (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portal_document_categories enable row level security;
alter table public.portal_recognition_tags enable row level security;

drop policy if exists "doc_categories: all read" on public.portal_document_categories;
drop policy if exists "doc_categories: lead+ insert" on public.portal_document_categories;
drop policy if exists "doc_categories: lead+ update" on public.portal_document_categories;
drop policy if exists "doc_categories: lead+ delete" on public.portal_document_categories;

create policy "doc_categories: all read"
  on public.portal_document_categories for select to authenticated
  using (auth.uid() is not null);

create policy "doc_categories: lead+ insert"
  on public.portal_document_categories for insert to authenticated
  with check (public.is_lead_or_above());

create policy "doc_categories: lead+ update"
  on public.portal_document_categories for update to authenticated
  using (public.is_lead_or_above());

create policy "doc_categories: lead+ delete"
  on public.portal_document_categories for delete to authenticated
  using (public.is_lead_or_above());

drop policy if exists "rec_tags: all read" on public.portal_recognition_tags;
drop policy if exists "rec_tags: lead+ insert" on public.portal_recognition_tags;
drop policy if exists "rec_tags: lead+ update" on public.portal_recognition_tags;
drop policy if exists "rec_tags: lead+ delete" on public.portal_recognition_tags;

create policy "rec_tags: all read"
  on public.portal_recognition_tags for select to authenticated
  using (auth.uid() is not null);

create policy "rec_tags: lead+ insert"
  on public.portal_recognition_tags for insert to authenticated
  with check (public.is_lead_or_above());

create policy "rec_tags: lead+ update"
  on public.portal_recognition_tags for update to authenticated
  using (public.is_lead_or_above());

create policy "rec_tags: lead+ delete"
  on public.portal_recognition_tags for delete to authenticated
  using (public.is_lead_or_above());

grant select, insert, update, delete on public.portal_document_categories to authenticated;
grant select, insert, update, delete on public.portal_recognition_tags to authenticated;

insert into public.portal_document_categories (id, label, sort_order)
values
  ('policies', 'Policies', 1),
  ('sops', 'SOPs', 2),
  ('brand', 'Brand Assets', 3),
  ('templates', 'Templates', 4),
  ('reports', 'Reports', 5)
on conflict (id) do nothing;

insert into public.portal_recognition_tags (id, label, sort_order)
values
  ('great_work', 'Great Work', 1),
  ('team_player', 'Team Player', 2),
  ('innovation', 'Innovation', 3),
  ('above_beyond', 'Above & Beyond', 4),
  ('leadership', 'Leadership', 5)
on conflict (id) do nothing;
