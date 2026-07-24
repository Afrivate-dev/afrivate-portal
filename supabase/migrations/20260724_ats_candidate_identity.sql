-- Extra ATS identity + Gmail deep-link fields for ranked candidates.

alter table public.portal_job_candidates
  add column if not exists phone text,
  add column if not exists linkedin_url text,
  add column if not exists location text,
  add column if not exists gmail_thread_id text,
  add column if not exists gmail_message_id text;
