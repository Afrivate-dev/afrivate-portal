-- AfriVate Portal — Audit remediation (run after 20260619_security_hardening.sql)
-- Fixes: announcement read tracking, note link access, access requests, task categories,
-- documents update, duplicate profiles policies.
-- ---------------------------------------------------------------------------

-- ── Remove duplicate profiles policies from rls-section-5-and-6 (if present) ──

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_insert_own_row" on public.profiles;
drop policy if exists "profiles_update_own_row" on public.profiles;
drop policy if exists "profiles_update_hr_admin" on public.profiles;

-- ── Announcement read tracking (RPC — staff can mark read without full UPDATE rights) ──

create or replace function public.mark_announcement_read(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_read jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select read_by into v_read from public.portal_announcements where id = p_id;
  if not found then
    return;
  end if;

  if v_read @> to_jsonb(v_uid::text) then
    return;
  end if;

  update public.portal_announcements
  set read_by = v_read || to_jsonb(v_uid::text)
  where id = p_id;
end;
$$;

create or replace function public.mark_all_announcements_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  for r in select id, read_by from public.portal_announcements loop
    if not (r.read_by @> to_jsonb(v_uid::text)) then
      update public.portal_announcements
      set read_by = r.read_by || to_jsonb(v_uid::text)
      where id = r.id;
    end if;
  end loop;
end;
$$;

grant execute on function public.mark_announcement_read(text) to authenticated;
grant execute on function public.mark_all_announcements_read() to authenticated;

-- ── Note link-token access (server-enforced share links) ──

create or replace function public.get_workspace_note_by_link(p_id text, p_token text)
returns setof public.portal_workspace_notes
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select n.*
  from public.portal_workspace_notes n
  where n.id = p_id
    and coalesce(n.share->>'linkEnabled', 'false') = 'true'
    and n.share->>'linkToken' is not null
    and n.share->>'linkToken' = p_token;
end;
$$;

grant execute on function public.get_workspace_note_by_link(text, text) to authenticated;

-- ── Access requests (pending users notify HR/admin) ──

create table if not exists public.portal_access_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  message      text,
  requested_at timestamptz not null default now(),
  status       text not null default 'pending'
    check (status in ('pending', 'acknowledged', 'approved', 'dismissed')),
  unique (user_id)
);

alter table public.portal_access_requests enable row level security;

drop policy if exists "access_requests: own read" on public.portal_access_requests;
drop policy if exists "access_requests: own insert pending" on public.portal_access_requests;
drop policy if exists "access_requests: hr+ read all" on public.portal_access_requests;
drop policy if exists "access_requests: hr+ update" on public.portal_access_requests;

create policy "access_requests: own read"
  on public.portal_access_requests for select to authenticated
  using (user_id = auth.uid());

create policy "access_requests: own insert when inactive"
  on public.portal_access_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active = false
    )
  );

create policy "access_requests: hr+ read all"
  on public.portal_access_requests for select to authenticated
  using (public.is_hr_or_admin());

create policy "access_requests: hr+ update"
  on public.portal_access_requests for update to authenticated
  using (public.is_hr_or_admin());

revoke all on public.portal_access_requests from anon;
grant select, insert, update on public.portal_access_requests to authenticated;

-- ── Task categories (org-wide, persisted in Postgres) ──

create table if not exists public.portal_task_categories (
  id         text primary key,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portal_task_categories enable row level security;

drop policy if exists "task_categories: all read" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ write" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ update" on public.portal_task_categories;
drop policy if exists "task_categories: lead+ delete" on public.portal_task_categories;

create policy "task_categories: all read"
  on public.portal_task_categories for select
  using (auth.uid() is not null);

create policy "task_categories: lead+ insert"
  on public.portal_task_categories for insert
  with check (public.is_lead_or_above());

create policy "task_categories: lead+ update"
  on public.portal_task_categories for update
  using (public.is_lead_or_above());

create policy "task_categories: lead+ delete"
  on public.portal_task_categories for delete
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

-- ── Documents metadata update (team_lead+ can edit) ──

drop policy if exists "documents: team_lead+ update" on public.portal_documents;
create policy "documents: team_lead+ update"
  on public.portal_documents for update
  using (get_my_role() in ('team_lead', 'hr', 'admin'));

-- ── Inactive profiles hidden from directory (optional privacy) ──
-- Staff directory uses profiles SELECT; restrict to active users only for non-HR:

drop policy if exists "profiles: authenticated read" on public.profiles;
create policy "profiles: authenticated read"
  on public.profiles for select to authenticated
  using (
    active = true
    or id = auth.uid()
    or public.is_hr_or_admin()
  );
