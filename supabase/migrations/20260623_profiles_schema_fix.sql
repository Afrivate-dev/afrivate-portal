-- Ensure base profile columns exist (older projects may predate avatar_url / directory fields).
-- Run in SQL Editor if profile loading fails with "column profiles.avatar_url does not exist".

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists role text not null default 'staff';
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles add column if not exists approved_at timestamptz;
alter table public.profiles add column if not exists joined_at date;
alter table public.profiles add column if not exists avatar_color text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists work_location text;
alter table public.profiles add column if not exists pronouns text;
alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists reports_to_id uuid references public.profiles (id) on delete set null;

-- Reliable own-profile read (explicit columns — safe when schema is partially migrated).
create or replace function public.get_my_portal_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_email text;
  v_name text;
  v_role text;
  v_department text;
  v_job_title text;
  v_active boolean;
begin
  if v_uid is null then
    return null;
  end if;

  select p.id, p.email, p.name, p.role, p.department, p.job_title, p.active
  into v_id, v_email, v_name, v_role, v_department, v_job_title, v_active
  from public.profiles p
  where p.id = v_uid;

  if not found then
    insert into public.profiles (id, email, name, role, department, job_title, active)
    select
      u.id,
      u.email,
      coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(u.email, '@', 1)),
      'staff',
      'Unassigned',
      'Staff',
      false
    from auth.users u
    where u.id = v_uid
    returning id, email, name, role, department, job_title, active
    into v_id, v_email, v_name, v_role, v_department, v_job_title, v_active;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'email', v_email,
    'name', v_name,
    'role', v_role,
    'department', v_department,
    'job_title', v_job_title,
    'active', coalesce(v_active, false)
  );
end;
$$;

grant execute on function public.get_my_portal_profile() to authenticated;
