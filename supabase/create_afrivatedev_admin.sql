-- Bootstrap afrivatedev@gmail.com as an active portal administrator (no approval wait).
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run — idempotent.
--
-- If you already signed up via Request access, this script still works.
-- After running: sign out completely, then sign in again at /login.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_email text := 'afrivatedev@gmail.com';
  v_password text := 'AfriVateDev2026!';  -- only used when creating the auth user
  v_name text := 'AfriVate Dev';
  v_uid uuid;
  v_active boolean;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(v_email);

  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      recovery_token,
      phone_change,
      phone_change_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf', 10)),
      now(),
      '', '', '', '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_name),
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider,
      provider_id,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_uid,
      'email',
      v_uid::text,
      jsonb_build_object(
        'sub', v_uid::text,
        'email', v_email,
        'email_verified', true
      ),
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Created auth user for %.', v_email;
  ELSE
    RAISE NOTICE 'Auth user already exists for %.', v_email;
  END IF;

  -- The profile guard trigger blocks role/active changes from the SQL Editor
  -- (no JWT → not HR/admin). Disable briefly for this bootstrap only.
  ALTER TABLE public.profiles DISABLE TRIGGER guard_profile_sensitive_fields_trigger;

  INSERT INTO public.profiles (id, email, name, role, department, job_title, active, approved_at)
  VALUES (
    v_uid,
    v_email,
    v_name,
    'admin',
    'Leadership',
    'Administrator',
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = 'admin',
    department = EXCLUDED.department,
    job_title = EXCLUDED.job_title,
    active = true,
    approved_at = COALESCE(public.profiles.approved_at, now());

  ALTER TABLE public.profiles ENABLE TRIGGER guard_profile_sensitive_fields_trigger;

  -- Clear pending access request so the UI does not show "waiting for approval"
  DELETE FROM public.portal_access_requests WHERE user_id = v_uid;

  SELECT active INTO v_active FROM public.profiles WHERE id = v_uid;

  IF v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Profile is still inactive for %. Contact support.', v_email;
  END IF;

  RAISE NOTICE 'Done — % is an active admin. Sign out, then sign in at /login.', v_email;
END $$;

-- Verify:
-- SELECT u.email, p.name, p.role, p.active, p.approved_at
-- FROM auth.users u
-- JOIN public.profiles p ON p.id = u.id
-- WHERE lower(u.email) = 'afrivatedev@gmail.com';

-- Portal client: reliable own-profile read (see 20260623_profiles_schema_fix.sql)
-- Uses explicit columns — safe when avatar_url and other optional fields are missing.
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
