-- Tighten revival launch operator check + announcement/event audience RLS.

-- Prefer exact email allowlist; fall back to stricter name/email token match.
create or replace function public.is_revival_launch_operator()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_local text;
begin
  select lower(coalesce(p.email, '')), lower(coalesce(p.name, ''))
  into v_email, v_name
  from public.profiles p
  where p.id = auth.uid();

  if v_email is null then
    return false;
  end if;

  -- Exact emails (extend as staff join)
  if v_email in (
    'emmanuel@afrivate.org',
    'okpiaifo@afrivate.org',
    'daniel@afrivate.org',
    'opemipo@afrivate.org',
    'adesoye@afrivate.org',
    'dorcas@afrivate.org'
  ) then
    return true;
  end if;

  v_local := split_part(v_email, '@', 1);

  -- Local-part exact match (not substring of unrelated emails)
  if v_local in ('emmanuel', 'okpiaifo', 'daniel', 'opemipo', 'adesoye', 'dorcas') then
    return true;
  end if;

  -- Name: whole-word style tokens only
  if v_name ~ '(^|[^a-z])(emmanuel|okpiaifo|daniel|opemipo|adesoye|dorcas)([^a-z]|$)' then
    return true;
  end if;

  return false;
end;
$$;

-- Announcements: audience scoping on read
drop policy if exists "announcements: all read" on public.portal_announcements;
drop policy if exists "announcements: audience read" on public.portal_announcements;
create policy "announcements: audience read"
  on public.portal_announcements
  for select
  to authenticated
  using (
    audience = 'all'
    or audience = (select department from public.profiles where id = auth.uid())
    or public.get_my_role() in ('hr', 'admin')
  );

-- Events: audience scoping on read
drop policy if exists "events: all read" on public.portal_events;
drop policy if exists "events: audience read" on public.portal_events;
create policy "events: audience read"
  on public.portal_events
  for select
  to authenticated
  using (
    audience = 'all'
    or audience = (select department from public.profiles where id = auth.uid())
    or public.get_my_role() in ('hr', 'admin')
  );

-- Align memo update with product: poster, HR, or admin
drop policy if exists "announcements: poster or admin update" on public.portal_announcements;
create policy "announcements: poster hr or admin update"
  on public.portal_announcements
  for update
  to authenticated
  using (
    posted_by_id = auth.uid()
    or public.get_my_role() in ('hr', 'admin')
  )
  with check (
    posted_by_id = auth.uid()
    or public.get_my_role() in ('hr', 'admin')
  );

-- Align delete: admin or HR (matches common HR ops need)
drop policy if exists "announcements: admin delete" on public.portal_announcements;
create policy "announcements: hr or admin delete"
  on public.portal_announcements
  for delete
  to authenticated
  using (public.get_my_role() in ('hr', 'admin'));
