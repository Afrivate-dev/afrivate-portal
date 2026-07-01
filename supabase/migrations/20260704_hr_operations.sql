-- HR operations: pulse, L&D, performance, recruitment, confidential ops.
-- Run after 20260703_portal_label_categories.sql

-- ── Pulse & eNPS ──────────────────────────────────────────────────────────
create table if not exists public.portal_pulse_surveys (
  id           text primary key,
  title        text not null,
  description  text,
  survey_type  text not null default 'pulse' check (survey_type in ('pulse', 'enps')),
  questions    jsonb not null default '[]',
  active       boolean not null default true,
  opens_at     timestamptz,
  closes_at    timestamptz,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.portal_pulse_responses (
  id           text primary key,
  survey_id    text not null references public.portal_pulse_surveys (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  answers      jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  unique (survey_id, user_id)
);

-- ── Learning (Alison submissions) ─────────────────────────────────────────
create table if not exists public.portal_learning_assignments (
  id           text primary key,
  title        text not null,
  alison_url   text not null,
  description  text,
  due_date     date,
  month_label  text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.portal_learning_submissions (
  id               text primary key,
  assignment_id    text not null references public.portal_learning_assignments (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  course_name      text not null,
  completed_at     date not null,
  certificate_path text,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_note    text,
  reviewed_by      uuid references auth.users (id) on delete set null,
  reviewed_at      timestamptz,
  submitted_at     timestamptz not null default now()
);

-- ── Policy acknowledgments ──────────────────────────────────────────────────
create table if not exists public.portal_document_acknowledgments (
  id               text primary key,
  document_id      text not null references public.portal_documents (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  acknowledged_at  timestamptz not null default now(),
  unique (document_id, user_id)
);

alter table public.portal_documents
  add column if not exists requires_acknowledgment boolean not null default false;

-- ── OKRs ────────────────────────────────────────────────────────────────────
create table if not exists public.portal_okrs (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  year         int not null,
  quarter      text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  objective    text not null,
  key_results  jsonb not null default '[]',
  updated_at   timestamptz not null default now()
);

-- ── 1:1 completion logs ─────────────────────────────────────────────────────
create table if not exists public.portal_one_on_one_logs (
  id           text primary key,
  employee_id  uuid not null references auth.users (id) on delete cascade,
  manager_id   uuid not null references auth.users (id) on delete cascade,
  month        text not null,
  completed    boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (employee_id, manager_id, month)
);

-- ── IDPs ────────────────────────────────────────────────────────────────────
create table if not exists public.portal_idps (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade unique,
  content      text not null default '',
  status       text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  manager_note text,
  updated_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

-- ── 360° feedback ───────────────────────────────────────────────────────────
create table if not exists public.portal_feedback_cycles (
  id           text primary key,
  title        text not null,
  year         int not null,
  half         text not null check (half in ('H1', 'H2')),
  status       text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  questions    jsonb not null default '[]',
  opens_at     timestamptz,
  closes_at    timestamptz
);

create table if not exists public.portal_feedback_entries (
  id               text primary key,
  cycle_id         text not null references public.portal_feedback_cycles (id) on delete cascade,
  subject_user_id  uuid not null references auth.users (id) on delete cascade,
  reviewer_id      uuid not null references auth.users (id) on delete cascade,
  relationship     text not null check (relationship in ('self', 'manager', 'peer', 'report')),
  answers          jsonb not null default '{}',
  submitted_at     timestamptz not null default now(),
  unique (cycle_id, subject_user_id, reviewer_id, relationship)
);

-- ── Recruitment ─────────────────────────────────────────────────────────────
create table if not exists public.portal_job_requisitions (
  id           text primary key,
  title        text not null,
  department   text not null,
  status       text not null default 'open' check (status in ('open', 'filled', 'closed')),
  description  text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.portal_job_candidates (
  id              text primary key,
  requisition_id  text not null references public.portal_job_requisitions (id) on delete cascade,
  name            text not null,
  email           text,
  stage           text not null default 'applied',
  notes           text,
  score           int,
  updated_at      timestamptz not null default now()
);

-- ── Exit interviews & grievances (HR-only read via RLS) ─────────────────────
create table if not exists public.portal_exit_interviews (
  id              text primary key,
  user_id         uuid references auth.users (id) on delete set null,
  departing_name  text not null,
  last_day        date,
  reasons         jsonb not null default '[]',
  notes           text,
  conducted_by    uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.portal_grievances (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  category     text not null,
  body         text not null,
  status       text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  hr_note      text,
  confidential boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ── Onboarding 30-60-90 ─────────────────────────────────────────────────────
create table if not exists public.portal_onboarding_milestones (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  phase        text not null check (phase in ('day_30', 'day_60', 'day_90')),
  label        text not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  due_date     date
);

-- ── Quarterly awards ────────────────────────────────────────────────────────
create table if not exists public.portal_quarterly_awards (
  id            text primary key,
  year          int not null,
  quarter       text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  category      text not null,
  winner_id     uuid not null references auth.users (id) on delete cascade,
  nominated_by  uuid references auth.users (id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);

-- ── Memos: HR digest category ───────────────────────────────────────────────
alter table public.portal_announcements
  add column if not exists memo_category text default 'general'
    check (memo_category in ('general', 'digest', 'policy'));

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.portal_pulse_surveys enable row level security;
alter table public.portal_pulse_responses enable row level security;
alter table public.portal_learning_assignments enable row level security;
alter table public.portal_learning_submissions enable row level security;
alter table public.portal_document_acknowledgments enable row level security;
alter table public.portal_okrs enable row level security;
alter table public.portal_one_on_one_logs enable row level security;
alter table public.portal_idps enable row level security;
alter table public.portal_feedback_cycles enable row level security;
alter table public.portal_feedback_entries enable row level security;
alter table public.portal_job_requisitions enable row level security;
alter table public.portal_job_candidates enable row level security;
alter table public.portal_exit_interviews enable row level security;
alter table public.portal_grievances enable row level security;
alter table public.portal_onboarding_milestones enable row level security;
alter table public.portal_quarterly_awards enable row level security;

-- Pulse: all read active; lead+ manage; users insert own response once
create policy "pulse_surveys: read" on public.portal_pulse_surveys for select to authenticated using (true);
create policy "pulse_surveys: lead+ write" on public.portal_pulse_surveys for all to authenticated using (public.is_lead_or_above()) with check (public.is_lead_or_above());

create policy "pulse_responses: read own or lead+" on public.portal_pulse_responses for select to authenticated
  using (user_id = auth.uid() or public.is_lead_or_above());
create policy "pulse_responses: insert own" on public.portal_pulse_responses for insert to authenticated with check (user_id = auth.uid());

-- Learning
create policy "learning_assignments: read" on public.portal_learning_assignments for select to authenticated using (true);
create policy "learning_assignments: hr+ write" on public.portal_learning_assignments for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

create policy "learning_submissions: read own or hr+" on public.portal_learning_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_hr_or_admin());
create policy "learning_submissions: insert own" on public.portal_learning_submissions for insert to authenticated with check (user_id = auth.uid());
create policy "learning_submissions: hr+ update" on public.portal_learning_submissions for update to authenticated using (public.is_hr_or_admin());

-- Document acks
create policy "doc_ack: read own or hr+" on public.portal_document_acknowledgments for select to authenticated
  using (user_id = auth.uid() or public.is_hr_or_admin());
create policy "doc_ack: insert own" on public.portal_document_acknowledgments for insert to authenticated with check (user_id = auth.uid());

-- OKRs: own + manager/lead+
create policy "okrs: read own or lead+" on public.portal_okrs for select to authenticated using (user_id = auth.uid() or public.is_lead_or_above());
create policy "okrs: write own or lead+" on public.portal_okrs for all to authenticated
  using (user_id = auth.uid() or public.is_lead_or_above()) with check (user_id = auth.uid() or public.is_lead_or_above());

-- 1:1 logs
create policy "one_on_one: read involved or lead+" on public.portal_one_on_one_logs for select to authenticated
  using (employee_id = auth.uid() or manager_id = auth.uid() or public.is_lead_or_above());
create policy "one_on_one: manager write" on public.portal_one_on_one_logs for all to authenticated
  using (manager_id = auth.uid() or public.is_hr_or_admin()) with check (manager_id = auth.uid() or public.is_hr_or_admin());

-- IDPs
create policy "idp: read own or lead+" on public.portal_idps for select to authenticated using (user_id = auth.uid() or public.is_lead_or_above());
create policy "idp: write own" on public.portal_idps for insert to authenticated with check (user_id = auth.uid());
create policy "idp: update own or lead+" on public.portal_idps for update to authenticated using (user_id = auth.uid() or public.is_lead_or_above());

-- 360
create policy "feedback_cycles: read" on public.portal_feedback_cycles for select to authenticated using (true);
create policy "feedback_cycles: hr+ write" on public.portal_feedback_cycles for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

create policy "feedback_entries: read own subject or hr+" on public.portal_feedback_entries for select to authenticated
  using (subject_user_id = auth.uid() or reviewer_id = auth.uid() or public.is_hr_or_admin());
create policy "feedback_entries: insert reviewer" on public.portal_feedback_entries for insert to authenticated with check (reviewer_id = auth.uid());

-- Recruitment: hr+ only
create policy "jobs: hr+ all" on public.portal_job_requisitions for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());
create policy "candidates: hr+ all" on public.portal_job_candidates for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

-- Exit & grievance
create policy "exit: hr+ all" on public.portal_exit_interviews for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());
create policy "grievance: insert own" on public.portal_grievances for insert to authenticated with check (user_id = auth.uid());
create policy "grievance: read own or hr+" on public.portal_grievances for select to authenticated using (user_id = auth.uid() or public.is_hr_or_admin());
create policy "grievance: hr+ update" on public.portal_grievances for update to authenticated using (public.is_hr_or_admin());

-- Milestones
create policy "milestones: read own or lead+" on public.portal_onboarding_milestones for select to authenticated using (user_id = auth.uid() or public.is_lead_or_above());
create policy "milestones: lead+ write" on public.portal_onboarding_milestones for all to authenticated using (public.is_lead_or_above()) with check (public.is_lead_or_above());

-- Awards: all read; hr+ write
create policy "awards: read" on public.portal_quarterly_awards for select to authenticated using (true);
create policy "awards: hr+ write" on public.portal_quarterly_awards for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

-- Grants
grant select, insert, update, delete on
  public.portal_pulse_surveys, public.portal_pulse_responses,
  public.portal_learning_assignments, public.portal_learning_submissions,
  public.portal_document_acknowledgments, public.portal_okrs,
  public.portal_one_on_one_logs, public.portal_idps,
  public.portal_feedback_cycles, public.portal_feedback_entries,
  public.portal_job_requisitions, public.portal_job_candidates,
  public.portal_exit_interviews, public.portal_grievances,
  public.portal_onboarding_milestones, public.portal_quarterly_awards
to authenticated;

-- Realtime (helper from 20260629 is dropped after that migration — inline add)
do $do$
begin
  if to_regclass('public.portal_pulse_surveys') is not null then
    begin
      alter publication supabase_realtime add table public.portal_pulse_surveys;
    exception when duplicate_object then null;
    end;
  end if;
  if to_regclass('public.portal_learning_submissions') is not null then
    begin
      alter publication supabase_realtime add table public.portal_learning_submissions;
    exception when duplicate_object then null;
    end;
  end if;
end $do$;
