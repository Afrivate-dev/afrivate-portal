# AfriVate Team Space — Master Walkthrough

**Product:** AfriVate Team Space  
**Live site:** [portal.afrivate.org](https://portal.afrivate.org)  
**Audience:** Product, engineering, People & Culture, administrators, and anyone who needs the full picture  
**Document code:** AFRI-PMW-01  
**Last verified against the codebase:** 11 September 2026

This is the **single source of truth** for what Team Space is, what it can do, how it is built, and how every surface (including AVA) fits together. Role-specific how-to steps for day-to-day use still live in the Portal User Guides; this document explains the whole system.

---

## How to use this document

| If you need… | Start here |
|--------------|------------|
| A tour of every screen and who can use it | [Walkthrough of every area](#8-walkthrough-of-every-area) |
| Stack, architecture, data, deploy | [Technology](#4-technology), [Architecture](#5-architecture), [Backend](#16-backend-data-security) |
| The AI helper | [AVA](#14-ava--afrivate-virtual-assistant) |
| How Portal relates to Slack, Gmail, Alison, Drive | [The golden rule](#2-the-golden-rule-which-tool-to-use) |
| Staff / lead / HR how-to (plain English) | [Related documents](#20-related-documents) |

**How this relates to other docs**

- **This file** — complete capability + technology walkthrough (you are here).
- **Portal User Guides** (`docs/PORTAL_USER_GUIDE.md` and role cuts) — day-to-day how-to for people using the product.
- **HR Base of Operations** (`docs/HR_BASE_OF_OPERATIONS.md`) — how People & Culture run the operating rhythm on top of the portal. Parts of that plan pre-date the in-portal Hiring ATS; treat **this** walkthrough as current for product capability.
- **AVA design / setup** — deeper Gemini and deploy notes. Summarised here; operator steps remain in those files.

---

## Contents

1. [What Team Space is](#1-what-team-space-is)
2. [The golden rule: which tool to use](#2-the-golden-rule-which-tool-to-use)
3. [Who can do what](#3-who-can-do-what)
4. [Technology](#4-technology)
5. [Architecture](#5-architecture)
6. [Getting in: accounts, access, and security](#6-getting-in-accounts-access-and-security)
7. [The shell: what you see on every page](#7-the-shell-what-you-see-on-every-page)
8. [Walkthrough of every area](#8-walkthrough-of-every-area)
9. [People hub](#9-people-hub)
10. [Growth](#10-growth)
11. [Duty status: PIP and suspension](#11-duty-status-pip-and-suspension)
12. [Admin](#12-admin)
13. [Employee files](#13-employee-files)
14. [AVA — AfriVate Virtual Assistant](#14-ava--afrivate-virtual-assistant)
15. [Hiring (ATS)](#15-hiring-ats)
16. [Backend, data, security](#16-backend-data-security)
17. [Integrations](#17-integrations)
18. [Environment, deploy, and local development](#18-environment-deploy-and-local-development)
19. [Tests](#19-tests)
20. [Related documents](#20-related-documents)
21. [Key source files](#21-key-source-files)

---

## 1. What Team Space is

AfriVate Team Space is the **internal work website** for AfriVate Technologies Ltd (RC 9210092, Abuja). It is the **system of record** for work that must be written down, approved, and kept: leave, weekly updates, tasks, learning certificates, policy acknowledgements, surveys, shout-outs, growth plans, memos, appraisals, discipline, PIPs, personal details, and hiring applications.

**Product name in the UI:** Team Space (short) / AfriVate Team Space (full).  
**Brand:** Innovation · Elevation · Technology. Primary `#8D4087`, lavender `#F0E7F6`. Headings Poppins, body Roboto.

If it needs a stamp of “this happened, and here is the proof,” it belongs in the portal. Chat belongs in Slack. Informal or emergency contact belongs on WhatsApp.

---

## 2. The golden rule: which tool to use

| Tool | Use it for | Do not use it for |
|------|------------|-------------------|
| **Portal (Team Space)** | Anything that must be recorded: leave, weekly updates, tasks, learning proof, surveys, shout-outs, growth, memos, appraisals, discipline, PIPs, personal details, policy acknowledgements, hiring records. | Casual chat. |
| **Slack** | Official day-to-day messaging: questions, coordination, escalation, being reachable in core hours. Acknowledge official Slack messages within **four (4) hours** on official work days. | Leave requests, policy acknowledgements, appraisals, or any process that needs a Portal record. A Slack message does **not** count as a Portal submission. |
| **Email (`hr@afrivate.org`)** | Official company broadcasts and formal correspondence. | Day-to-day team chat. |
| **Alison** | Taking the assigned online course. | Proving you finished it — that proof goes in the Portal. |
| **Google Drive** | Master copies of policies and contracts. | The everyday staff copy — those live under **Resources**. |
| **WhatsApp** | Informal or emergency contact only. | Leave, policy acknowledgements, appraisals, or any formal People & Culture process. |
| **AVA** | Asking “how do I…?”, personal status, and optional **draft text** that you then submit yourself. | Completing work for you. AVA never submits, approves, publishes, or deletes anything. |

---

## 3. Who can do what

Five portal roles (`src/types/index.ts`):

| Role (code) | Label in the UI |
|-------------|-----------------|
| `staff` | Team member |
| `assistant_lead` | Assistant lead |
| `team_lead` | Team lead |
| `hr` | People & Culture |
| `admin` | Administrator |

Capability matrix (code: `src/utils/helpers.ts`, routes, Admin tabs):

| Capability | Team member | Assistant lead | Team lead | People & Culture | Administrator |
|------------|:-----------:|:--------------:|:---------:|:----------------:|:-------------:|
| Core portal (Home, tasks, People hub, notes, calendar, inbox, search, weekly update, onboarding, memos, resources) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve leave; see team check-ins and PIP/suspension badges on others | | ✓ | ✓ | ✓ | ✓ |
| Publish memos; create calendar events | | | ✓ | ✓ | ✓ |
| Manage Resources (upload, visibility, acknowledgements) | | | | ✓ | ✓ |
| Open **Admin** | | | | ✓ | ✓ |
| Departments and Teams tabs | | | | | ✓ |
| Change a person’s **role** | | | | | ✓ |
| Permanently remove an org user | | | | | ✓ |
| Hiring ATS | | | | ✓ | ✓ |
| Employee files (dossiers, discipline, appraisals) | | | | ✓ | ✓ |
| Org-wide weekly updates | | | | ✓ | ✓ |

**Duty status** is separate from role (`none` / `pip` / `suspended`). See [§11](#11-duty-status-pip-and-suspension). Suspended people can still sign in, but only Memos, Resources, Privacy, and Account & security.

New accounts start **inactive** until People & Culture or an Administrator approves them.

---

## 4. Technology

### 4.1 Runtime and UI

| Layer | Choice | Notes |
|-------|--------|--------|
| UI library | React 19 | `src/main.tsx` |
| Language | TypeScript ~6 | Path alias `@/` → `src/` |
| Bundler | Vite 8 | Dev server port **5173**, `host: true` |
| Routing | React Router v7 | `src/App.tsx` |
| Styling | Tailwind CSS 3.4 + PostCSS | `darkMode: 'class'`; semantic CSS variables |
| Icons | lucide-react | |
| Dates | date-fns | |
| Class names | clsx via `cn()` in `src/utils/helpers.ts` | |
| Calendar UI | FullCalendar 6 (daygrid, timegrid, list, interaction) | `/events` |
| PWA | vite-plugin-pwa | Auto-update service worker; standalone install; theme `#8D4087` |
| Node | ≥ 20.19.0 | |

### 4.2 Backend (production)

| Layer | Choice |
|-------|--------|
| Auth | Supabase Auth (email/password, magic link, invite, password reset) |
| Database | Supabase Postgres (`portal_*` tables + `profiles`) |
| Files | Supabase Storage bucket `portal-files` (50 MB cap) |
| Live updates | Supabase Realtime (presence, notes collab) |
| Server logic | Supabase Edge Functions (Deno) |
| Row security | Postgres RLS on essentially all portal tables |

Production **refuses to boot** without full Supabase auth + data (`src/lib/productionGuard.ts`). Mock/localStorage mode is for local development and Playwright mock tests only.

### 4.3 Document and CV tooling (in-browser)

| Package | Used for |
|---------|----------|
| `pdfjs-dist` | Extract text from PDF CVs in Hiring |
| `mammoth` | Extract text from DOCX CVs |
| `docx-preview` | Render DOCX in preview modals (ATS, Resources, memo bodies) |
| `tesseract.js` | Optional OCR for scanned CVs / images — **off by default** on Gmail sync (weight + CSP) |

`docx` (the generator) is a **devDependency** used to render official Word letters under `docs/official/render/`, not by the running portal.

### 4.4 AI

| Piece | Choice |
|-------|--------|
| Product | AVA — AfriVate Virtual Assistant |
| Model | Google Gemini via **Interactions API**, `store=false` (no Google-side chat retention) |
| Default model | `gemini-3.6-flash` (override with `GEMINI_MODEL`; budget option `gemini-3.5-flash-lite`) |
| Where the key lives | Supabase Edge Function secret `GEMINI_API_KEY` — **never** in Vite |
| Function | `ava-chat` |
| Fallback | Local FAQ + personal context when Gemini is unavailable |

Do **not** use `gemini-2.0-flash` (shut down).

### 4.5 Hosting and hardening

Deployed as a static SPA (Vite `dist/`). `vercel.json` sets SPA rewrites, `noindex`, `X-Frame-Options: DENY`, HSTS, a Content-Security-Policy (self + Google OAuth/APIs + Supabase + YouTube/Vimeo + jsDelivr for workers), and `Cross-Origin-Opener-Policy: same-origin-allow-popups` so Gmail/Drive popups work.

---

## 5. Architecture

### 5.1 Boot sequence

`src/main.tsx`:

1. `assertProductionConfig()` — production requires Supabase auth **and** data.
2. Register the PWA service worker (`registerType: 'autoUpdate'`).
3. Render `<App />` in React Strict Mode.

### 5.2 Provider tree

```
ThemeProvider
  AuthProvider
    DataProvider          → LocalDataProvider | SupabaseDataProvider
      HrProvider          → LocalHrProvider | SupabaseHrProvider
        CollabProvider    → workspace notes + presence
          ConfirmProvider
            BrowserRouter
              AuthRedirectHandler, ToastHost, ErrorBoundary, Routes
```

A storage-full banner listens for the `av:storage-full` event (local/mock mode filling the browser quota).

### 5.3 Dual data mode

| Flag | Auth | Tasks, memos, leave, notes, HR, … |
|------|------|-----------------------------------|
| `VITE_USE_SUPABASE_AUTH` + `VITE_USE_SUPABASE_DATA` = `true` | Supabase Auth | Postgres + Storage + Realtime |
| Either flag off (local/dev) | `sessionStorage` mock session; users in `localStorage` `av-users` | `localStorage` + `BroadcastChannel` for multi-tab collab |

`DataContext` covers operational portal data (users, tasks, check-ins, memos, leave, onboarding, documents, recognition, inbox, events, teams, departments, access requests, label categories).  
`HrContext` covers people-ops records (surveys, learning, acknowledgements, OKRs, 1:1s, IDPs, 360 feedback, ATS, exits, grievances, awards, employee profiles, discipline, PIPs, appraisals, offboarding, HR audit, metrics).  
`CollabContext` covers workspace notes and presence peers.

### 5.4 Layouts and guards

| Guard / layout | Behaviour |
|----------------|-----------|
| `AuthLayout` | Login / request access / forgot / reset chrome |
| `AuthGuestGuard` | Already-active signed-in users are sent to `/` |
| `AppLayout` | Session gate, pending-approval screen, sidebar, top bar, mobile nav, drawer, AVA, install prompt |
| Pending approval | `user.active === false` → `PendingApprovalScreen` (not the full app) |
| Profile load failure | Retry screen instead of a false pending lockout |
| `SuspendedGuard` | Suspended users may only use `/announcements`, `/documents`, `/privacy`, `/account` |
| `AdminRoute` | `isHR(user)` (People & Culture **or** Administrator) |
| `RevivalLaunchRoute` | Named owners + optional `VITE_REVIVAL_LAUNCH_EMAILS` |

Most pages are **lazy-loaded**. Login, request access, forgot/reset password, and Home are eager.

### 5.5 Route map

**Public**

| Path | Purpose |
|------|---------|
| `/oauth/gmail-callback` | Gmail ATS OAuth popup (not portal login) |

**Auth (`AuthLayout`)**

| Path | Purpose |
|------|---------|
| `/login` | Password or magic-link sign-in |
| `/request-access` | Create account + access request |
| `/forgot-password` | Email a reset link |
| `/reset-password` | Set password after recovery or invite |

**Signed-in (`AppLayout`)**

| Path | Area |
|------|------|
| `/` | Home |
| `/tasks` | My work |
| `/inbox` | Inbox |
| `/search` | Search |
| `/checkin` | Weekly update |
| `/onboarding` | Getting started |
| `/notes` | Notes |
| `/announcements` | Memos |
| `/documents` | Resources |
| `/events` | Calendar |
| `/people` | People hub overview |
| `/people/leave` | Time off |
| `/people/shout-outs` | Shout-outs |
| `/people/learning` | Learning |
| `/people/surveys`, `/people/surveys/:surveyId` | Surveys |
| `/people/growth` | Growth |
| `/people/my-info` | My info |
| `/people/directory` | Directory |
| `/privacy` | Privacy notice |
| `/account` | Account & security |
| `/launch-checklist` | Revival launch checklist (allowlisted) |
| `/admin` | Admin (HR / Admin only) |
| `*` | Not found |

**Legacy redirects:** `/directory` → `/people/directory`, `/leave` → `/people/leave`, `/recognition` → `/people/shout-outs`, `/profile` → `/people/directory?profile=1`.

---

## 6. Getting in: accounts, access, and security

### 6.1 Password policy

At least **8 characters**, one **uppercase** letter, and one **number or symbol** (`src/utils/passwordPolicy.ts`). Same rules for signup, reset, and invite.

### 6.2 Sign-in (`/login`)

- Email + password (`signInWithPassword`).
- Optional **magic link** (`signInWithOtp`) when Supabase auth is on.
- PKCE `?code=` / hash token exchange for recovery and email-confirm redirects.
- `AuthRedirectHandler` sends recovery/invite to `/reset-password`.

Supabase client stores the session in **sessionStorage** (`src/lib/supabase.ts`).

### 6.3 Request access (`/request-access`)

A guest enters name, email, password, department, job title, and an optional message. The portal:

1. Creates an Auth user (inactive until approved).
2. Submits a request via RPC `submit_portal_access_request`, falling back to Edge Function `request-access`.
3. Writes `portal_access_requests` and notifies HR/admin inboxes.

Until `active=true`, the person sees **Pending approval** — they can resubmit details, poll status, or sign out. They cannot use the rest of the app.

### 6.4 Invite

HR/Admin can invite by email from **Admin → Approvals**. Edge Function `invite-user` (service role). The invitee lands on `/reset-password` to set a password.

### 6.5 Approve / deny

- Approve: RPC `admin_approve_portal_user`, fallback Edge `admin-patch-profile`, then `notify-access-approved` (Resend email).
- Deny: RPC `admin_deny_portal_access`. The person stays out and may request again later.

### 6.6 Account & security (`/account`)

Signed-in users (including suspended) can verify identity email, change email, and change password when Supabase auth is on.

### 6.7 Privacy (`/privacy`)

Static employee privacy notice (NDPR / NDPA). Allowed when suspended.

### 6.8 Email domain

Edge secret `ALLOWED_EMAIL_DOMAIN` can restrict admin invites. Leave empty to allow any email on invites. Day-to-day login is typically `@afrivate.org`.

---

## 7. The shell: what you see on every page

**Sidebar** (`src/config/nav.ts`): Home, My work, Inbox, People, Search, Weekly update, Getting started, Notes, Memos, Resources, Calendar, and **Admin** (HR/Admin only).

**Phone bottom bar:** Home, My work, Inbox, People, plus **More** (opens the drawer). Hidden from `lg` and up.

**Top bar:** light/dark theme, search, availability (**Available / Away / Busy / Focusing**), Live vs presence-offline indicator, inbox bell, profile menu (My profile, Account & security, Sign out).

**Theme:** `light` | `dark`, stored as `av-theme` in localStorage; toggles the `dark` class on `<html>`.

**Toasts and confirms:** success/error/info toasts (`src/lib/notify.ts`); warm confirm dialogs before destructive or important submits (`ConfirmContext` + `src/content/copy.ts`).

**PWA install:** `InstallAppPrompt` uses `beforeinstallprompt` so people can install Team Space as an app.

**Copy system:** almost all user-facing labels live in `src/content/copy.ts` (`brand`, `nav`, `roleTitles`, `actions`, `confirms`, `pages.*`) so tone stays consistent.

**Suspended chrome:** nav is reduced to Memos and Resources; AVA is hidden; other routes redirect to Memos.

---

## 8. Walkthrough of every area

### 8.1 Home (`/`)

Greeting, role, and quick actions (new task, request leave, weekly update). Stats for due-today tasks, pending leave in the viewer’s scope, events this week, and unread memos. People action banners (policy ack, learning, surveys, incomplete My info, and similar). Today’s workspace + optional external calendar events. Recent memos. Onboarding progress card if the person joined within 30 days.

### 8.2 My work (`/tasks`)

Task board, week view, and list. Scopes: all / mine / owned / assigned. Statuses: todo → in progress → done → blocked. Priorities, categories (HR-managed labels), assignees and owners, search and sort, completion audit.

**Drafts column:** unsaved composer drafts and AVA-inserted task drafts sit here until the person creates the real task. AVA never marks a task `done`.

### 8.3 Inbox (`/inbox`)

Personal notifications. Mark one or all read. Tap to open the related record.

Typical types: shout-out, task assign/mention, note mention, access request / granted / denied, leave update or comment, recognition comment, survey reminder, memo published, department changed.

### 8.4 Search (`/search`)

Query `?q=` across people, memos, tasks, documents (respecting `hrOnly` / `managementOnly`), notes (share ACL), events, leave (manager scope), shout-outs, surveys, learning, OKRs/IDPs (self + reports), jobs, awards, and feedback cycles. People & Culture also search candidates, grievances, and exit interviews.

### 8.5 Weekly update (`/checkin`)

Tabs: **This week**, **History**, **Team** (leads and above). Fields: completed work, next week, blockers, hours worked, visibility (`department` or `all`). People can edit their own submission. Leads filter by department and can export. HR/Admin see org-wide from Admin as well. AVA can insert or refine a draft; the person still clicks submit.

### 8.6 Getting started (`/onboarding`)

Welcome YouTube videos with watch tracking, first-week checklist, and week-map content. Some checklist items **auto-tick** when the related Portal action is done (profile, My info, Slack, Resources acknowledgements, first tasks, OKRs, weekly update, learning). Home shows video progress for the first 30 days. HR/Admin edit videos and checklist items from **Admin → Welcome**.

Required policy acknowledgements in Resources (within seven official work days, per AVA knowledge pack): Standard Work Process, Organisational Structure, Leave and Absence Policy, Employee Onboarding Handbook, and Internal Contributor Engagement Framework if unpaid. Team leads also acknowledge the Team Lead Operational Playbook and Delegation of Authority.

### 8.7 Notes (`/notes`)

Hierarchical workspace pages. Share scopes: private, whole workspace, departments, teams, named people; optional invite-by-email; optional shareable link token.

**Editor** (`NotionNotesEditor`): slash commands (paragraph, H1–H3, lists, to-do, quote, callout, divider), @mentions, page emoji, live co-viewer presence, conflict banner if someone else saves while you edit, auto-merge when idle.

Collab uses Supabase Realtime when data mode is on; otherwise `localStorage` + `BroadcastChannel`. AVA note drafts land under Saved drafts. Deep link: `?open=` / `?key=`.

### 8.8 Memos (`/announcements`)

Organisation updates. Priorities: FYI / Heads-up / Action (stored as info / important / urgent). Categories include **HR digest**. Audience: everyone or a department. Attachments and media embeds (YouTube, Instagram URLs, and similar via sanitised embeds). A memo can use an uploaded document as its body. Unread filter. Live “who’s reading” via Collab. Deep link `?open=`.

**Who can post:** Team lead, People & Culture, Administrator (and not suspended). Everyone else reads the audience-filtered feed.

The Instagram-style card (`InstagramFeedCard`) is a **layout**, not a live Instagram API. Instagram URLs can be embedded as media.

Digest memos also surface on People → Overview. The operating rhythm is bi-weekly digest on Gmail **and** as a portal memo.

### 8.9 Resources (`/documents`)

Policy and file library. Category tabs, search, preview modal (PDF/DOCX/images). Upload from disk or **Google Drive picker**. Optional **acknowledgement** tracking (HR sees who has signed). Visibility flags: `hrOnly`, `managementOnly`. Live viewers. Deep link `?doc=`.

**Who manages files:** People & Culture / Admin (not suspended). Team leads do **not** upload here (unlike memos/events). Management-only files are visible to leads and above; HR-only files to HR/Admin.

### 8.10 Calendar (`/events`)

List view, FullCalendar schedule, and optional **Google Calendar embed** (`VITE_GOOGLE_CALENDAR_EMBED_URL`). Merges an optional external JSON feed (`VITE_TEAM_CALENDAR_JSON_URL`). Audience filtering. Create events: team lead and above. AVA can draft events; the person still saves.

### 8.11 Revival launch checklist (`/launch-checklist`)

Allowlisted owners only (named matchers plus optional `VITE_REVIVAL_LAUNCH_EMAILS`). Phased tasks, person filter, auto-complete rules (for example when a digest memo is posted), copy helpers, WhatsApp/memo drafts, Alison course link, persisted progress. Also linked from People ops for those owners.

---

## 9. People hub

Sub-nav (`src/pages/people/peopleNav.ts`): Overview · Time off · Shout-outs · Learning · Surveys · Growth · My info · Directory.

### 9.1 Overview (`/people`)

Quick links, action banners, duty-status list for leads/HR, digest strip, and scoped metrics (team-scoped for leads).

### 9.2 Time off (`/people/leave`)

**Types and typical allowances shown in the UI**

| Type | Meaning | Days shown |
|------|---------|------------|
| Annual | Planned holiday | 20 |
| Sick | Unwell | 10 |
| Emergency | Sudden, unavoidable absence | 7 |

Except accepted emergencies, give at least **three official work days’** notice. Finish or reassign work and communicate handover on Slack **before** leave. Requests made only on WhatsApp, Slack, email, or verbally are **not** official.

Request flow: dates, type, reason, optional supporting file (upload or Drive). Track **My requests** (pending → approved / declined). Comments on the request. Leads use Team / All requests and a calendar. Leads can approve fewer days than requested. HR also has the org queue under Admin → Time off.

Until the Portal says **approved**, the person is not on approved leave.

AVA may insert a leave **draft**; she never submits it and never approves.

### 9.3 Shout-outs (`/people/shout-outs`)

Public praise wall (Instagram-style cards). Recipients, message, value tag (HR-managed), optional media, likes and comments. HR can remove a post. AVA can draft; the person still sends.

### 9.4 Learning (`/people/learning`)

Alison is the classroom; the Portal is the proof. Assigned course + link → complete on Alison → submit course name, completion date, and certificate (upload or Drive). Status pending until HR approves or rejects. Duplicate pending submissions are blocked. AVA **does not** draft learning certificates.

### 9.5 Surveys (`/people/surveys`)

Open pulse / eNPS / onboarding CSAT-style surveys. One response per person. Take a survey at `/people/surveys/:surveyId`. AVA does not fill surveys.

### 9.6 My info (`/people/my-info`)

The person updates preferred name, phone, bio, skills, emergency contact, next-of-kin notes, and similar. Employment status and HR-only fields live under Admin → Employee files. AVA can insert My info drafts; the person still saves. HR can send a “please update My info” banner.

### 9.7 Directory (`/people/directory`)

Staff directory, presence dots, profile modal (`?profile=1`). People edit their own card (photo, bio, phone, skills, LinkedIn). HR/Admin assign department and team. Availability comes from the top-bar control.

---

## 10. Growth

Route: `/people/growth?tab=…`

| Tab id | UI label | What it does |
|--------|----------|----------------|
| `okrs` | OKRs | Own objectives and key results for the current year/quarter |
| `one_on_one` | 1:1s | Self status for the month; managers mark reports complete (the meeting itself is Meet/Docs, outside the portal) |
| `idp` | Development | Individual development plan; HR/lead review from People ops |
| `feedback` | Feedback | Open 360 cycles: self / manager / peer / upward scales |
| `milestones` | First 90 days | Auto-seeded 30-60-90 onboarding milestones |
| `awards` | Awards | Quarterly winners (HR announces) |
| `grievance` | Speak up | Confidential category + body; own cases listed |

---

## 11. Duty status: PIP and suspension

Stored on the user (`dutyStatus`), separate from Available/Away.

| Status | Portal access | Who sees the badge |
|--------|---------------|--------------------|
| Usual access (`none`) | Full | — |
| Improvement plan (`pip`) | **Full access** plus a banner. Formal PIP paperwork is a separate Employee files record. | Self, assistant/team leads, HR, Admin |
| Suspended (`suspended`) | Sign-in allowed. Only Memos, Resources, Privacy, Account & security. Other routes redirect to Memos. AVA hidden. | Same as PIP |

HR/Admin set this from **Admin → People** or the employee dossier, with a confirm dialog. Placing someone on PIP **duty status** does not by itself write the Conduct paperwork.

---

## 12. Admin

**Where:** `/admin?section=…`  
**Who:** People & Culture and Administrators.

Current **tab labels** (UI). Older user-guide names are in parentheses.

| Section id | UI label | Who | What |
|------------|----------|-----|------|
| `approvals` | Approvals | HR/Admin | Pending access requests: set role/dept/title, Approve or Deny; invite by email. Badge = pending count. |
| `recruitment` | Hiring | HR/Admin | Applicant tracker — [§15](#15-hiring-ats) |
| `users` | People | HR/Admin | Search/edit accounts; active flag; duty status; **role change is Administrator-only**; cannot deactivate yourself |
| `departments` | Departments | **Admin only** | CRUD departments, optional department head (may update reporting line) |
| `teams` | Teams | **Admin only** | CRUD teams, lead, optional assistant lead, members |
| `announcements` | Memos | HR/Admin | Org-wide memo CRUD (same records as the public Memos page) |
| `leave` | Time off | HR/Admin | Org leave queue + calendar; approve/decline/delete. Badge = pending count. |
| `onboarding` | Welcome | HR/Admin | Welcome videos and first-week checklist items |
| `checkins` | Weekly updates | HR/Admin | Org-wide weekly update digest |
| `hr` | People ops | HR/Admin | KPI dashboard and people-ops tools — below |
| `employees` | Employee files | HR/Admin | Dossiers and HR records — [§13](#13-employee-files) |

Deactivating an account (People tab) blocks sign-in. That is different from **suspension**, which still allows a locked-down sign-in.

### 12.1 People ops (`hr`)

KPI grid typically includes: headcount, engagement, eNPS, learning completion, 1:1 rate, leave, grievances, surveys, attrition, time-to-hire, policy acknowledgements, OKRs, recognition, onboarding CSAT, active PIPs, pending discipline, probation due, people on suspension.

From this dashboard HR can:

- Export KPIs
- Assign Alison courses and review certificates
- Launch pulse / eNPS surveys, manage templates, remind non-respondents, view results
- Open 360 cycles, assign reviewers, manage templates
- Review IDPs
- Track policy acknowledgements
- Triage grievances
- Manage quarterly awards
- Light capture of jobs / candidates / exits (full hiring lives under Hiring)
- Edit **portal labels** (task categories, document categories, shout-out tags, award / grievance / exit / memo categories) — live via Realtime
- Open the Revival checklist if allowlisted

---

## 13. Employee files

**Where:** Admin → Employee files  
**Tabs:** Directory · Conduct · Reviews · Probation · Lead scores · Leaving · Activity

This is the **HR system of record** for each person’s employment file.

### 13.1 Directory and dossier

Search active people (engagement type, employment status, My info completeness). Open a **dossier**:

- Duty status (usual / PIP / suspended)
- Engagement: employee / volunteer / contractor
- Status: active, probation, on leave, exiting, terminated, archived
- Start date, probation end, confirmation date, payroll setup, contract or volunteer terms
- HR-private notes (kept off the default PDF)
- Request the person to update My info
- Discipline history and new case
- Export PDF (optionally include discipline)
- Archive when appropriate

### 13.2 Conduct (discipline and PIP)

Stepped process: coaching / verbal → written warning → PIP → restricted duties → termination case.

On a case: severity (low / medium / high / critical), trigger (missed deadlines, communication, absence, misconduct, underperformance, …), how it was delivered (portal notice, meeting, formal email, written letter). Activate immediately or save a pending recommendation for HR. Termination stays gated.

Active PIP: goals, review cadence, on-track flag, close as passed / extended / escalated / terminated recommendation. Creating a PIP step can auto-create a plan with templated goals. Duty-status “PIP” is the **visible badge**; Conduct is the **formal paperwork**. Close both when the plan ends. AVA never activates discipline or PIPs.

### 13.3 Reviews (appraisals)

Formal appraisals: **60%** output / deliverables, **40%** behaviour / soft skills → overall percentage and band:

| Overall | Band |
|---------|------|
| 70%+ | Exceptional |
| 60–69% | Good |
| 50–59% | Performance concern — coaching |
| 40–49% | Disciplinary / corrective |
| Below 40% | Termination consideration |

Usual cadence: quarterly, or monthly on an active PIP. Drafts, finalise, history. Printable branded form exists as a worksheet; the Portal is the record.

### 13.4 Probation

Who is approaching a probation end date. Confirm into active status and store confirmation details.

### 13.5 Lead scores

Quality signals for leads (delivery consistency, KPI completion, communication discipline, escalation quality).

### 13.6 Leaving (offboarding)

Start a checklist with a reason. Default items include: finish or reassign Portal tasks, final weekly update, knowledge transfer, revoke access (email, Slack, Portal), collect assets, exit interview notes, volunteer Code of Conduct notices when relevant.

### 13.7 Activity

Chronological HR audit: who changed what, and when (profiles, discipline, PIPs, appraisals, offboarding).

---

## 14. AVA — AfriVate Virtual Assistant

AVA is the in-portal help assistant. She is **not** a manager, **not** Slack, and **not** a robot that completes HR actions.

**UI:** Purple **AVA** FAB (bottom-right on desktop; above the phone menu). Opens a chat panel with markdown replies, suggested prompts, typing state, citations, **Go to…** buttons, and optional draft-insert actions. Close with the panel close control or Escape. Feature flag: hide with `VITE_AVA_ENABLED=false`. Hidden when the user is suspended.

**Suggested prompts include:** How do I request leave? Help me draft my weekly update. Where do I submit my Alison certificate? What is the four-hour Slack rule? What are my open tasks? How do I submit my weekly check-in?

**Idle nudge:** after dwell + idle on a page (on the order of ~90s / 35s / 150s), a speech bubble offers to help. Snooze ~30 minutes in sessionStorage. Safe to ignore.

### 14.1 What she can do

- Explain how Team Space works, in numbered steps.
- Interpret published policy (SWP, leave, onboarding, Code of Conduct) and cite the document by name.
- Answer using **only data the signed-in person is already allowed to see** (own tasks, leave, surveys, and so on; leads/HR get the same extra scope the Portal already gives them).
- Navigate: **Go to Time off**, **Go to Learning**, Admin screens for HR, etc.
- **Insert or refine drafts** (local form / Drafts list only): weekly update, task, leave request, shout-out, memo, event, My info, notes. Several drafts in one turn are allowed. Task drafts land in My work → Drafts; note drafts land in Notes → Saved drafts.
- Fail closed: if unsure or out of permission, she says so and points to HR or the correct page.

### 14.2 What she must never do

- Submit, send, publish, approve, reject, delete, finalise, complete, or activate any Portal record.
- Draft learning certificates, surveys, leave **approvals**, PIPs, discipline, or appraisals.
- Bypass RLS or use the service role to read other people’s private records for a staff user.
- Invent policy, salary bands, or legal advice. Those go to `hr@afrivate.org`.
- Claim she completed an action the user must perform.

The person always reviews the form or Drafts list and presses Submit / Save / Create / Send themselves.

### 14.3 How a question is answered

```
Browser (AVA panel)
  → POST /functions/v1/ava-chat  (Authorization: user JWT)
  → Edge Function authenticates the user
  → Builds a role-scoped context pack (not a full dossier dump)
  → Calls Gemini Interactions API with store=false
  → Returns JSON: reply, citations, links, suggestedActions (navigate | insert_draft only)
  → Panel renders markdown; forbidden action types are stripped client-side
```

If the Edge Function or Gemini is unavailable (no key, rate limit, mock auth), AVA falls back to **local guidance**: FAQ from the knowledge pack plus personal context already in the browser. That is expected in Playwright mock mode.

Rate limits: friendly “AVA is busy; try again shortly.”

### 14.4 Knowledge and prompt

Bundled pack: `src/lib/ava/knowledge.ts` (operating principle, nav map, leave/learning/surveys/My info, appraisals, progressive discipline, AVA boundaries).  
System prompt: `src/lib/ava/systemPrompt.ts` (tone, insert-draft rules, JSON schema, HR extra for `hr`/`admin`).  
Context builder: `src/lib/ava/buildContext.ts`.  
Client: `src/lib/ava/avaClient.ts`.  
Draft plumbing: `src/lib/ava/avaDrafts.ts` (drops submit/approve/delete/create/write and similar).

### 14.5 Operator setup (summary)

Full beginner walkthrough: `docs/AVA_SETUP_GUIDE.md`.

1. Create a Gemini API key in Google AI Studio.
2. Supabase → Edge Functions → Secrets: `GEMINI_API_KEY`, optional `GEMINI_MODEL`, `SITE_URL` (portal origin for CORS).
3. `npx supabase functions deploy ava-chat`.
4. Leave `VITE_AVA_ENABLED` unset or `true`.

Without the secret, the FAB still works in local guidance mode.

### 14.6 Product principles (unchanged)

1. Portal remains the system of record.
2. Least privilege.
3. Guide and draft locally — never write records.
4. Cite the source.
5. Fail closed.
6. Professional AfriVate tone.

---

## 15. Hiring (ATS)

**Where:** Admin → Hiring  
**Who:** People & Culture and Administrators. Not visible to general staff.

This is the in-portal applicant tracker. Applications are people-data — treat them as confidential.

| Capability | Detail |
|------------|--------|
| Gmail sync | OAuth popup (`/oauth/gmail-callback`) → fetch applications from the HR mailbox (`afrivatehr@gmail.com` in env comments). Requires Drive API + Gmail API and `gmail.readonly`. Uploads CVs to Storage. Rematch on message id. |
| Sources | gmail, indeed, bebee, jobberman, linkedin, manual |
| Stages | Applied → Screen → Interview → Offer → Hired, or Rejected |
| Scoring | Configurable criteria (keywords, resume file, and similar); filters such as top 10 / viable / strong / weak / reject |
| Role profiles | Standard role tabs + criteria editor |
| CV preview | Preview / Open / Download in the detail modal (`docx-preview` / PDF) |
| Text extract | PDF / DOCX / TXT via `src/lib/atsResumeExtract.ts` |
| OCR | Tesseract for images/scanned PDFs — **optional, off by default** on Gmail sync |
| Manual screen | Paste or upload to score without Gmail |

Connect Gmail when the portal asks; complete the Google sign-in popup.

---

## 16. Backend, data, security

### 16.1 Edge Functions

| Function | Purpose |
|----------|---------|
| `invite-user` | HR/Admin invite by email (service role); CORS via `SITE_URL` |
| `request-access` | Inactive user access request + HR inbox notify; rate-limited |
| `admin-patch-profile` | HR/Admin profile patch via service role (whitelist includes `duty_status`, `active`) |
| `admin-remove-user` | **Administrator only** — permanent user removal |
| `notify-access-approved` | Approval email via Resend (`RESEND_API_KEY`, `MAIL_FROM`) |
| `ava-chat` | AVA via Gemini Interactions API |

Dashboard secrets (not Vite): `SITE_URL`, `ALLOWED_EMAIL_DOMAIN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `RESEND_API_KEY`, `MAIL_FROM`, plus the project service role used only inside functions.

### 16.2 Storage

Bucket `portal-files`. Folders: `documents`, `leave`, `avatars`, `media`, `ats`. Path must match `auth.uid()` under storage RLS. Optional external media endpoint `VITE_MEDIA_UPLOAD_URL` (PHP upload on afrivate.org) for some avatars/attachments.

### 16.3 Tables (Postgres)

**Core:** `profiles` (extended), `portal_tasks`, `portal_weekly_check_ins`, `portal_announcements`, `portal_leave_requests`, `portal_leave_comments`, `portal_onboarding_videos`, `portal_onboarding_checklist`, `portal_onboarding_progress`, `portal_documents`, `portal_recognition_posts`, `portal_recognition_comments`, `portal_inbox_notifications`, `portal_events`, `portal_teams`, `portal_team_members`, `portal_departments`, `portal_workspace_notes`, `portal_access_requests`, `portal_task_categories`, `portal_document_categories`, `portal_recognition_tags`, `portal_admin_audit_log`, `portal_launch_checklist_progress`.

**People ops:** `portal_pulse_surveys`, `portal_pulse_responses`, `portal_pulse_survey_templates`, `portal_learning_assignments`, `portal_learning_submissions`, `portal_document_acknowledgments`, `portal_okrs`, `portal_one_on_one_logs`, `portal_idps`, `portal_feedback_cycles`, `portal_feedback_entries`, `portal_feedback_templates`, `portal_feedback_assignments`, `portal_job_requisitions`, `portal_job_candidates`, `portal_exit_interviews`, `portal_grievances`, `portal_onboarding_milestones`, `portal_quarterly_awards`, `portal_award_categories`, `portal_grievance_categories`, `portal_exit_reasons`, `portal_memo_categories`, `portal_ats_criteria`, `portal_employee_profiles`, `portal_discipline_cases`, `portal_pips`, `portal_appraisals`, `portal_hr_audit_log`, `portal_offboarding_checklists`.

Migrations live under `supabase/migrations/` (50 files from `20260518120000_portal_data_tables` through `20260825_onboarding_kit_checklist`, including RLS tightening, access RPCs, ATS, duty status, and Employee hub). Apply all of them for production.

### 16.4 RLS and security posture

RLS is enabled on portal tables and `profiles`. Typical pattern: authenticated users; helpers such as `is_hr_or_admin()`; own-row updates; elevated HR/Admin policies. Hardening migrations include `20260608_rls_tightening.sql` and `20260619_security_hardening.sql`.

The **anon key is safe in the browser only because RLS enforces access**. Never put the **service_role** key in frontend env.

SPA security headers: noindex, frame deny, nosniff, strict referrer, camera/mic/geo denied, HSTS, CSP as in `vercel.json`.

AVA: JWT-authenticated; context is role-scoped; Gemini `store=false`; no `VITE_GEMINI_*`.

---

## 17. Integrations

| Integration | How it is used | Config |
|-------------|----------------|--------|
| **Supabase** | Auth, Postgres, Storage, Realtime, Edge Functions | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, mode flags |
| **Google Gemini** | AVA cloud answers | Edge secret `GEMINI_API_KEY` |
| **Google Gmail API** | Hiring application sync | `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, OAuth redirect |
| **Google Drive picker** | Attach files to leave, learning, Resources, memos | Same Google client |
| **Google Calendar embed** | Optional iframe on Calendar | `VITE_GOOGLE_CALENDAR_EMBED_URL` |
| **External calendar JSON** | Extra events on Home / Calendar | `VITE_TEAM_CALENDAR_JSON_URL` |
| **Resend** | Access-approved email | Edge `RESEND_API_KEY`, `MAIL_FROM` |
| **Alison.com** | Course delivery (external); certificates submitted in Portal | Course URLs on assignments |
| **YouTube / Vimeo** | Onboarding videos and memo embeds | CSP `frame-src` |
| **Optional media PHP** | Avatars / announcement media | `VITE_MEDIA_UPLOAD_URL` |
| **Slack / WhatsApp / Gmail broadcast** | Not APIs — operating-model companions | See [§2](#2-the-golden-rule-which-tool-to-use) |

There is **no** live Instagram API. Instagram is a card layout plus optional URL embeds.

---

## 18. Environment, deploy, and local development

### 18.1 Vite environment (`.env.example`)

| Variable | Role |
|----------|------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | JWT **anon** key (starts with `eyJ` — do not use `sb_publishable_` keys) |
| `VITE_USE_SUPABASE_AUTH` | Auth mode |
| `VITE_USE_SUPABASE_DATA` | Postgres data mode |
| `VITE_MEDIA_UPLOAD_URL` | Optional media upload |
| `VITE_TEAM_CALENDAR_JSON_URL` | External calendar JSON |
| `VITE_GOOGLE_CALENDAR_EMBED_URL` | Calendar iframe |
| `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_API_KEY` | Drive picker + Gmail ATS |
| `VITE_GOOGLE_OAUTH_REDIRECT_URI` | Optional ATS redirect override |
| `VITE_AVA_ENABLED` | Hide AVA if `false` (default on) |
| `VITE_REVIVAL_LAUNCH_EMAILS` | Extra Revival checklist emails |

Copy `.env.example` → `.env` (or `.env.local`). Production hosting must set the same Vite variables. Both Supabase flags must be `true` in production.

### 18.2 Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). With flags off, mock login + localStorage is used. With flags on, sign in with a real Supabase user; new users stay inactive until approved.

Go-live database guide: `SUPABASE_SETUP.md` and `supabase/SETUP_STEPS.md`.

### 18.3 Build and deploy

```bash
npm run build    # tsc -b && vite build → dist/
```

Deploy `dist/` to Vercel (repo includes `vercel.json`) or equivalent. Point DNS to `portal.afrivate.org`. Add env vars in the host dashboard. Deploy Edge Functions separately (`npx supabase functions deploy …`).

---

## 19. Tests

| Command | What |
|---------|------|
| `npm run test:e2e` | Playwright against a test-mode Vite app (`playwright.config.ts`, port 5199). Login tests skip if `.env.test.local` credentials are missing. |
| `npm run test:e2e:full` | Mock config (`playwright.mock.config.ts`, port 5200, Supabase flags forced off), including Pixel 5 and Galaxy Tab S4 projects |
| `npm run test:e2e:responsive` | Mobile + tablet mock projects only |
| `npm run test:ava` | AVA verification script |
| `npm run test:ats` / `test:ats:full` | Gmail ATS / functionality scripts |
| `npx playwright test -c playwright.mock.config.ts --project=chromium-mock -g "AVA assistant"` | AVA UI smoke in mock mode |

---

## 20. Related documents

| Document | Path | Role |
|----------|------|------|
| **This walkthrough** | `docs/PORTAL_MASTER_WALKTHROUGH.md` | Full system picture |
| Portal User Guide (all roles) | `docs/PORTAL_USER_GUIDE.md` · PDF under `docs/official/policies/` | AFRI-PUG-01 how-to |
| Staff User Guide | `docs/PORTAL_USER_GUIDE_STAFF.md` | AFRI-PUG-02 |
| Team Lead User Guide | `docs/PORTAL_USER_GUIDE_TEAM_LEAD.md` | AFRI-PUG-03 |
| HR Base of Operations | `docs/HR_BASE_OF_OPERATIONS.md` | Operating rhythm (ATS note: product now includes Hiring) |
| AVA design plan | `docs/AVA_DESIGN_PLAN.md` | Product principles and Gemini design |
| AVA setup guide | `docs/AVA_SETUP_GUIDE.md` | Operator deploy |
| Supabase go-live | `SUPABASE_SETUP.md`, `supabase/SETUP_STEPS.md`, `supabase/CLI_SETUP.md` | Auth, migrations, functions |
| Repo README | `README.md` | Quick start |

Official policies that AVA and Resources cite include Standard Work Process, Leave and Absence Policy, Organisational Structure, Employee Onboarding Handbook, Internal Contributor Engagement Framework, Team Lead Operational Playbook, Delegation of Authority, Volunteer Code of Conduct, and the Penalty and Disciplinary Policy. Those are generated under `docs/official/`.

---

## 21. Key source files

| Concern | Path |
|---------|------|
| Entry / PWA register | `src/main.tsx` |
| Routes and providers | `src/App.tsx` |
| Nav | `src/config/nav.ts` |
| Types | `src/types/index.ts`, `src/types/hr.ts` |
| Auth | `src/context/AuthContext.tsx` |
| Data / HR switch | `src/context/DataContext.tsx`, `src/context/HrContext.tsx` |
| Notes + presence | `src/context/CollabContext.tsx` |
| Role helpers | `src/utils/helpers.ts` |
| Duty status | `src/lib/dutyStatus.ts` |
| Copy | `src/content/copy.ts` |
| AVA UI | `src/components/ava/AvaFab.tsx` |
| AVA client / knowledge / drafts | `src/lib/ava/` |
| AVA Edge Function | `supabase/functions/ava-chat/index.ts` |
| Admin shell | `src/pages/AdminPanel.tsx` |
| People ops | `src/pages/admin/HrDashboardSection.tsx` |
| Employee files | `src/pages/admin/EmployeeHubSection.tsx` |
| Hiring | `src/pages/admin/RecruitmentAtsSection.tsx` |
| Resume extract / OCR | `src/lib/atsResumeExtract.ts` |
| Gmail ATS | `src/lib/gmailAtsSync.ts` |
| Production guard | `src/lib/productionGuard.ts` |
| Vite / PWA | `vite.config.ts` |
| Hosting headers | `vercel.json` |
| Env template | `.env.example` |

---

*When the product changes, update this walkthrough in the same change. The Portal User Guides should stay aligned on user-facing names and steps; this file should stay aligned on architecture, stack, AVA, Admin labels, and integrations.*
