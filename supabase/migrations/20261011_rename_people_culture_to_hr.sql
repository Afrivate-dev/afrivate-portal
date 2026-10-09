-- 2026-10-11 — Rename "People & Culture" → "Human Resources" in server-side
-- user-facing strings. The role key stays 'hr' (unchanged), so all RLS
-- policies, is_hr_or_admin() checks, and existing permissions continue to
-- work exactly as before.
--
-- Idempotent. Safe to re-run.

-- `public.admin_deny_portal_access` sent an inbox notice with the old wording.
-- Re-declare the function with the same signature and only the body copy
-- updated.
create or replace function public.admin_deny_portal_access(
  p_user_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_note text := nullif(trim(left(coalesce(p_note, ''), 500)), '');
  v_name text;
  v_active boolean;
  v_approved timestamptz;
  v_body text;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if not public.is_hr_or_admin() then
    return jsonb_build_object('success', false, 'error', 'Only Human Resources or administrators can deny access requests');
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'User is required');
  end if;

  if p_user_id = v_caller then
    return jsonb_build_object('success', false, 'error', 'You cannot deny your own access request');
  end if;

  select name, active, approved_at into v_name, v_active, v_approved
  from public.profiles
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  if v_active = true then
    return jsonb_build_object('success', false, 'error', 'This account is already active — deactivate it from Users instead');
  end if;

  if v_approved is not null then
    return jsonb_build_object('success', false, 'error', 'This account was already approved before — manage it from Users instead');
  end if;

  insert into public.portal_access_requests (user_id, status, requested_at)
  values (p_user_id, 'dismissed', now())
  on conflict (user_id) do update set
    status = 'dismissed';

  v_body := coalesce(
    v_note,
    'Your request to join the AfriVate portal was not approved. Contact Human Resources if you believe this is a mistake.'
  );

  begin
    insert into public.portal_inbox_notifications (
      id, user_id, type, title, body, link, read, created_at, from_user_id
    ) values (
      'inbox_denied_' || p_user_id::text,
      p_user_id,
      'access_denied',
      'Access request declined',
      v_body,
      '/',
      false,
      now(),
      v_caller
    )
    on conflict (id) do update set
      title = excluded.title,
      body = excluded.body,
      read = false,
      created_at = now(),
      from_user_id = excluded.from_user_id;
  exception
    when others then
      null;
  end;

  begin
    insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
    values (
      v_caller,
      'access_denied',
      'user',
      p_user_id::text,
      jsonb_build_object('note', v_note, 'name', v_name)
    );
  exception
    when others then
      null;
  end;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_deny_portal_access(uuid, text) to authenticated;
