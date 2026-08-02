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

## Roles
- Team member: core employee features.
- Assistant lead: plus leave approval for managed people and team check-ins.
- Team lead: plus memos and calendar events.
- People & Culture (HR): Admin area, org leave, HR dashboard, Recruitment, Employee hub.
- Administrator: all HR capabilities plus role changes, departments, and teams.

## Main navigation
- Home (/) — overview and action banners
- My work (/tasks) — tasks
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

## AVA boundaries
- AVA guides users and explains policy. AVA does not approve leave, finalise appraisals, or replace People & Culture decisions.
- AVA only uses data the signed-in user is already permitted to see.
- For salary, legal advice, or confidential HR decisions beyond Portal guidance, direct users to hr@afrivate.org.
`.trim()

export const AVA_SUGGESTED_PROMPTS = [
  'How do I request leave?',
  'Where do I submit my Alison certificate?',
  'What is the four-hour Slack rule?',
  'What are my open tasks?',
  'How do I submit my weekly check-in?',
] as const
