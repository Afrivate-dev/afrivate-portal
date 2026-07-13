-- Audit hardening: storage scoping, task assignee updates, docs HR delete,
-- memo insert binds poster, tighter revival operator matching.

-- ── Storage: stop org-wide file listing/download ─────────────────────────────
-- Paths are folder/userId/...  Folders: media, avatars, documents, leave.
drop policy if exists "portal_files: authenticated read" on storage.objects;
drop policy if exists "portal_files: scoped read" on storage.objects;

create policy "portal_files: scoped read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portal-files'
    and (
      -- Own uploads
      auth.uid()::text = (storage.foldername(name))[2]
      -- Memo/media + avatars are shared with signed-in staff who can see the memo/profile
      or (storage.foldername(name))[1] in ('media', 'avatars')
      -- Leave / HR docs: uploader, or lead/HR/admin (managers need leave supporting docs)
      or (
        (storage.foldername(name))[1] in ('leave', 'documents')
        and public.get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin')
      )
    )
  );

-- ── Tasks: assignees can update (status / hours / progress) ───────────────────
drop policy if exists "tasks: owner or admin can update" on public.portal_tasks;
drop policy if exists "tasks: owner assignee or admin can update" on public.portal_tasks;
create policy "tasks: owner assignee or admin can update"
  on public.portal_tasks for update
  to authenticated
  using (
    owner_id = auth.uid()
    or public.get_my_role() = 'admin'
    or assignee_id = auth.uid()
    or (
      assignee_ids is not null
      and assignee_ids ? auth.uid()::text
    )
  )
  with check (
    owner_id = auth.uid()
    or public.get_my_role() = 'admin'
    or assignee_id = auth.uid()
    or (
      assignee_ids is not null
      and assignee_ids ? auth.uid()::text
    )
  );

-- ── Documents: HR can delete (matches Document Library UI) ───────────────────
drop policy if exists "documents: admin delete" on public.portal_documents;
drop policy if exists "documents: hr or admin delete" on public.portal_documents;
create policy "documents: hr or admin delete"
  on public.portal_documents for delete
  to authenticated
  using (public.get_my_role() in ('hr', 'admin'));

-- ── Announcements: bind poster to caller on insert ───────────────────────────
drop policy if exists "announcements: team_lead+ insert" on public.portal_announcements;
drop policy if exists "announcements: team_lead+ insert own" on public.portal_announcements;
create policy "announcements: team_lead+ insert own"
  on public.portal_announcements for insert
  to authenticated
  with check (
    posted_by_id = auth.uid()
    and public.get_my_role() in ('team_lead', 'hr', 'admin')
  );

-- ── Revival launch: email / local-part only (no display-name matching) ───────
create or replace function public.is_revival_launch_operator()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_local text;
begin
  select lower(coalesce(p.email, ''))
  into v_email
  from public.profiles p
  where p.id = auth.uid();

  if v_email is null or v_email = '' then
    return false;
  end if;

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
  if v_local in ('emmanuel', 'okpiaifo', 'daniel', 'opemipo', 'adesoye', 'dorcas') then
    return true;
  end if;

  return false;
end;
$$;
