-- HR audit round 4: 360° templates/assignments, exit reason normalization,
-- config delete guards, milestone seed on hire, feedback insert RLS.

-- ── Exit interview reason normalization (legacy labels → config IDs) ───────────
update public.portal_exit_interviews ex
set reasons = coalesce(
  (
    select jsonb_agg(
      to_jsonb(
        coalesce(
          (
            select er.id
            from public.portal_exit_reasons er
            where lower(trim(er.label)) = lower(trim(elem #>> '{}'))
            limit 1
          ),
          (
            select er.id
            from public.portal_exit_reasons er
            where er.id = lower(regexp_replace(trim(elem #>> '{}'), '[^a-zA-Z0-9]+', '_', 'g'))
            limit 1
          ),
          trim(elem #>> '{}')
        )
      )
    )
    from jsonb_array_elements(ex.reasons) elem
  ),
  '[]'::jsonb
)
where jsonb_typeof(ex.reasons) = 'array';

-- ── 360° feedback templates ───────────────────────────────────────────────────
create table if not exists public.portal_feedback_templates (
  id          text primary key,
  label       text not null,
  description text,
  questions   jsonb not null default '[]',
  sort_order  int not null default 0
);

alter table public.portal_feedback_templates enable row level security;

create policy "feedback_templates: read" on public.portal_feedback_templates
  for select to authenticated using (true);
create policy "feedback_templates: hr+ write" on public.portal_feedback_templates
  for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

grant select, insert, update, delete on public.portal_feedback_templates to authenticated;

insert into public.portal_feedback_templates (id, label, description, questions, sort_order) values
  (
    'tpl_360_standard',
    'Standard 360° review',
    'Values and collaboration scales',
    '[
      {"id":"values","text":"Embodies the Afrivate Way","type":"scale","min":1,"max":10},
      {"id":"collab","text":"Collaborates effectively","type":"scale","min":1,"max":10}
    ]'::jsonb,
    1
  )
on conflict (id) do nothing;

-- ── 360° reviewer assignments ─────────────────────────────────────────────────
create table if not exists public.portal_feedback_assignments (
  id               text primary key,
  cycle_id         text not null references public.portal_feedback_cycles (id) on delete cascade,
  subject_user_id  uuid not null references auth.users (id) on delete cascade,
  reviewer_id      uuid not null references auth.users (id) on delete cascade,
  relationship     text not null check (relationship in ('self', 'manager', 'peer', 'report')),
  created_at       timestamptz not null default now(),
  unique (cycle_id, subject_user_id, reviewer_id, relationship)
);

create index if not exists portal_feedback_assignments_cycle_idx
  on public.portal_feedback_assignments (cycle_id);
create index if not exists portal_feedback_assignments_reviewer_idx
  on public.portal_feedback_assignments (reviewer_id, cycle_id);

alter table public.portal_feedback_assignments enable row level security;

create policy "feedback_assignments: read scoped" on public.portal_feedback_assignments
  for select to authenticated
  using (
    reviewer_id = auth.uid()
    or subject_user_id = auth.uid()
    or public.is_hr_or_admin()
  );

create policy "feedback_assignments: hr+ write" on public.portal_feedback_assignments
  for all to authenticated using (public.is_hr_or_admin()) with check (public.is_hr_or_admin());

grant select, insert, update, delete on public.portal_feedback_assignments to authenticated;

-- ── Tighten feedback entry inserts to assigned reviewers only ─────────────────
drop policy if exists "feedback_entries: insert reviewer" on public.portal_feedback_entries;

create policy "feedback_entries: insert assigned reviewer" on public.portal_feedback_entries
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1
      from public.portal_feedback_assignments a
      where a.cycle_id = cycle_id
        and a.subject_user_id = subject_user_id
        and a.reviewer_id = auth.uid()
        and a.relationship = relationship
    )
  );

-- ── Config label usage check (prevent orphan deletes) ─────────────────────────
create or replace function public.portal_config_label_in_use(p_kind text, p_id text)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n bigint := 0;
begin
  case p_kind
    when 'task_category' then
      select count(*) into n from public.portal_tasks where category = p_id;
    when 'document_category' then
      select count(*) into n from public.portal_documents where category = p_id;
    when 'recognition_tag' then
      select count(*) into n from public.portal_recognition_posts where tag = p_id;
    when 'award_category' then
      select count(*) into n from public.portal_quarterly_awards where category = p_id;
    when 'grievance_category' then
      select count(*) into n from public.portal_grievances where category = p_id;
    when 'memo_category' then
      select count(*) into n from public.portal_announcements where memo_category = p_id;
    when 'exit_reason' then
      select count(*) into n
      from public.portal_exit_interviews ex
      where ex.reasons @> to_jsonb(p_id);
    else
      n := 0;
  end case;
  return n;
end;
$$;

grant execute on function public.portal_config_label_in_use(text, text) to authenticated;

-- ── Seed onboarding milestones for a user ─────────────────────────────────────
create or replace function public.portal_seed_onboarding_milestones(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;
  if exists (select 1 from public.portal_onboarding_milestones where user_id = p_user_id limit 1) then
    return;
  end if;
  insert into public.portal_onboarding_milestones (id, user_id, phase, label, completed, due_date)
  values
    ('ms_' || p_user_id::text || '_30', p_user_id, 'day_30', 'Complete onboarding checklist', false, (current_date + 30)),
    ('ms_' || p_user_id::text || '_60', p_user_id, 'day_60', 'First OKR check-in with manager', false, (current_date + 60)),
    ('ms_' || p_user_id::text || '_90', p_user_id, 'day_90', '90-day review with HR', false, (current_date + 90))
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.portal_seed_onboarding_milestones(uuid) to authenticated;

-- ── Open 360° cycle from template + auto-assign self/manager/upward ───────────
create or replace function public.portal_open_feedback_cycle(
  p_template_id text,
  p_title text default null,
  p_year int default null,
  p_half text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tpl record;
  v_cycle_id text;
  v_year int := coalesce(p_year, extract(year from current_date)::int);
  v_half text := coalesce(nullif(trim(p_half), ''), case when extract(month from current_date) <= 6 then 'H1' else 'H2' end);
  v_title text;
  u record;
  m uuid;
begin
  if not public.is_hr_or_admin() then
    raise exception 'Only HR or admin may open feedback cycles';
  end if;

  select * into v_tpl from public.portal_feedback_templates where id = p_template_id;
  if not found then
    raise exception 'Feedback template not found';
  end if;

  v_title := coalesce(nullif(trim(p_title), ''), v_tpl.label || ' — ' || v_year::text || ' ' || v_half);
  v_cycle_id := 'fc_' || replace(gen_random_uuid()::text, '-', '');

  update public.portal_feedback_cycles set status = 'closed' where status = 'open';

  insert into public.portal_feedback_cycles (id, title, year, half, status, questions)
  values (v_cycle_id, v_title, v_year, v_half, 'open', v_tpl.questions);

  for u in
    select p.id, p.reports_to_id
    from public.profiles p
    where p.active = true
  loop
    insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
    values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, u.id, u.id, 'self')
    on conflict do nothing;

    m := u.reports_to_id;
    if m is not null then
      insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
      values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, u.id, m, 'manager')
      on conflict do nothing;

      insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
      values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, m, u.id, 'report')
      on conflict do nothing;
    end if;
  end loop;

  return v_cycle_id;
end;
$$;

grant execute on function public.portal_open_feedback_cycle(text, text, int, text) to authenticated;

-- ── Survey reminder inbox rows for users who have not responded ───────────────
create or replace function public.portal_send_pulse_survey_reminders(p_survey_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  u record;
  sent int := 0;
begin
  if not public.is_hr_or_admin() then
    raise exception 'Only HR or admin may send survey reminders';
  end if;

  select * into s from public.portal_pulse_surveys where id = p_survey_id and active = true;
  if not found then
    raise exception 'Active survey not found';
  end if;

  for u in select id from public.profiles where active = true loop
    if not exists (
      select 1 from public.portal_pulse_responses r
      where r.survey_id = p_survey_id and r.user_id = u.id
    ) then
      insert into public.portal_inbox_notifications (
        id, user_id, type, title, body, link, read, created_at
      ) values (
        'inbox_survey_' || p_survey_id || '_' || u.id::text,
        u.id,
        'survey_reminder',
        'Survey reminder',
        'Please complete: ' || s.title,
        '/people/surveys',
        false,
        now()
      )
      on conflict (id) do update set
        read = false,
        body = excluded.body,
        created_at = excluded.created_at;
      sent := sent + 1;
    end if;
  end loop;

  return sent;
end;
$$;

grant execute on function public.portal_send_pulse_survey_reminders(text) to authenticated;

-- ── Auto-seed milestones when HR approves a user ──────────────────────────────
create or replace function public.admin_approve_portal_user(
  p_user_id uuid,
  p_role text default 'staff',
  p_department text default 'General',
  p_job_title text default 'Staff'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_email text;
  v_name text;
  v_role text := coalesce(nullif(trim(p_role), ''), 'staff');
  v_department text := coalesce(nullif(trim(p_department), ''), 'General');
  v_job_title text := coalesce(nullif(trim(p_job_title), ''), 'Staff');
  v_head_user_id uuid;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if not public.is_hr_or_admin() then
    return jsonb_build_object('success', false, 'error', 'Only administrators and HR can approve users');
  end if;

  if not public.is_portal_admin() and v_role <> 'staff' then
    v_role := 'staff';
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'User id is required');
  end if;

  select d.head_user_id
  into v_head_user_id
  from public.portal_departments d
  where d.name = v_department
  limit 1;

  update public.profiles
  set
    role = v_role,
    department = v_department,
    job_title = v_job_title,
    reports_to_id = v_head_user_id,
    active = true,
    approved_at = now(),
    updated_at = now()
  where id = p_user_id
  returning email, name into v_email, v_name;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Profile not found');
  end if;

  update public.portal_access_requests
  set status = 'approved'
  where user_id = p_user_id;

  perform public.portal_seed_onboarding_milestones(p_user_id);

  insert into public.portal_inbox_notifications (
    id, user_id, type, title, body, link, read, created_at, from_user_id
  ) values (
    'inbox_approved_' || p_user_id::text,
    p_user_id,
    'access_granted',
    'Access approved',
    'Your AfriVate portal account is now active. Sign in to get started.',
    '/',
    false,
    now(),
    v_caller
  )
  on conflict (id) do update set
    read = false,
    title = excluded.title,
    body = excluded.body,
    created_at = excluded.created_at;

  insert into public.portal_admin_audit_log (actor_id, action, target_type, target_id, detail)
  values (
    v_caller,
    'account_approval',
    'user',
    p_user_id::text,
    jsonb_build_object(
      'email', v_email,
      'name', v_name,
      'role', v_role,
      'department', v_department,
      'job_title', v_job_title,
      'reports_to_id', v_head_user_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_email,
    'name', v_name
  );
end;
$$;

-- ── Job candidates: applied_at for time-to-hire metrics ─────────────────────
alter table public.portal_job_candidates
  add column if not exists applied_at timestamptz not null default now();

update public.portal_job_candidates
set applied_at = coalesce(applied_at, updated_at)
where applied_at is null;

-- ── Realtime for new HR tables ────────────────────────────────────────────────
do $do$
declare
  t text;
begin
  foreach t in array array[
    'portal_feedback_templates',
    'portal_feedback_assignments'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end if;
  end loop;
end;
$do$;

-- ── Performance indexes ───────────────────────────────────────────────────────
create index if not exists portal_exit_interviews_created_idx
  on public.portal_exit_interviews (created_at desc);
create index if not exists portal_job_candidates_stage_idx
  on public.portal_job_candidates (stage, updated_at desc);
create index if not exists portal_grievances_status_idx
  on public.portal_grievances (status, created_at desc);
