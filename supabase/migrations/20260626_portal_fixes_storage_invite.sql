-- Portal fixes: file storage bucket + document/leave file paths.
-- Run in Supabase SQL Editor after 20260625.

alter table public.portal_documents
  add column if not exists file_path text;

alter table public.portal_leave_requests
  add column if not exists supporting_doc_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal-files', 'portal-files', false, 52428800, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "portal_files: authenticated read" on storage.objects;
drop policy if exists "portal_files: authenticated insert own folder" on storage.objects;
drop policy if exists "portal_files: uploader or admin delete" on storage.objects;

create policy "portal_files: authenticated read"
  on storage.objects for select to authenticated
  using (bucket_id = 'portal-files');

create policy "portal_files: authenticated insert own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portal-files'
    and (storage.foldername(name))[1] in ('documents', 'leave', 'avatars', 'media')
    and auth.uid()::text = (storage.foldername(name))[2]
  );

create policy "portal_files: uploader or admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portal-files'
    and (
      auth.uid()::text = (storage.foldername(name))[2]
      or public.is_portal_admin()
      or public.is_hr_or_admin()
    )
  );
