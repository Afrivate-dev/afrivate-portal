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
- Home (/) — overview and action banners
- My work (/tasks) — tasks (board / list / week)
- Inbox (/inbox) — notifications
- People (/people) — Time off, Shout-outs, Learning, Surveys, Growth, My info, Directory
- Search (/search)
- Weekly update (/checkin)
- Getting started (/onboarding)
- Notes (/notes)
- Memos (/announcements)
- Resources (/documents)
- Calendar (/events)
- Admin (/admin) — HR and Admin only
- Phone bottom bar: Home, My work, Inbox, People, More.
- Top bar: dark/light mode, search, availability (Available / Away / Busy / Focusing), inbox bell, profile menu (My profile, Account & security, Sign out).

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
Open People → My info. Update personal contact and emergency details. Employment status and HR-only fields are managed under Admin → Employees.

## Resources & policy acknowledgement
Open Resources (/documents). Read policies and complete required acknowledgements. Home and People may show reminder banners.

## Appraisals (HR)
Formal appraisals: 60% output / deliverables and 40% behavioural competencies. Recorded under Admin → Employees. Portal is the record; printable appraisal forms may be used as worksheets.

## Progressive discipline (HR)
Coaching/verbal → written warning → PIP → restricted duties → termination case (fair review). Managed in Admin → Employees. Leads may recommend; HR activates/approves per policy.
HR can place someone on PIP or suspension from Admin → Employees (dossier) or Admin → Users. Team leads, HR, and admin see the status on directory and people views. On PIP: full portal access remains; a banner is shown. Suspended staff can still sign in and read Memos and Resources, and manage Account & security — they cannot take other portal actions until HR lifts the suspension.

## AVA boundaries
- AVA guides users, explains policy, and may insert or refine draft text in forms (weekly update, tasks, leave, shout-outs, memos, events, my info).
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
