/**
 * Condensed knowledge pack for AVA (AfriVate Virtual Assistant).
 * Keep concise for token limits; cite official docs by name.
 */

export const AVA_KNOWLEDGE = `
# AfriVate Team Space — AVA Knowledge Pack

## Operating principle
- Portal (Team Space) = system of record for leave, tasks, check-ins, learning proofs, surveys, shout-outs, growth, memos, appraisals, discipline, PIPs, employee profiles, policy acknowledgements.
- Slack = official internal messaging for clarification, coordination, escalation, and reachability. Acknowledge official Slack messages within four (4) hours on official work days.
- Gmail (hr@afrivate.org) = official broadcasts and external/formal correspondence.
- Alison = course delivery; proof of completion is submitted in the Portal.
- Google Drive = master policy/contract copies; staff-facing copies live in Portal Resources.
- WhatsApp = informal or emergency contact only. Never for leave, policy acknowledgements, appraisals, or formal People & Culture processes.
- A Slack message does not replace a required Portal submission, approval, acknowledgement, or update.

## Guides
- Staff: AFRI-PUG-02 (what team members can see and do). No Admin.
- Team leads / assistant leads: AFRI-PUG-03. Extra: leave approval, team check-ins, 1:1 mark complete, IDP review, team OKRs, PIP/suspension badges, management-only files. Team lead only: publish memos, add calendar events. No Admin.
- HR / Admin: AFRI-PUG-01 (full guide).


## Main navigation
- Home (/) — this week: what to do next (tasks, weekly update, time off, memos). Same Home for staff, leads, and People & Culture — the cards change by role.
- My work (/tasks) — tasks (board / list / week). Unsaved drafts sit in a Drafts column until you create them.
- People (/people) — Time off and Directory first; Overview, Shout-outs, Learning, Surveys, Growth, My info are one tap away.
- Inbox (/inbox) — notifications (also in the primary nav when you have unread items)
- More — Search, Weekly update (primary near Friday or when yours is due), Getting started (first 30 days only), Notes, Memos, Resources, Calendar, Admin (HR/Admin only)
- Phone bottom bar: Home, My work, People, Inbox or Memos if unread, More.
- Top bar: dark/light mode, search, availability (Available / Away / Busy / Focusing), inbox bell, profile menu (My profile, Account & security, Sign out).

## Getting started (onboarding)
Open Getting started (/onboarding). Watch welcome videos and complete the first-week checklist (profile, My info, Slack, Resources acknowledgements, first tasks, OKRs, weekly update, learning). Home shows video progress for the first 30 days. Some checklist items tick themselves when you complete the related Portal action.
People & Culture run new joiners with AFRI-ONB-01 (Onboarding Kit). The joiner-facing handbook is AFRI-EOH-01. Slack coordinates; Portal records. WhatsApp is not for onboarding steps.
Required acknowledgements in Resources within seven official work days: AFRI-SWP, AFRI-ORG-01, AFRI-LAP-01, AFRI-EOH-01, AFRI-ODR-01, AFRI-PDP-01 (Penalty & Disciplinary Policy / CBP), and AFRI-ICEF-01 if unpaid. Team Leads also acknowledge AFRI-TLOP-01 and AFRI-DOA-01.

## How to request leave
1. Open People → Time off (/people/leave).
2. Select Request leave.
3. Enter dates, type (annual / sick / emergency), and reason.
4. Attach supporting documentation when required.
5. Submit and track status under My requests.
Leave is not approved until the decision is recorded in the Portal. Requests made solely via WhatsApp, Slack, email, telephone, or verbal conversation are not official.
Except accepted emergencies, provide at least three (3) official work days' notice. Complete or reassign work and communicate handover via Slack before leave.

## Weekly update
Open Weekly update (/checkin). Submit completed work, next week, blockers, and hours. Leads review team submissions; HR may review org-wide under Admin → Check-ins.

## Learning (Alison)
Open People → Learning. Complete the assigned Alison course, then submit course name, completion date, and certificate. HR reviews submissions.

## Surveys
Open People → Surveys. Complete open surveys. One response per person.

## My info
Open People → My info. This is the personnel questionnaire (identity, contact, emergency, employment, banking, education, experience, skills, and compliance). Date of birth, legal name, phone, and emergency contact name + phone are required. Photograph is updated on Directory profile, not on this form. HR/Admin export one, several, or all files from Admin → Employee files. The form does not collect national ID / passport, employee ID, tax IDs, NIN, visa, tax filing status, or pension enrollment.

## Calendar
Open Calendar (/events). Team leads can add events. Birthdays, work anniversaries, and new-hire check-ins (Day 1 / 7 / 30 / 60 / 90) are autosaved from employee start date and date of birth. Date of birth and start date are required for active people (People → My info, and Admin → Employee files). frank mirrors the same titles onto AfriVate Google Calendar — there is no Portal↔Google API sync.

## Escalation log vs Speak up
- Speak up (/people/growth?tab=grievance) is confidential grievances. Unchanged.
- Operational People ops escalations (people / delivery / access / pay question) live under Admin → People ops. HR/Admin only.

## Resources & policy acknowledgement
Open Resources (/documents). Read policies and complete required acknowledgements. Home and People may show reminder banners.
Required acknowledgements in Resources within seven official work days: AFRI-SWP, AFRI-ORG-01, AFRI-LAP-01, AFRI-EOH-01, AFRI-ODR-01, AFRI-PDP-01 (Penalty & Disciplinary Policy / CBP), and AFRI-ICEF-01 if you are an unpaid Internal Contributor (ICEF is the default unpaid engagement framework). Team Leads also acknowledge AFRI-TLOP-01 and AFRI-DOA-01.

## Appraisals (HR)
Formal appraisals: 60% output / deliverables and 40% behavioural competencies. Recorded under Admin → Employees. Portal is the record; printable appraisal forms may be used as worksheets.

## Progressive discipline (HR)
Coaching/verbal → written warning → PIP → restricted duties → termination case (fair review). Managed in Admin → Employees. Leads may recommend; HR activates/approves per policy.
HR can place someone on PIP or suspension from Admin → Employees (dossier) or Admin → Users. Team leads, HR, and admin see the status on directory and people views. On PIP: full portal access remains; a banner is shown. Suspended staff can still sign in and read Memos and Resources, and manage Account & security — they cannot take other portal actions until HR lifts the suspension.

## AVA boundaries
- AVA guides users, explains policy, and may insert or refine drafts (weekly update, tasks, leave, shout-outs, memos, events, my info, notes). Multiple drafts in one turn are allowed.
- Task drafts land in the Drafts column on My work (/tasks). Note drafts land in Saved drafts on Notes (/notes). The user reviews and creates them.
- AVA never submits, sends, publishes, approves, rejects, deletes, finalises, or completes any Portal record. The signed-in user always reviews and presses Submit / Save / Send.
- AVA does not draft or complete learning certificates, surveys, leave approvals, PIPs, discipline, or appraisals.
- AVA only uses data the signed-in user is already permitted to see.
- For salary, legal advice, or confidential HR decisions beyond Portal guidance, direct users to hr@afrivate.org.
`.trim()

export const AVA_SUGGESTED_PROMPTS = [
  'How do I request leave?',
  'Help me draft my weekly update',
  'Where do I submit my Alison certificate?',
  'What is the four-hour Slack rule?',
  'What are my open tasks?',
  'How do I submit my weekly check-in?',
] as const
