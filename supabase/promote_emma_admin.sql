-- Promote emmaokpiaifo@gmail.com to portal administrator.
-- Run in Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- Safe to re-run — idempotent upsert by email.

DO $$
DECLARE
  v_uid uuid;
  v_email text := 'emmaokpiaifo@gmail.com';
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(v_email);

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No auth user found for %. Sign up first, then re-run this script.', v_email;
  END IF;

  INSERT INTO public.profiles (id, email, name, role, department, job_title, active, approved_at)
  SELECT
    u.id,
    u.email,
    COALESCE(
      NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
      initcap(split_part(u.email, '@', 1))
    ),
    'admin',
    'Leadership',
    'Administrator',
    true,
    now()
  FROM auth.users u
  WHERE u.id = v_uid
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = 'admin',
    active = true,
    approved_at = COALESCE(public.profiles.approved_at, now());

  RAISE NOTICE 'Done — % is now an active admin.', v_email;
END $$;

-- Verify:
-- SELECT id, email, name, role, active FROM public.profiles WHERE lower(email) = 'emmaokpiaifo@gmail.com';
