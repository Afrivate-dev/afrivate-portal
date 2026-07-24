-- ATS fields for screening Gmail/Indeed applications against open roles.

alter table public.portal_job_candidates
  add column if not exists source text,
  add column if not exists github_url text,
  add column if not exists portfolio_url text,
  add column if not exists cover_letter boolean not null default false,
  add column if not exists resume_summary text,
  add column if not exists score_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists recommendation text;

alter table public.portal_job_candidates
  drop constraint if exists portal_job_candidates_source_check;

alter table public.portal_job_candidates
  add constraint portal_job_candidates_source_check
  check (
    source is null
    or source in ('gmail', 'indeed', 'bebee', 'jobberman', 'linkedin', 'manual', 'other')
  );

alter table public.portal_job_candidates
  drop constraint if exists portal_job_candidates_recommendation_check;

alter table public.portal_job_candidates
  add constraint portal_job_candidates_recommendation_check
  check (
    recommendation is null
    or recommendation in ('strong', 'viable', 'weak', 'reject')
  );

create index if not exists portal_job_candidates_score_idx
  on public.portal_job_candidates (requisition_id, score desc nulls last);
