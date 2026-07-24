-- Editable ATS scoring criteria + Gmail message dedupe helpers.

create table if not exists public.portal_ats_criteria (
  role_profile text primary key
    check (role_profile in ('frontend', 'backend', 'designer', 'general')),
  label text not null,
  strong_min int not null default 75,
  viable_min int not null default 55,
  reject_below int not null default 40,
  criteria jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.portal_ats_criteria enable row level security;

drop policy if exists "ats_criteria: hr+ all" on public.portal_ats_criteria;
create policy "ats_criteria: hr+ all"
  on public.portal_ats_criteria for all to authenticated
  using (public.is_hr_or_admin())
  with check (public.is_hr_or_admin());

grant select, insert, update, delete on public.portal_ats_criteria to authenticated;

-- Track Gmail message ids already imported (avoid duplicates on sync)
alter table public.portal_job_candidates
  add column if not exists external_id text;

create unique index if not exists portal_job_candidates_external_id_uidx
  on public.portal_job_candidates (external_id)
  where external_id is not null;

create index if not exists portal_job_candidates_email_idx
  on public.portal_job_candidates (lower(email));
