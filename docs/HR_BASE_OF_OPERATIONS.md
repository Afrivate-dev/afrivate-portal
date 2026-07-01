# AfriVate HR Base of Operations
## Portal-First Implementation Plan · 2025–2026

**Version:** 2.0 (Portal edition)  
**Audience:** HR Lead, People & Culture, line managers, admin  
**Scope:** 10–30 person social enterprise  
**Live system:** [portal.afrivate.org](https://portal.afrivate.org)

---

## 1. Executive summary

The original HR Base of Operations plan described *what* world-class People & Culture looks like. This document describes *how AfriVate runs it day to day* using the **Team Space portal** as the operating system, with Gmail, Alison, and Google Drive in supporting roles.

### The AfriVate HR mandate (unchanged)

HR exists to attract the right people, develop them relentlessly, connect them to purpose, and build a culture strong enough to sustain performance under pressure. Admin, compliance, and payroll are **infrastructure** — not the mission.

### The technology model

| Layer | Tool | Role |
|-------|------|------|
| **Operating system** | AfriVate Team Space portal | Requests, records, culture, performance, HR visibility, policy acks |
| **Broadcast** | Gmail (`hr@afrivate.org`) | Official email: digest, course announcements, birthdays, holidays |
| **Classroom** | Alison.com | Course delivery and certificates |
| **File vault** | Google Drive | Master copies of policies, contracts, HR archives |
| **Bridge** | Google Drive picker (optional) | Import files from Drive into portal Resources / Learning submissions |
| **Live meetings** | Google Meet / Zoom | Town halls, 1:1s, interviews |
| **Employer brand** | LinkedIn, Instagram | Recruitment marketing (external) |
| **Quick chat** | WhatsApp or Slack (optional) | Informal team chatter — **not** the system of record |

**Principle:** If it needs a record, approval, or audit trail → **portal**. If it needs reach to inboxes → **Gmail**. If it teaches a skill → **Alison**. If it is a master document → **Drive**, with a portal copy where staff need access.

---

## 2. Portal navigation map

The sidebar stays lean. All people/culture work lives under **People** (`/people`).

### Main sidebar (everyone)

| Nav item | Route | HR use |
|----------|-------|--------|
| Home | `/` | Quick actions, onboarding progress, unread memos |
| My work | `/tasks` | OKR-aligned task delivery |
| Inbox | `/inbox` | Leave updates, mentions, recognition comments |
| People | `/people` | **HR hub** — see sub-nav below |
| Check-in | `/checkin` | Weekly team updates (dept or org-wide visibility) |
| Getting started | `/onboarding` | Day 1 videos, checklist, progress |
| Notes | `/notes` | Team collaboration |
| Memos | `/announcements` | Urgent/important updates, **HR digest mirror**, policy notices |
| Resources | `/documents` | Policies, handbooks, templates; **acknowledgment tracking** |
| Directory | `/people/directory` | Org chart, department, reports-to |
| What's on | `/events` | Town halls, holidays, team events |
| Admin | `/admin` | HR dashboard, users, leave approval, memos (HR/admin) |

### People hub sub-nav

| Tab | Route | Pillar |
|-----|-------|--------|
| Overview | `/people` | Engagement dashboard, digest snippets, action banners |
| Time off | `/people/leave` | Leave requests, attachments, approval |
| Shout-outs | `/people/shout-outs` | Peer recognition |
| Learning | `/people/learning` | Alison assignments + certificate submission |
| Surveys | `/people/surveys` | Monthly pulse + eNPS |
| Growth | `/people/growth` | OKRs, 1:1s, IDPs, 360°, 30-60-90, awards, grievances |
| Directory | `/people/directory` | Org structure link |

### Admin → HR dashboard

Route: **Admin → HR dashboard** tab  
Used by: HR, admin

Quick actions: assign Alison course, launch pulse survey, recruitment lite, quarterly awards, exit interviews, grievance resolution, KPI cards.

---

## 3. The eight pillars — portal implementation

Each pillar lists: **activities**, **where in portal**, **external tool**, **owner**, **cadence**, and **step-by-step SOP**.

---

### Pillar 1 · Talent acquisition

**Goal:** Hire the right people with structured, values-aligned process.

| Activity | Portal | External | Owner | Cadence |
|----------|--------|----------|-------|---------|
| Open requisition | Admin → HR dashboard → Recruitment | — | HR | As needed |
| Track candidates (applied → hired) | Admin → HR dashboard | — | HR | Ongoing |
| Job posts / employer brand | — | LinkedIn, Instagram | HR + Marketing | Per role |
| Structured interviews | — | Google Meet + interview guide (Drive) | Hiring manager + HR | Per candidate |
| Offer & contract | — | Gmail + signed contract in Drive | HR | Per hire |

**Implementation SOP — new hire pipeline**

1. HR creates requisition in **Admin → HR dashboard** (title, department, status).
2. Post role on LinkedIn; link to `hr@afrivate.org` or careers email.
3. Add candidates in HR dashboard; move stage: Applied → Screen → Interview → Offer → Hired/Rejected.
4. On **Hired**: activate portal account (Admin → Invites), assign department and reports-to, trigger onboarding (Section 3.2).
5. **KPI:** Time-to-hire — track manually from requisition `created_at` to candidate stage `hired` (export from Supabase or HR spreadsheet until dashboard KPI added).

**Not in portal (by design):** Full ATS, salary negotiation workflows, background checks — use Drive + Gmail until hiring volume justifies paid ATS.

---

### Pillar 2 · Onboarding & integration

**Goal:** Every new hire reaches productivity with clear 30-60-90 milestones.

| Activity | Portal | External | Owner | Cadence |
|----------|--------|----------|-------|---------|
| Welcome & culture videos | `/onboarding` | — | HR | Day 1 |
| First-week checklist | `/onboarding` | — | HR | Day 1–7 |
| 30-60-90 milestones | `/people/growth` → Milestones tab | — | Manager + HR | Day 1–90 |
| Buddy assignment | Admin → Users (reports-to / notes) | WhatsApp intro | Manager | Day 1 |
| Manager check-ins Day 7/30/90 | `/people/growth` → 1:1 tab | Google Meet | Manager | Scheduled |
| Day 90 survey | `/people/surveys` | — | HR | Day 90 |

**Implementation SOP — new hire first 90 days**

1. **Before start:** HR approves user, sets department, team, reports-to in Admin.
2. **Day 1:** New hire completes **Getting started** (`/onboarding`) — watch videos, tick checklist.
3. **Day 1:** Portal auto-seeds **30-60-90 milestones** when they open Growth tab (or HR seeds via admin flow).
4. **Day 7 / 30 / 90:** Manager marks 1:1 completed in **Growth → 1:1** (monthly log).
5. **Day 90:** HR launches pulse survey tagged for onboarding feedback OR dedicated eNPS question set.
6. **Welcome pack PDF:** Store master in Drive; upload summary to **Resources** with category Onboarding.

**Buddy system:** Document buddy name in profile notes or team assignment; informal coordination via WhatsApp — portal holds the checklist and milestones.

---

### Pillar 3 · Performance management

**Goal:** Continuous feedback via OKRs, 1:1s, and bi-annual 360° — not annual review theatre.

| Activity | Portal | External | Owner | Cadence |
|----------|--------|----------|-------|---------|
| Quarterly OKRs | `/people/growth` → OKRs | — | Employee + manager | Quarterly |
| Monthly 1:1s | `/people/growth` → 1:1 | Meet + optional shared Doc | Manager | Monthly |
| Bi-annual 360° | `/people/growth` → 360° | — | HR | H1 + H2 |
| Performance conversations | `/people/growth`, Memos | — | Manager | Ongoing |
| PIP (if needed) | Resources (template) + IDP/Growth | Drive template | HR + manager | As needed |

**Implementation SOP — quarterly OKR cycle**

1. **Week 1 of quarter:** HR sends memo (type: General) reminding OKR deadline.
2. Each employee sets OKRs in **Growth → OKRs** (objective + key results with progress %).
3. Managers review direct reports' OKRs in same tab (lead+ visibility).
4. **Mid-quarter:** 1:1s reference OKR progress.
5. **End of quarter:** HR pulls OKR achievement rate from Growth data for leadership report.

**Implementation SOP — monthly 1:1**

1. Manager schedules Meet with each report.
2. After 1:1, manager toggles **completed** in **Growth → 1:1** for that month (`yyyy-MM`).
3. HR dashboard shows **1:1 rate** KPI (% of active staff with completed log this month).

**Implementation SOP — 360° (bi-annual)**

1. HR creates feedback cycle in Growth (or Admin when cycle UI expanded): title, year, H1/H2, status `open`.
2. Employees complete **self-assessment**; peers/managers assigned (full peer workflow = Phase 3 enhancement).
3. HR closes cycle; shares summary in 1:1 — not public leaderboard.

---

### Pillar 4 · Learning & development

**Goal:** Monthly Alison courses with proof of completion; individual growth plans reviewed twice yearly.

| Activity | Portal | External | Owner | Cadence |
|----------|--------|----------|-------|---------|
| Assign course of the month | Admin → HR dashboard | Alison URL | HR | Monthly (1st) |
| Course announcement email | — | Gmail | HR | Monthly |
| Complete course | — | Alison.com | Employee | By deadline |
| Submit certificate | `/people/learning` | Drive upload optional | Employee | By deadline |
| HR review & approve | Admin → HR dashboard / Learning reviews | — | HR | Monthly |
| Individual Development Plan | `/people/growth` → IDP | — | Employee + manager | Bi-annual |
| Lunch & learn | Memos + Events | Meet | Any employee | Monthly optional |

**Implementation SOP — monthly L&D cycle**

1. **Day 1:** HR assigns course in **Admin → HR dashboard** (title, Alison URL, due date ~30 days).
2. **Day 1:** Send **Course of the Month** email via Gmail (link to Alison + reminder to submit cert in portal).
3. Staff complete course on Alison; upload certificate in **People → Learning** (or attach via Drive picker if configured).
4. HR reviews pending submissions; approve/reject with note.
5. Celebrate completions in next **HR digest** memo + Gmail digest.
6. **KPI:** L&D completion rate on HR dashboard.

**Why Alison stays external:** Course player, progress tracking, and certificates live on Alison. Portal owns **assignment, submission, approval, and reporting**.

---

### Pillar 5 · Employee relations & engagement

**Goal:** Rhythmic communication, listening, recognition, and safe escalation.

| Activity | Portal | External | Owner | Cadence |
|----------|--------|----------|-------|---------|
| HR digest (in-app) | Memos → type **HR digest** | — | HR | Bi-weekly |
| HR digest (email) | — | Gmail | HR | Bi-weekly |
| Pulse survey | `/people/surveys` | — | HR | Monthly |
| eNPS | `/people/surveys` (survey type: enps) | — | HR | Quarterly |
| Shout-outs | `/people/shout-outs` | — | All staff | Anytime |
| AfriVate Awards | `/people/growth` → Awards + Admin HR dashboard | Featured in digest | HR | Quarterly |
| Town hall | `/events` + Memos | Meet | CEO + HR | Monthly |
| Grievances | `/people/growth` → Grievance (confidential) | — | Employee → HR | As needed |
| Exit interviews | Admin → HR dashboard | — | HR | Every departure |
| Birthday / anniversary | — | Gmail templates | HR | As occurs |

**Implementation SOP — bi-weekly HR digest**

1. Draft digest content (spotlight, celebrations, course reminder, policy note).
2. Send email via **Gmail** to all staff.
3. Post same content in **Memos → New → Memo type: HR digest** (appears on People Overview).
4. Optional: link shout-out winners and upcoming Events.

**Implementation SOP — monthly pulse**

1. **Admin → HR dashboard → Launch pulse survey** (or keep one active survey).
2. People Overview shows banner until user submits.
3. HR reviews engagement score on dashboard; act on themes in next digest/town hall.
4. Do **not** duplicate in Google Forms — portal is source of truth.

**Implementation SOP — grievance**

1. Employee submits via **Growth → Grievance** (confidential flag default on).
2. HR sees open count on dashboard; updates status: open → reviewing → resolved.
3. Serious cases: parallel documentation in Drive HR confidential folder.

**Implementation SOP — exit interview**

1. On resignation/termination: HR logs **Admin → HR dashboard → Exit interview** (name, last day, reasons, notes).
2. Optional: send Gmail thank-you / offboarding checklist.
3. Deactivate portal account in Admin when last day passes.

---

### Pillar 6 · Compensation & benefits

**Goal:** Fair, transparent pay — tracked outside portal until scale requires HRIS.

| Activity | Portal | External | Owner | Cadence |
|----------|--------|----------|-------|---------|
| Salary bands & reviews | — | Google Sheets (confidential Drive) | HR + CEO | Annual |
| OKR-linked bonus discussion | Growth OKRs + 1:1 | — | Manager | Quarterly |
| Non-cash benefits comms | Memos / digest | Gmail | HR | As needed |
| Leave as benefit | `/people/leave` | — | HR | Ongoing |

**Not in portal (by design):** Payroll, salary amounts, pay bands — sensitive financial data stays in **Drive/Sheets** with restricted access. Portal supports **performance linkage** (OKRs) not payroll execution.

**Implementation note:** When AfriVate reaches ~50 people, evaluate BambooHR/HiBob for comp modules.

---

### Pillar 7 · Wellbeing & inclusion

**Goal:** Wellbeing visible in listening channels; inclusion embedded in hiring and comms.

| Activity | Portal | External | Owner | Cadence |
|----------|--------|----------|-------|---------|
| Wellbeing pulse questions | Pulse surveys | — | HR | Monthly |
| Flexible leave | `/people/leave` | — | HR | Ongoing |
| Safe reporting | Grievance tab | hr@afrivate.org | HR | As needed |
| Inclusive comms | Memos, Resources | Gmail | HR | Always |
| December wellbeing course | Learning assignment | Alison | HR | December |

**Implementation SOP:** Include at least one wellbeing scale question in monthly pulse (e.g. "Do you have what you need to do your best work?"). Review low scores privately with managers — never name individuals in town halls.

---

### Pillar 8 · HR operations & compliance

**Goal:** Accurate records, current policies, fair leave, monthly leadership reporting.

| Activity | Portal | External | Owner | Cadence |
|----------|--------|----------|-------|---------|
| Employee records | Admin → Users, Directory | Drive master file | HR | Ongoing |
| Leave management | `/people/leave` | — | HR + managers | Ongoing |
| Policy library | `/documents` | Drive master | HR | Annual review |
| Policy acknowledgment | Resources + ack button | — | HR | On publish |
| Contracts | — | Drive (signed PDFs) | HR | Per hire |
| Payroll | — | Bank / payroll provider | Finance + HR | Monthly |
| HR monthly report | Admin → HR dashboard KPIs | 1-page Sheet summary | HR | Monthly |
| Audit trail | Supabase + admin audit log | — | Admin | Automatic |

**Implementation SOP — publish new policy**

1. Finalize policy in **Google Drive** (master).
2. Upload to **Resources**; set category (e.g. Policy); enable **Requires acknowledgment**.
3. Post **Memo** type **Policy notice** linking to document.
4. Track acks via portal (HR can see who acknowledged).
5. **KPI:** Policy awareness rate = acks ÷ active headcount.

**Implementation SOP — leave**

1. Employee submits request with reason; attach supporting doc if needed.
2. Manager/HR reviews in Admin or Leave page; approve/decline with note.
3. HR can view attachments (medical/emergency) — role-gated.
4. Approved leave visible on calendar.

---

## 4. Three-phase revival roadmap (portal edition)

### Phase 1 · Foundation & re-establishment (Months 1–2)

| Action | Implementation |
|--------|----------------|
| Welcome-back communication | Gmail broadcast + Memo on portal |
| Establish hr@afrivate.org | Gmail; link in digest footer |
| Birthday/anniversary calendar | Gmail templates + optional Events entries |
| First pulse survey | Admin → HR dashboard → Launch pulse |
| Peer recognition live | `/people/shout-outs` — announce in digest |
| Internal comms channel | WhatsApp/Slack optional; **portal Memos = official record** |
| Publish Afrivate Way | Resources upload + Getting started video |
| First town hall | Create Event; Memos reminder |
| Month 1 Alison course | HR dashboard assign + Gmail course email |
| Employee records audit | Admin → Users; fix departments/reports-to |
| Contracts current | Drive checklist (external) |
| Introduce 1:1 template | Growth → 1:1; memo to all managers |

**Phase 1 exit criteria:** All active users on portal; first pulse completed; first digest memo posted; first course assigned; leave policy in Resources with ack.

---

### Phase 2 · Systems & rhythm (Months 3–5)

| Action | Implementation |
|--------|----------------|
| First OKR session | Growth → OKRs; HR runs workshop; enter in portal |
| IDPs for all staff | Growth → IDP; manager review in Month 4 |
| Structured interview guide | Drive doc; recruitment in HR dashboard |
| Employer brand push | LinkedIn/IG (external) |
| AfriVate Spotlight in digest | Memo type digest |
| AfriVate Awards Q1 | Admin HR dashboard → Record award |
| Analyse pulse results | HR dashboard engagement score |
| Five core policies | Resources + acknowledgment |
| 30-60-90 pack documented | Onboarding videos + Growth milestones |

**Phase 2 exit criteria:** OKRs set for all; IDPs drafted; 5 policies ack'd; Q1 awards logged; recruitment pipeline in use.

---

### Phase 3 · Growth & internalism (Months 6–12)

| Action | Implementation |
|--------|----------------|
| First full 360° cycle | Growth → 360°; HR opens cycle |
| IDP vs OKR review | Manager 1:1s + Growth data |
| Leadership pipeline | HR notes in admin + IDP flags |
| Annual compensation review | External Sheets; outcomes via Gmail |
| Salary bands defined | Drive (confidential) |
| Values alignment via 360 | Feedback entries |
| Year 2 L&D calendar | Alison plan + monthly HR dashboard assigns |
| Peer teaching | Memos + Events lunch & learn |
| HR analytics dashboard | Admin KPIs + monthly export |
| HR strategy to leadership | Export metrics; present with CEO |

**Phase 3 exit criteria:** 360 completed; eNPS baseline; attrition tracked; HR presents year-end report with portal data.

---

## 5. HR activity calendar (operating rhythm)

Recurring activities every month: **pulse survey**, **digest** (×2), **manager 1:1s**, **HR dashboard review**.

| Activity | Frequency | Portal | Email | Owner |
|----------|-----------|--------|-------|-------|
| HR digest | Bi-weekly | Memos (digest) | Gmail | HR |
| Course of the month | Monthly | Learning assign | Gmail | HR |
| Pulse survey | Monthly | Surveys | Reminder in digest | HR |
| Town hall | Monthly | Events + Memo | Gmail invite | HR + CEO |
| Manager 1:1s | Monthly | Growth → 1:1 | — | Managers |
| OKR setting | Quarterly | Growth → OKRs | Memo reminder | HR + managers |
| L&D completion check | Monthly | Learning submissions | Digest celebrate | HR |
| 360° feedback | Bi-annual | Growth → 360° | Gmail launch | HR |
| IDP review | Bi-annual | Growth → IDP | — | HR + managers |
| AfriVate Awards | Quarterly | Growth + Admin | Digest feature | HR |
| Policy review | Annual | Resources update | Policy memo | HR |
| Exit interview | Every exit | Admin HR dashboard | — | HR |
| New hire onboarding | Every hire | Onboarding + Growth | Welcome Gmail | HR |
| HR report to leadership | Monthly | Admin KPIs | PDF/slide optional | HR |
| Compensation review | Annual | — | Gmail | HR + CEO |

### Sample month (repeat with seasonal overlays)

**Week 1:** Assign Alison course; send Gmail; launch/keep pulse open.  
**Week 2:** Publish HR digest memo + email.  
**Week 3:** Review learning submissions; nudge non-completers via digest.  
**Week 4:** Close pulse; screenshot/export KPIs for leadership; manager 1:1 completion chase.

---

## 6. The twelve KPIs — where to measure them

| KPI | Target | Primary source | Notes |
|-----|--------|----------------|-------|
| Employee engagement score | 7.5+/10 by Month 6 | Admin → HR dashboard | From pulse scale questions |
| Voluntary attrition rate | <15% annually | Manual: exits ÷ avg headcount | Log exits in HR dashboard; track in Sheet |
| L&D completion rate | 70% → 85% | HR dashboard | Approved submissions ÷ assignments |
| OKR achievement rate | 65–70% | Growth → OKRs | Key results at 70%+ progress |
| Time-to-hire | <30 days | HR dashboard recruitment | Requisition open → hired date |
| Onboarding satisfaction | 8+/10 | Pulse (Day 90 survey) | Dedicated survey or onboarding questions |
| 1:1 completion rate | 90% monthly | HR dashboard | Completed logs ÷ active staff |
| Peer recognition volume | 3+/month | Shout-outs count | Manual count or future KPI |
| eNPS | 30+ by year-end | Surveys (type: enps) | Quarterly eNPS survey |
| Internal promotion rate | 40%+ | Recruitment data | Hires marked internal in notes |
| Policy awareness rate | 100% in 30 days | Document acks | Requires acknowledgment docs |
| Values alignment score | 7+/10 | 360° feedback | Bi-annual cycle averages |

**Monthly leadership report (1 page):** Headcount, engagement, L&D %, 1:1 %, open grievances, pending leave, active surveys — all available on **Admin → HR dashboard** today. Export remaining KPIs from Supabase or a linked Sheet until full analytics ship.

---

## 7. Roles & permissions

| Role | Portal capabilities |
|------|---------------------|
| **Staff** | People hub, submit leave/learning/surveys/growth, shout-outs, ack policies, grievance submit |
| **Team lead** | Above + team visibility on check-ins, 1:1 logging for reports, milestone updates |
| **Department lead** | Above + assign users to department (with admin/HR) |
| **HR** | Admin panel, HR dashboard, all leave/docs, memo types including digest, learning review |
| **Admin** | Full workspace admin, role changes, user approval, HR dashboard |

**Google-style principle:** Managers own 1:1s and OKR coaching; HR owns systems, surveys, policies, and dashboard; CEO owns town hall and comp decisions.

---

## 8. Standard workflows (quick reference)

### A. New employee (first week)

1. Admin invites user → approval → department + reports-to set.  
2. Employee: Getting started → Onboarding complete.  
3. HR: Assign Month 1 course; post welcome Memo.  
4. Manager: Schedule Day 7 1:1; verify milestones seeded in Growth.

### B. Monthly HR cycle (HR lead — ~2 hours)

1. Assign course (dashboard).  
2. Send Gmail course email.  
3. Ensure pulse survey active.  
4. Publish digest (Gmail + Memo digest type).  
5. Approve learning submissions.  
6. Review dashboard KPIs; email CEO summary.

### C. Quarterly awards

1. Collect nominations via shout-outs or manager email.  
2. HR selects winners per category (Innovation, Team Spirit, Most Improved, Embodied the Way).  
3. Record in Admin → HR dashboard.  
4. Feature in digest + town hall.

### D. Departure

1. Exit interview logged in HR dashboard.  
2. Deactivate portal account.  
3. Optional: forward Gmail; archive Drive access per policy.

---

## 9. Tool replacement guide (original plan → portal edition)

| Original toolkit | Portal edition |
|------------------|----------------|
| Google Forms — pulse | **People → Surveys** |
| Google Forms — course completion | **People → Learning** (certificate upload) |
| Google Forms — recognition | **People → Shout-outs** |
| Google Forms — 360 | **People → Growth → 360°** |
| Google Forms — policy sign-off | **Resources → Requires acknowledgment** |
| Google Sheets — OKR tracker | **Growth → OKRs** |
| Google Sheets — leave tracker | **People → Leave** |
| Google Sheets — HR dashboard | **Admin → HR dashboard** (+ Sheet for comp/attrition until automated) |
| Google Docs — policies | **Drive master + Resources copy** |
| WhatsApp — official comms | **Memos + digest** (WhatsApp informal only) |
| Coursera | **Alison** (portal submissions) |

**Keep in Gmail:** Digest email, course announcement, birthdays, holidays, interview scheduling, confidential comp letters.

**Keep in Drive:** Signed contracts, salary band workbook, interview guides, HR confidential grievance archive.

---

## 10. Environment & setup checklist

For HR systems to work in production:

- [ ] All SQL migrations applied (through `20260704_hr_operations.sql`)
- [ ] `.env`: `VITE_USE_SUPABASE_AUTH=true`, `VITE_USE_SUPABASE_DATA=true`
- [ ] Edge Functions deployed (invite, request-access, admin-patch-profile)
- [ ] Supabase Auth URLs set for production domain
- [ ] Optional: `VITE_GOOGLE_CLIENT_ID` + `VITE_GOOGLE_API_KEY` for Drive picker
- [ ] Optional: `VITE_MEDIA_UPLOAD_URL` for file attachments
- [ ] HR/admin users promoted in Supabase
- [ ] Departments and teams configured in Admin
- [ ] First policies uploaded with acknowledgment enabled
- [ ] First pulse survey and Alison assignment created

---

## 11. Known gaps & planned enhancements

These are intentional or on the roadmap — not blockers to operating the plan:

| Item | Status | Workaround |
|------|--------|------------|
| Full 360° peer/manager assignment UI | Basic self-assessment live | HR coordinates reviewers manually; expand in Phase 3 |
| Auto-seed milestones on hire | Manual seed on first Growth visit | HR verifies new hire opened Growth |
| eNPS / attrition / time-to-hire on dashboard | Partial KPIs live | Monthly Sheet for remaining metrics |
| Payroll & salary bands | External | Drive + Finance |
| WhatsApp/Slack integration | External | Portal remains system of record |
| Buddy system field | Informal | Team assignment + WhatsApp |
| PIP formal workflow | External template | Drive PIP doc + IDP/Growth tracking |
| Town hall recording | External | Meet recording → Drive link in Event |

---

## 12. Success definition

AfriVate HR is operating at full power when:

1. **Every employee** logs into the portal weekly.  
2. **Bi-weekly digest** goes out on Gmail *and* as HR digest memos.  
3. **Monthly pulse** achieves >70% response rate.  
4. **Monthly Alison course** achieves >70% approved completion.  
5. **Managers** hit 90% 1:1 completion logged in Growth.  
6. **Quarterly OKRs** exist for every active employee.  
7. **Policies** are acknowledged by 100% of staff within 30 days of publish.  
8. **HR dashboard** is reviewed monthly and shared with CEO.  
9. **No duplicate tracking** in Google Forms for data already in portal.

---

## 13. Mission statement

> AfriVate HR exists to build a team of people who are deeply aligned to the mission, continuously growing in capability, and proud to be part of something that matters — so that AfriVate can do for African entrepreneurs what it set out to do when it was founded.

**AfriVate People & Culture · Base of Operations · Portal Edition · 2025–2026**

---

*Document maintained in the portal repo at `docs/HR_BASE_OF_OPERATIONS.md`. Update when portal features ship.*
