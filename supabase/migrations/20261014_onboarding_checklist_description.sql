-- Getting started checklist: staff-facing description and auto-tick key.
-- Safe to re-run. Description is filled only when it is still null.
-- auto_key is filled only when it is still null. Labels and order are left as Admin set them.
-- Rows are matched by link plus the current label. Known ids are a fallback when the link still matches,
-- so older row ids keep working after Human Resources rewrites the label.

alter table public.portal_onboarding_checklist
  add column if not exists description text;

alter table public.portal_onboarding_checklist
  add column if not exists auto_key text;

-- 1. Slack profile (no link)
update public.portal_onboarding_checklist
set description = $desc$In Slack, set your real first and last name, your role as your title and a clear professional photo, and turn on notifications for DMs and @mentions. Join #annoucements, #all-afrivate and your team channel, read the Slack House Rules, then say hello to your team and message your Team Lead.$desc$
where description is null
  and (link is null or btrim(link) = '')
  and (label ilike '%slack%' or id = 'ck_slack');

-- 2. My info
update public.portal_onboarding_checklist
set
  description = case
    when description is null then $desc$Go to People, then My info. Fill in your names, personal email, phone, work location, country, date of birth, pronouns, LinkedIn, bio, skills, emergency contact and next of kin notes. Check the completeness percentage, leave nothing blank, then click Save my info.$desc$
    else description
  end,
  auto_key = coalesce(nullif(btrim(auto_key), ''), 'myinfo_complete')
where (description is null or auto_key is null or btrim(auto_key) = '')
  and btrim(link) = '/people/my-info'
  and (label ilike '%my info%' or id = 'ck_myinfo');

-- 3. Directory card
update public.portal_onboarding_checklist
set
  description = case
    when description is null then $desc$Open your own card in the Directory and add your photo, bio, phone, skills and LinkedIn so colleagues can recognise and reach you.$desc$
    else description
  end,
  auto_key = coalesce(nullif(btrim(auto_key), ''), 'profile_complete')
where (description is null or auto_key is null or btrim(auto_key) = '')
  and btrim(link) in ('/people/directory?profile=1', '/directory?profile=1')
  and (
    label ilike '%directory card%'
    or label ilike '%photo%'
    or id = 'ck_profile'
  );

-- 4. Confirm department, title, Team Lead
update public.portal_onboarding_checklist
set
  description = case
    when description is null then $desc$Check that your department, job title and reports-to line are correct and confirm them with your Team Lead. If anything is wrong, tell Human Resources straight away.$desc$
    else description
  end,
  auto_key = coalesce(nullif(btrim(auto_key), ''), 'directory_complete')
where (description is null or auto_key is null or btrim(auto_key) = '')
  and btrim(link) in ('/people/directory', '/directory')
  and (
    label ilike '%department%'
    or label ilike '%team lead%'
    or id = 'ck_people'
  );

-- 5. Onboarding pack (not the policies row)
update public.portal_onboarding_checklist
set
  description = case
    when description is null then $desc$Read the onboarding pack documents in number order, starting with 00 Start Here New Hire Checklist and 01 Team Member Onboarding Handbook. Document 09 is the Portal User Guide for Staff.$desc$
    else description
  end,
  auto_key = coalesce(nullif(btrim(auto_key), ''), 'handbook_visit')
where (description is null or auto_key is null or btrim(auto_key) = '')
  and btrim(link) = '/documents'
  and (label ilike '%onboarding pack%' or id = 'ck_handbook');

-- 6. Policies — no auto-tick from a page visit
update public.portal_onboarding_checklist
set description = $desc$Open Resources and acknowledge each document assigned to you within seven (7) official work days. A yellow banner stays on Home until you do.$desc$
where description is null
  and btrim(link) = '/documents'
  and (label ilike '%polic%' or id = 'ck_policies');

-- 7. OKRs
update public.portal_onboarding_checklist
set description = $desc$Your Team Lead will brief you on your role and first tasks. Together, agree your Agreed Capacity and 3 to 5 KPIs, then record your OKRs under People, Growth, OKRs.$desc$
where description is null
  and btrim(link) = '/people/growth?tab=okrs'
  and (label ilike '%okr%' or label ilike '%kpi%' or id = 'ck_okrs');

-- 8. My work
update public.portal_onboarding_checklist
set description = $desc$Keep your tasks in My work and mark them Complete in the Portal, not only on Slack. Ask your Team Lead if an outcome or deadline is unclear.$desc$
where description is null
  and btrim(link) = '/tasks'
  and (label ilike '%task%' or label ilike '%my work%' or id = 'ck_tasks');

-- 9. Weekly update
update public.portal_onboarding_checklist
set
  description = case
    when description is null then $desc$Share what you worked on, what is next and what you need. Submit it every week.$desc$
    else description
  end,
  auto_key = coalesce(nullif(btrim(auto_key), ''), 'first_checkin')
where (description is null or auto_key is null or btrim(auto_key) = '')
  and btrim(link) = '/checkin'
  and (label ilike '%weekly%' or label ilike '%check-in%' or label ilike '%check in%' or id = 'ck_checkin');

-- 10. Memos
update public.portal_onboarding_checklist
set description = $desc$Read important notices in Memos. The weekly HR Digest is posted in #all-afrivate every Monday morning; read it and react to confirm.$desc$
where description is null
  and btrim(link) = '/announcements'
  and (label ilike '%memo%' or id = 'ck_memos');

-- 11. Townhall
update public.portal_onboarding_checklist
set description = $desc$Everyone attends the General Townhall every Monday, 8:00 PM to 9:00 PM (Lagos time) on Google Meet. If you cannot make it, let Human Resources know before it starts.$desc$
where description is null
  and btrim(link) = '/events'
  and (label ilike '%townhall%' or label ilike '%town hall%' or id = 'ck_townhall');

-- 12. Welcome videos
update public.portal_onboarding_checklist
set description = $desc$Short welcome videos explain how we work at AfriVate.$desc$
where description is null
  and (btrim(link) = '/onboarding' or id = 'ck_videos')
  and (label ilike '%video%' or id = 'ck_videos');
