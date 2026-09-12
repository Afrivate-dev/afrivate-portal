-- People calendar autosave (birthday / anniversary / new-hire check-ins)
-- + People ops escalation log (operational; not Speak up / grievances).
-- Date of birth is a required people field for active staff (not consent-gated).

alter table public.portal_events
  add column if not exists external_key text,
  add column if not exists subject_user_id uuid references auth.users (id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'portal_events_external_key_key'
      and conrelid = 'public.portal_events'::regclass
  ) then
    alter table public.portal_events
      add constraint portal_events_external_key_key unique (external_key);
  end if;
end $$;

create index if not exists portal_events_subject_user_idx
  on public.portal_events (subject_user_id)
  where subject_user_id is not null;

create index if not exists portal_events_source_date_idx
  on public.portal_events (source, event_date);

create or replace function public.portal_next_annual_date(p_from date, p_today date)
returns date
language plpgsql
immutable
as $$
declare
  y int := extract(year from p_today)::int;
  m int := extract(month from p_from)::int;
  d int := extract(day from p_from)::int;
  dim int;
  candidate date;
begin
  dim := extract(day from (date_trunc('month', make_date(y, m, 1)) + interval '1 month - 1 day'))::int;
  candidate := make_date(y, m, least(d, dim));
  if candidate >= p_today then
    return candidate;
  end if;
  y := y + 1;
  dim := extract(day from (date_trunc('month', make_date(y, m, 1)) + interval '1 month - 1 day'))::int;
  return make_date(y, m, least(d, dim));
end;
$$;

create or replace function public._portal_upsert_people_moment_event(
  p_key text,
  p_title text,
  p_description text,
  p_date date,
  p_audience text,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.portal_events (
    id, title, description, event_date, start_time, end_time, location, audience, source, external_key, subject_user_id
  ) values (
    'pom:' || p_key, p_title, p_description, p_date, null, null, null, p_audience, 'people_ops', p_key, p_user_id
  )
  on conflict (external_key) do update set
    title = excluded.title,
    description = excluded.description,
    event_date = excluded.event_date,
    audience = excluded.audience,
    source = excluded.source,
    subject_user_id = excluded.subject_user_id,
    start_time = null,
    end_time = null;
end;
$$;

create or replace function public._portal_sync_people_moment_events(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_active boolean := false;
  v_display_name text := 'Team member';
  v_job_title text := 'Team member';
  v_dob date;
  v_start date;
  v_status text;
  v_archived boolean := false;
  v_profile_active boolean := false;
  v_keep text[] := array[]::text[];
  v_key text;
  v_desc text;
  r record;
begin
  select
    coalesce(
      nullif(trim(ep.preferred_name), ''),
      nullif(trim(ep.legal_name), ''),
      nullif(trim(p.name), ''),
      'Team member'
    ),
    coalesce(nullif(trim(p.job_title), ''), 'Team member'),
    ep.date_of_birth,
    ep.start_date,
    ep.employment_status,
    coalesce(ep.archived, false),
    coalesce(p.active, false)
  into v_display_name, v_job_title, v_dob, v_start, v_status, v_archived, v_profile_active
  from public.profiles p
  left join public.portal_employee_profiles ep on ep.user_id = p.id
  where p.id = p_user_id
  order by ep.updated_at desc nulls last
  limit 1;

  if not found then
    select
      coalesce(nullif(trim(ep.preferred_name), ''), nullif(trim(ep.legal_name), ''), 'Team member'),
      ep.date_of_birth,
      ep.start_date,
      ep.employment_status,
      coalesce(ep.archived, false)
    into v_display_name, v_dob, v_start, v_status, v_archived
    from public.portal_employee_profiles ep
    where ep.user_id = p_user_id
    order by ep.updated_at desc
    limit 1;
    v_profile_active := false;
  end if;

  v_active :=
    v_archived is not true
    and coalesce(v_status, 'active') in ('active', 'probation', 'leave')
    and v_profile_active;

  if not v_active then
    delete from public.portal_events
    where source = 'people_ops'
      and subject_user_id = p_user_id
      and event_date >= v_today;
    return;
  end if;

  if v_dob is not null then
    v_key := 'birthday:' || p_user_id::text;
    v_keep := array_append(v_keep, v_key);
    perform public._portal_upsert_people_moment_event(
      v_key,
      'Birthday · ' || v_display_name,
      v_display_name || ' — birthday',
      public.portal_next_annual_date(v_dob, v_today),
      'all',
      p_user_id
    );
  end if;

  if v_start is not null then
    v_key := 'anniversary:' || p_user_id::text;
    v_keep := array_append(v_keep, v_key);
    perform public._portal_upsert_people_moment_event(
      v_key,
      'Work anniversary · ' || v_display_name,
      v_display_name || ' · ' || v_job_title || ' · started ' || v_start::text,
      public.portal_next_annual_date(v_start, v_today),
      'all',
      p_user_id
    );

    for r in
      select * from (values
        (1, 0, 'Day 1'),
        (7, 7, 'Day 7'),
        (30, 30, 'Day 30'),
        (60, 60, 'Day 60'),
        (90, 90, 'Day 90')
      ) as t(day, offset_days, label)
    loop
      v_key := 'newhire:' || p_user_id::text || ':day' || r.day::text;
      v_keep := array_append(v_keep, v_key);
      v_desc := v_display_name || ' · ' || v_job_title || ' · start ' || v_start::text || '.';
      if r.day = 7 then
        v_desc := v_desc || ' Policy acknowledgements in Resources are due by Day 7.';
      end if;
      v_desc := v_desc || ' First 90 days: /people/growth?tab=milestones';
      perform public._portal_upsert_people_moment_event(
        v_key,
        'New hire check-in · ' || r.label || ' · ' || v_display_name,
        v_desc,
        (v_start + (r.offset_days || ' days')::interval)::date,
        'restricted',
        p_user_id
      );
    end loop;
  end if;

  delete from public.portal_events
  where source = 'people_ops'
    and subject_user_id = p_user_id
    and (external_key is null or not (external_key = any (v_keep)));
end;
$$;

create or replace function public.portal_sync_people_moment_events(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and p_user_id is distinct from auth.uid()
     and not public.is_hr_or_admin() then
    raise exception 'not allowed';
  end if;
  perform public._portal_sync_people_moment_events(p_user_id);
end;
$$;

create or replace function public.portal_sync_all_people_moment_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  r record;
begin
  if auth.uid() is not null and not public.is_hr_or_admin() then
    raise exception 'not allowed';
  end if;
  for r in
    select distinct user_id from public.portal_employee_profiles
  loop
    perform public._portal_sync_people_moment_events(r.user_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

grant execute on function public.portal_next_annual_date(date, date) to authenticated;
grant execute on function public.portal_sync_people_moment_events(uuid) to authenticated;
grant execute on function public.portal_sync_all_people_moment_events() to authenticated;

create or replace function public.portal_employee_profiles_sync_people_moments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._portal_sync_people_moment_events(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists portal_employee_profiles_sync_people_moments on public.portal_employee_profiles;
create trigger portal_employee_profiles_sync_people_moments
  after insert or update of preferred_name, legal_name, date_of_birth, start_date, employment_status, archived
  on public.portal_employee_profiles
  for each row
  execute function public.portal_employee_profiles_sync_people_moments();

create or replace function public.profiles_sync_people_moments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active is distinct from old.active
     or new.name is distinct from old.name
     or new.job_title is distinct from old.job_title then
    perform public._portal_sync_people_moment_events(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_people_moments on public.profiles;
create trigger profiles_sync_people_moments
  after update of active, name, job_title
  on public.profiles
  for each row
  execute function public.profiles_sync_people_moments();

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
    or subject_user_id = auth.uid()
    or subject_user_id in (
      select id from public.profiles where reports_to_id = auth.uid()
    )
  );

create table if not exists public.portal_people_escalations (
  id text primary key,
  opened_at timestamptz not null default now(),
  raised_by uuid not null references auth.users (id) on delete restrict,
  subject text not null,
  category text not null check (category in ('people', 'delivery', 'access', 'pay_question', 'other')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting', 'closed')),
  due_at date,
  related_links text,
  resolution_notes text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_people_escalations_status_idx
  on public.portal_people_escalations (status, opened_at desc);

alter table public.portal_people_escalations enable row level security;

drop policy if exists "people_escalations: read hr or raiser" on public.portal_people_escalations;
create policy "people_escalations: read hr or raiser"
  on public.portal_people_escalations for select to authenticated
  using (public.is_hr_or_admin() or raised_by = auth.uid());

drop policy if exists "people_escalations: hr+ insert" on public.portal_people_escalations;
create policy "people_escalations: hr+ insert"
  on public.portal_people_escalations for insert to authenticated
  with check (public.is_hr_or_admin());

drop policy if exists "people_escalations: hr+ update" on public.portal_people_escalations;
create policy "people_escalations: hr+ update"
  on public.portal_people_escalations for update to authenticated
  using (public.is_hr_or_admin())
  with check (public.is_hr_or_admin());

drop policy if exists "people_escalations: hr+ delete" on public.portal_people_escalations;
create policy "people_escalations: hr+ delete"
  on public.portal_people_escalations for delete to authenticated
  using (public.is_hr_or_admin());

grant select, insert, update, delete on public.portal_people_escalations to authenticated;

do $$
begin
  execute 'alter publication supabase_realtime add table public.portal_people_escalations';
exception when duplicate_object then null;
end $$;

do $$
begin
  execute 'drop policy if exists suspended_no_insert on public.portal_people_escalations';
  execute 'drop policy if exists suspended_no_update on public.portal_people_escalations';
  execute 'drop policy if exists suspended_no_delete on public.portal_people_escalations';
  if exists (select 1 from pg_proc where proname = 'is_suspended') then
    execute $p$
      create policy suspended_no_insert on public.portal_people_escalations
        as restrictive for insert to authenticated
        with check (not public.is_suspended())
    $p$;
    execute $p$
      create policy suspended_no_update on public.portal_people_escalations
        as restrictive for update to authenticated
        using (not public.is_suspended())
        with check (not public.is_suspended())
    $p$;
    execute $p$
      create policy suspended_no_delete on public.portal_people_escalations
        as restrictive for delete to authenticated
        using (not public.is_suspended())
    $p$;
  end if;
end $$;

select public.portal_sync_all_people_moment_events();
