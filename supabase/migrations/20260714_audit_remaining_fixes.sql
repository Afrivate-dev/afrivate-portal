-- Remaining audit fixes: milestones + docs for assignment leads,
-- feedback cycle assignment via manages_user scope, manager read of 360 rows.

-- ── Onboarding milestones: assignment-based managers ─────────────────────────
drop policy if exists "milestones: read scoped" on public.portal_onboarding_milestones;
create policy "milestones: read scoped" on public.portal_onboarding_milestones
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(user_id)
  );

drop policy if exists "milestones: manager manage reports" on public.portal_onboarding_milestones;
create policy "milestones: manager manage reports" on public.portal_onboarding_milestones
  for all to authenticated
  using (public.is_hr_or_admin() or public.manages_user(user_id))
  with check (public.is_hr_or_admin() or public.manages_user(user_id));

-- ── Documents: management_only readable by role leads OR anyone who manages people
drop policy if exists "documents: role-filtered read" on public.portal_documents;
create policy "documents: role-filtered read"
  on public.portal_documents
  for select
  to authenticated
  using (
    auth.uid() is not null
    and (
      (not hr_only and not management_only)
      or (hr_only and public.get_my_role() in ('hr', 'admin'))
      or (
        management_only
        and (
          public.get_my_role() in ('team_lead', 'hr', 'admin')
          or exists (
            select 1
            from public.profiles p
            where coalesce(p.active, true)
              and p.id <> auth.uid()
              and public.manages_user(p.id)
          )
        )
      )
    )
  );

-- ── 360° feedback: managers can read assignments/entries for people they manage
drop policy if exists "feedback_assignments: read scoped" on public.portal_feedback_assignments;
create policy "feedback_assignments: read scoped" on public.portal_feedback_assignments
  for select to authenticated
  using (
    reviewer_id = auth.uid()
    or subject_user_id = auth.uid()
    or public.is_hr_or_admin()
    or public.manages_user(subject_user_id)
  );

drop policy if exists "feedback_entries: read scoped" on public.portal_feedback_entries;
create policy "feedback_entries: read scoped" on public.portal_feedback_entries
  for select to authenticated
  using (
    reviewer_id = auth.uid()
    or public.is_hr_or_admin()
    or (subject_user_id = auth.uid() and relationship = 'self')
    or (
      public.manages_user(subject_user_id)
      and relationship in ('self', 'manager', 'report')
    )
  );

-- ── Open feedback cycle: assign reports_to + team/dept assignment managers ────
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
    select p.id
    from public.profiles p
    where p.active = true
  loop
    insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
    values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, u.id, u.id, 'self')
    on conflict do nothing;

    for m in
      select distinct mgr_id
      from (
        select p.reports_to_id as mgr_id
        from public.profiles p
        where p.id = u.id and p.reports_to_id is not null
        union
        select t.lead_user_id
        from public.portal_team_members tm
        join public.portal_teams t on t.id = tm.team_id
        where tm.user_id = u.id and t.lead_user_id is not null
        union
        select t.asst_lead_user_id
        from public.portal_team_members tm
        join public.portal_teams t on t.id = tm.team_id
        where tm.user_id = u.id and t.asst_lead_user_id is not null
        union
        select d.head_user_id
        from public.profiles p
        join public.portal_departments d on d.name = p.department
        where p.id = u.id and d.head_user_id is not null
      ) mgrs
      where mgr_id is not null and mgr_id <> u.id
    loop
      insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
      values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, u.id, m, 'manager')
      on conflict do nothing;

      insert into public.portal_feedback_assignments (id, cycle_id, subject_user_id, reviewer_id, relationship)
      values ('fa_' || replace(gen_random_uuid()::text, '-', ''), v_cycle_id, m, u.id, 'report')
      on conflict do nothing;
    end loop;
  end loop;

  return v_cycle_id;
end;
$$;

grant execute on function public.portal_open_feedback_cycle(text, text, int, text) to authenticated;
