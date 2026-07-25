-- ATS attachments + shared HR/admin access (run in Supabase SQL Editor).
-- Fixes: CVs never saving, other admins can't read files uploaded by a different admin.

-- 1) Ensure attachments JSON column exists
alter table public.portal_job_candidates
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- 2) Shared read of ats/ for every signed-in user (recruitment is collaborative)
drop policy if exists "portal_files: scoped read" on storage.objects;
drop policy if exists "portal_files: authenticated read" on storage.objects;

create policy "portal_files: scoped read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portal-files'
    and (
      auth.uid()::text = (storage.foldername(name))[2]
      or (storage.foldername(name))[1] in ('media', 'avatars', 'ats')
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
    )
  );

-- 3) Insert: own folder for all, plus HR/admin can write anywhere under ats/
drop policy if exists "portal_files: authenticated insert own folder" on storage.objects;

create policy "portal_files: authenticated insert own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portal-files'
    and (
      (
        (storage.foldername(name))[1] in ('documents', 'leave', 'avatars', 'media', 'ats')
        and auth.uid()::text = (storage.foldername(name))[2]
      )
      or (
        (storage.foldername(name))[1] = 'ats'
        and public.is_hr_or_admin()
      )
    )
  );

-- 4) Allow HR/admin to update/delete ATS objects (repair broken uploads)
drop policy if exists "portal_files: ats hr update" on storage.objects;
create policy "portal_files: ats hr update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'ats'
    and (
      auth.uid()::text = (storage.foldername(name))[2]
      or public.is_hr_or_admin()
    )
  )
  with check (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] = 'ats'
    and (
      auth.uid()::text = (storage.foldername(name))[2]
      or public.is_hr_or_admin()
    )
  );

drop policy if exists "portal_files: uploader or admin delete" on storage.objects;
create policy "portal_files: uploader or admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portal-files'
    and (
      auth.uid()::text = (storage.foldername(name))[2]
      or public.is_hr_or_admin()
    )
  );

-- 5) Candidate / requisition / criteria already use is_hr_or_admin() — reaffirm for clarity
-- (no policy rewrite needed if 20260704_hr_operations.sql was applied)

notify pgrst, 'reload schema';
