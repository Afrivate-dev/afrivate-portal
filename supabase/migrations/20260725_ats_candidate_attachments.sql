-- Store original application attachment files (PDF/DOCX/images) for Gmail-like file preview.

alter table public.portal_job_candidates
  add column if not exists attachments jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
