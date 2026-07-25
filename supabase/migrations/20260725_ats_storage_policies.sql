-- Allow ATS resume/cover-letter uploads under portal-files/ats/{userId}/…
-- Previous insert policy only allowed documents|leave|avatars|media.

drop policy if exists "portal_files: authenticated insert own folder" on storage.objects;

create policy "portal_files: authenticated insert own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] in ('documents', 'leave', 'avatars', 'media', 'ats')
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- HR/admin can preview any ATS attachment; uploaders can still read their own.
drop policy if exists "portal_files: scoped read" on storage.objects;

create policy "portal_files: scoped read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portal-files'
    and (
      auth.uid()::text = (storage.foldername(name))[2]
      or (storage.foldername(name))[1] in ('media', 'avatars')
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
      or (
        (storage.foldername(name))[1] = 'leave'
        and public.get_my_role() in ('assistant_lead', 'team_lead', 'hr', 'admin')
      )
      or (
        (storage.foldername(name))[1] = 'ats'
        and public.get_my_role() in ('hr', 'admin')
      )
    )
  );
