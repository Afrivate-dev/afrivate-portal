-- Request access via RPC (no Edge Function required).
-- Run in SQL Editor if not using supabase db push.

create or replace function public.submit_portal_access_request(p_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_email text;
  v_active boolean;
  v_msg text := nullif(trim(left(coalesce(p_message, ''), 500)), '');
  v_existing timestamptz;
  v_admin record;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Not signed in');
  end if;

  select name, email, active into v_name, v_email, v_active
  from public.profiles where id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Profile not found');
  end if;

  if v_active = true then
    return jsonb_build_object('success', false, 'error', 'Your account is already active');
  end if;

  select requested_at into v_existing
  from public.portal_access_requests
  where user_id = v_uid and status = 'pending';

  if v_existing is not null and v_existing > now() - interval '1 minute' then
    return jsonb_build_object('success', true, 'already_requested', true);
  end if;

  insert into public.portal_access_requests (user_id, message, requested_at, status)
  values (v_uid, v_msg, now(), 'pending')
  on conflict (user_id) do update set
    message = excluded.message,
    requested_at = excluded.requested_at,
    status = 'pending';

  for v_admin in
    select id from public.profiles
    where role in ('hr', 'admin') and active = true
  loop
    insert into public.portal_inbox_notifications (
      id, user_id, type, title, body, link, read, created_at, from_user_id
    ) values (
      'inbox_access_' || v_uid::text || '_' || v_admin.id::text,
      v_admin.id,
      'access_request',
      'Portal access requested',
      v_name || ' (' || v_email || ') is waiting for approval.'
        || case when v_msg is not null then ' Message: ' || v_msg else '' end,
      '/admin',
      false,
      now(),
      v_uid
    )
    on conflict (id) do nothing;
  end loop;

  return jsonb_build_object('success', true, 'already_requested', false);
end;
$$;

grant execute on function public.submit_portal_access_request(text) to authenticated;
