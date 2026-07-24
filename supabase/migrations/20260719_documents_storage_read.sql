-- Resource library files: staff couldn't preview/download because the
-- 20260715 storage policy limited the documents/ folder to leads/HR/admin.
-- This migration is self-contained: creates get_my_role() if missing, then
-- replaces the storage read policy so anyone who can see a portal_documents
-- row may read the matching file. Leave stays scoped to leads/HR/admin.

-- ── Helper (may be missing if earlier RLS migrations were never applied) ─────
create or replace function public.get_my_role()
  returns text
  language sql
  security definer
  stable
  set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

grant execute on function public.get_my_role() to authenticated;

drop policy if exists "portal_files: scoped read" on storage.objects;
drop policy if exists "portal_files: authenticated read" on storage.objects;

create policy "portal_files: scoped read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portal-files'
    and (
      -- Own uploads
      auth.uid()::text = (storage.foldername(name))[2]
      -- Memo/media + avatars are shared with signed-in staff
      or (storage.foldername(name))[1] in ('media', 'avatars')
      -- Resource library: readable when the document row is visible to you.
      -- The subquery runs as the caller, so portal_documents RLS
      -- (hr_only / management_only) is enforced automatically.
      or (
        (storage.foldername(name))[1] = 'documents'
        and (
          public.get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin')
          or exists (
            select 1
            from public.portal_documents d
            where d.file_path = storage.objects.name
          )
        )
      )
      -- Leave supporting docs: uploader (covered above) or leads/HR/admin
      or (
        (storage.foldername(name))[1] = 'leave'
        and public.get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin')
      )
    )
  );
