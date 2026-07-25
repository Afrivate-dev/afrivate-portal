-- Extra ATS identity + Gmail deep-link fields for ranked candidates.
-- REQUIRED for phone / LinkedIn / location columns and dedicated Gmail id columns.
-- Open Supabase → SQL Editor → paste & run this entire file.
--
-- Note: the app also stores Gmail ids in external_id as gmail:threadId:messageId
-- so "Open in Gmail" works even before this migration. Run it anyway for full support.

alter table public.portal_job_candidates
  add column if not exists phone text,
  add column if not exists linkedin_url text,
  add column if not exists location text,
  add column if not exists gmail_thread_id text,
  add column if not exists gmail_message_id text;

-- Refresh PostgREST schema cache (if available)
notify pgrst, 'reload schema';
