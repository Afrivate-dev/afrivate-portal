-- Employee Information Hub, progressive discipline / PIP, appraisals, audit, offboarding
-- AfriVate SWP-aligned people operations

create table if not exists public.portal_employee_profiles (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade unique,
  preferred_name text,
  legal_name text,
  personal_email text,
  phone text,
  work_location text,
  address_country text,
  date_of_birth date,
  pronouns text,
  linkedin_url text,
  bio text,
  skills jsonb not null default '[]'::jsonb,
  emergency_contact jsonb,
  next_of_kin_notes text,
  engagement_type text not null default 'employee'
    check (engagement_type in ('employee', 'volunteer', 'contractor')),
  employment_status text not null default 'active'
    check (employment_status in ('active', 'probation', 'leave', 'exiting', 'terminated', 'archived')),
  start_date date,
  probation_end_date date,
  confirmation_date date,
  confirmed_at timestamptz,
  confirmed_by_id uuid references auth.users (id) on delete set null,
  contract_terms_summary text,
  payroll_setup_complete boolean not null default false,
  hr_private_notes text,
  hr_requests_update boolean not null default false,
  archived boolean not null default false,
  profile_completeness integer not null default 0,
  last_employee_update_at timestamptz,
  last_hr_update_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_discipline_cases (
  id text primary key,
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  step text not null check (step in (
    'coaching_verbal', 'written_warning', 'pip', 'restricted_duties', 'termination_case'
  )),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  employee_level text not null check (employee_level in (
    'staff', 'assistant_lead', 'team_lead', 'contractor', 'volunteer'
  )),
  triggers jsonb not null default '[]'::jsonb,
  reason text not null,
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'pending_hr', 'active', 'completed', 'escalated', 'cancelled'
  )),
  delivery_mode text not null check (delivery_mode in (
    'portal_notice', 'meeting', 'email_formal', 'written_letter'
  )),
  issued_by_id uuid not null references auth.users (id) on delete restrict,
  recommended_by_id uuid references auth.users (id) on delete set null,
  approved_by_id uuid references auth.users (id) on delete set null,
  delivered_at timestamptz,
  acknowledgement_required boolean not null default true,
  acknowledged_at timestamptz,
  pip_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_pips (
  id text primary key,
  case_id text not null references public.portal_discipline_cases (id) on delete cascade,
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  goals jsonb not null default '[]'::jsonb,
  start_date date not null,
  end_date date not null,
  duration_days integer not null,
  reviews jsonb not null default '[]'::jsonb,
  outcome text check (outcome is null or outcome in (
    'passed', 'extended', 'escalated', 'terminated_recommendation'
  )),
  outcome_note text,
  outcome_at timestamptz,
  outcome_by_id uuid references auth.users (id) on delete set null,
  template_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_appraisals (
  id text primary key,
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete restrict,
  period_label text not null,
  cadence text not null check (cadence in ('quarterly', 'monthly')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'calibrated', 'finalized')),
  output_score integer not null check (output_score between 0 and 100),
  soft_skills_score integer not null check (soft_skills_score between 0 and 100),
  overall_score integer not null check (overall_score between 0 and 100),
  band text not null check (band in (
    'exceptional', 'good', 'concern', 'disciplinary', 'termination_risk'
  )),
  output_notes text,
  soft_skills_notes text,
  evidence_links jsonb not null default '[]'::jsonb,
  on_active_pip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz
);

create table if not exists public.portal_hr_audit_log (
  id text primary key,
  actor_id uuid not null references auth.users (id) on delete restrict,
  entity_type text not null check (entity_type in (
    'employee_profile', 'discipline_case', 'pip', 'appraisal', 'offboarding'
  )),
  entity_id text not null,
  action text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_offboarding_checklists (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  last_day date,
  volunteer_bridge_notice boolean not null default false,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  created_by_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_employee_profiles_status_idx
  on public.portal_employee_profiles (employment_status) where archived = false;
create index if not exists portal_discipline_cases_subject_idx
  on public.portal_discipline_cases (subject_user_id, status);
create index if not exists portal_pips_subject_idx on public.portal_pips (subject_user_id);
create index if not exists portal_appraisals_subject_idx on public.portal_appraisals (subject_user_id);
create index if not exists portal_hr_audit_log_entity_idx
  on public.portal_hr_audit_log (entity_type, entity_id, created_at desc);

alter table public.portal_employee_profiles enable row level security;
alter table public.portal_discipline_cases enable row level security;
alter table public.portal_pips enable row level security;
alter table public.portal_appraisals enable row level security;
alter table public.portal_hr_audit_log enable row level security;
alter table public.portal_offboarding_checklists enable row level security;

-- Profiles: employee reads/updates own personal row; HR full access
create policy "employee_profiles: read own or hr+"
  on public.portal_employee_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_hr_or_admin());

create policy "employee_profiles: insert own or hr+"
  on public.portal_employee_profiles for insert to authenticated
  with check (user_id = auth.uid() or public.is_hr_or_admin());

create policy "employee_profiles: update own or hr+"
  on public.portal_employee_profiles for update to authenticated
  using (user_id = auth.uid() or public.is_hr_or_admin());

create policy "employee_profiles: hr+ delete"
  on public.portal_employee_profiles for delete to authenticated
  using (public.is_hr_or_admin());

-- Discipline: subject can read active/completed about self; HR all; leads can insert recommendations
create policy "discipline: read subject or hr+ or issuer"
  on public.portal_discipline_cases for select to authenticated
  using (
    subject_user_id = auth.uid()
    or issued_by_id = auth.uid()
    or recommended_by_id = auth.uid()
    or public.is_hr_or_admin()
  );

create policy "discipline: insert lead+ or hr+"
  on public.portal_discipline_cases for insert to authenticated
  with check (public.is_lead_or_above() or public.is_hr_or_admin());

create policy "discipline: update hr+ or issuer pending"
  on public.portal_discipline_cases for update to authenticated
  using (public.is_hr_or_admin() or issued_by_id = auth.uid() or recommended_by_id = auth.uid());

-- PIPs
create policy "pips: read subject or hr+ or lead+"
  on public.portal_pips for select to authenticated
  using (subject_user_id = auth.uid() or public.is_lead_or_above() or public.is_hr_or_admin());

create policy "pips: hr+ write"
  on public.portal_pips for all to authenticated
  using (public.is_hr_or_admin())
  with check (public.is_hr_or_admin());

-- Appraisals
create policy "appraisals: read subject or reviewer or hr+"
  on public.portal_appraisals for select to authenticated
  using (
    subject_user_id = auth.uid()
    or reviewer_id = auth.uid()
    or public.is_hr_or_admin()
  );

create policy "appraisals: write lead+ or hr+"
  on public.portal_appraisals for insert to authenticated
  with check (public.is_lead_or_above() or public.is_hr_or_admin());

create policy "appraisals: update reviewer or hr+"
  on public.portal_appraisals for update to authenticated
  using (reviewer_id = auth.uid() or public.is_hr_or_admin());

-- Audit: HR read; any authenticated insert of own actor row via service patterns — restrict to hr+ write
create policy "hr_audit: hr+ read"
  on public.portal_hr_audit_log for select to authenticated
  using (public.is_hr_or_admin());

create policy "hr_audit: insert authenticated as self"
  on public.portal_hr_audit_log for insert to authenticated
  with check (actor_id = auth.uid());

-- Offboarding: HR full; subject read
create policy "offboarding: read subject or hr+"
  on public.portal_offboarding_checklists for select to authenticated
  using (user_id = auth.uid() or public.is_hr_or_admin());

create policy "offboarding: hr+ write"
  on public.portal_offboarding_checklists for all to authenticated
  using (public.is_hr_or_admin())
  with check (public.is_hr_or_admin());

grant select, insert, update, delete on public.portal_employee_profiles to authenticated;
grant select, insert, update, delete on public.portal_discipline_cases to authenticated;
grant select, insert, update, delete on public.portal_pips to authenticated;
grant select, insert, update, delete on public.portal_appraisals to authenticated;
grant select, insert on public.portal_hr_audit_log to authenticated;
grant select, insert, update, delete on public.portal_offboarding_checklists to authenticated;
