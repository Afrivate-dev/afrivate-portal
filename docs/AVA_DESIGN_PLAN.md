# AVA — AfriVate Virtual Assistant
## Design Plan · Google Gemini · Portal Help Assistant

**Product name:** AfriVate Virtual Assistant  
**Short name:** AVA  
**Model:** Google Gemini API  
**Owner:** People & Culture + Engineering  
**Status:** Phase 1–4 implemented (UI + edge function + local fallback). Deploy `ava-chat` and set `GEMINI_API_KEY` for cloud answers.  
**Date:** August 2026

---

## Deploy AVA (operators)

Full beginner walkthrough: [`docs/AVA_SETUP_GUIDE.md`](AVA_SETUP_GUIDE.md)

1. Create a Gemini API key in Google AI Studio ([aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).
2. In Supabase Dashboard → Edge Functions → Secrets, set:
   - `GEMINI_API_KEY`
   - optional `GEMINI_MODEL` (default `gemini-3.6-flash`; use `gemini-3.5-flash-lite` for lowest cost)
   - `SITE_URL` (portal origin for CORS)
3. Deploy the function:
   ```bash
   npx supabase functions deploy ava-chat
   ```
4. Keep `VITE_AVA_ENABLED` unset or `true`. Set `false` to hide the FAB.

**Model note:** Gemini 2.0 Flash is shut down. AVA uses the **Interactions API** with `store=false` (no Google-side chat retention) and defaults to **gemini-3.6-flash**.

Without the secret, AVA still works in **local guidance mode** (FAQ + personal context from the Portal).

---

## 1. Purpose

AVA is the official in-portal help assistant for AfriVate Team Space. She helps team members, leads, and People & Culture:

- Understand how to use Portal features
- Interpret AfriVate policies (SWP, leave, onboarding, CoC)
- Answer questions using **only the signed-in user’s permitted data**
- Guide users to the correct screen or next action

AVA is **not** a replacement for Slack, Gmail, or formal HR decisions. She is a guided assistant inside Team Space.

---

## 2. Product principles

1. **Portal remains the system of record.** AVA explains and guides; she does not become an unofficial approval channel.
2. **Least privilege.** AVA sees only what the current user is already allowed to see.
3. **No silent writes.** Any create/update action requires explicit user confirmation.
4. **Cite the source.** Policy answers should reference the relevant document (e.g. Leave Policy, SWP, User Guide).
5. **Fail closed.** If AVA is unsure or lacks permission, she says so and points to HR / the correct Portal page.
6. **Professional tone.** Clear, formal, AfriVate-branded language — warm but not casual slang.

---

## 3. Naming & brand

| Item | Value |
|------|--------|
| Full name | AfriVate Virtual Assistant |
| Short name | AVA |
| UI label | AVA |
| Subtitle | AfriVate Virtual Assistant |
| Avatar | AfriVate mark / simple AVA chip in brand purple `#8D4087` |
| Voice | Professional, concise, step-by-step |

Example first message:

> Hello — I’m AVA, the AfriVate Virtual Assistant. I can help you use Team Space, explain policies, and guide you through leave, learning, tasks, and more. What do you need?

---

## 4. Model & integration (Google Gemini)

### 4.1 Recommended model
- **Primary:** `gemini-3.6-flash` — latest stable Flash; balances speed and intelligence for agentic help
- **Budget option:** `gemini-3.5-flash-lite` — fastest / most cost-effective (set via `GEMINI_MODEL`)
- **Avoid:** `gemini-2.0-flash` / `gemini-2.0-flash-lite` (shut down)

### 4.2 API surface
- Use the **Interactions API** (`POST /v1beta/interactions`) — GA and recommended for new projects
- Call with **`store=false`** so AVA chats with employee context are not retained in Google project storage
- `generateContent` remains supported as legacy but is not used by AVA

### 4.2 Where the API key lives
**Must not** put `GEMINI_API_KEY` in the Vite frontend.

**Approved pattern (matches existing portal):**
- Supabase Edge Function: `ava-chat`
- Secret: `GEMINI_API_KEY` stored in Supabase function secrets
- Client calls the edge function with the user’s Supabase JWT
- Edge function verifies the user, builds a **role-scoped context**, then calls Gemini

### 4.3 Request flow

```
Browser (AVA panel)
  → POST /functions/v1/ava-chat  (Authorization: user JWT)
  → Edge Function:
       1. Authenticate user
       2. Load role + allowed context snapshot
       3. Call Gemini Interactions API (store=false) with system prompt + context + history
       4. Return structured JSON answer (+ optional suggested actions)
  → AVA panel renders reply
```

### 4.4 Free-tier operating notes
- Gemini free tier has rate limits — show a friendly “AVA is busy; try again shortly” message
- Prefer `gemini-3.5-flash-lite` via `GEMINI_MODEL` if quota is tight
- Truncate chat history (e.g. last 12 turns) to control cost/quota
- `store=false` avoids Google-side retention of portal conversation content
---

## 5. Security & privacy (non-negotiable)

### 5.1 What AVA must never do
- Bypass RLS or use service-role to read all tables for a staff user
- Reveal other employees’ leave, appraisals, discipline, grievances, salaries, or private notes
- Invent policy that contradicts SWP / Leave Policy / Portal User Guide
- Approve leave, finalise appraisals, or close PIPs on her own

### 5.2 Permission model

| Role | AVA may use |
|------|-------------|
| Team member | Own tasks, leave, check-ins, learning, surveys, My info, visible memos/events/docs |
| Assistant / Team lead | Above + managed team leave/check-ins/OKR visibility as Portal already allows |
| HR / Admin | Org-scoped dashboards and Employee Hub data **already visible to that role** |

### 5.3 Data sent to Gemini
Only:
- User display name, role, department (non-sensitive identity)
- Relevant doc excerpts
- A **redacted context pack** for the current question (e.g. own leave statuses, not full dossier dumps)
- Recent chat turns

Do **not** send:
- HR private notes by default
- Full employee dossiers unless the user is HR/Admin **and** explicitly asking about a named case they can already open
- Passwords, tokens, raw attachment binaries

### 5.4 Audit
Log AVA interactions server-side (user id, timestamp, intent category, success/fail). Do not store full sensitive payloads longer than needed for support/debug retention policy.

---

## 6. Capabilities by phase

### Phase 1 — Docs & navigation help (MVP)
**Goal:** Safe, useful, shippable quickly.

AVA can:
- Answer “How do I request leave / submit learning / find Resources?”
- Explain SWP communication rules (Slack vs Portal vs WhatsApp)
- Point to the correct route (`/people/leave`, `/tasks`, etc.)
- Summarise sections of the Portal User Guide and key policies

AVA cannot yet:
- Read live personal records
- Create or edit anything

**Knowledge sources (bundled/indexed):**
- `docs/PORTAL_USER_GUIDE.md`
- SWP, Leave Policy, Onboarding Handbook, Volunteer CoC (text extracts)
- Short “portal map” of routes and roles

### Phase 2 — Personal context help
**Goal:** “What is the status of my leave?” / “What tasks are due this week?”

AVA can:
- Read the signed-in user’s own Portal data via existing client contexts **or** edge-function queries as that user
- Summarise personal status (leave pending, open tasks, learning due, survey open)
- Suggest next steps with deep links

Still confirmation-gated for any write.

### Phase 3 — Confirmed actions (optional tools)
**Goal:** Guided actions with explicit Confirm.

Examples:
- Draft leave request → user reviews → Confirm submits via existing `createLeave` path
- Draft weekly check-in outline → user edits → Submit
- Open compose memo for leads (prefill only)

Each tool maps 1:1 to existing Portal functions; AVA never invents a second write path.

### Phase 4 — HR copilot (HR/Admin only)
**Goal:** Help HR navigate Employee Hub, explain PIP ladders, draft memo outlines.

Strictly role-gated. Still no autonomous discipline activation without human confirmation.

---

## 7. UI / UX design

### 7.1 Placement
- Floating action button (bottom-right on desktop; above mobile nav on phones)
- Label: **AVA**
- Opens a right-side drawer / bottom sheet chat panel

### 7.2 Panel contents
- Header: AVA · AfriVate Virtual Assistant
- Suggested prompts (chips):
  - “How do I request leave?”
  - “Where do I submit my Alison certificate?”
  - “What is the 4-hour Slack rule?”
  - “Show my open tasks” *(Phase 2)*
- Message list (user / AVA)
- Composer with Send
- Footer note: “AVA guides you. Portal remains the system of record.”

### 7.3 Empty / error / rate-limit states
- Offline / function down: clear apology + link to User Guide PDF / Resources
- Rate limited: retry guidance
- Out of scope (salary negotiation, legal advice): redirect to HR email

### 7.4 Accessibility
- Keyboard focus trap in panel
- Screen-reader labels
- Works in light/dark theme using existing design tokens

---

## 8. System prompt (summary)

AVA should be instructed that she is:
- AfriVate Virtual Assistant for Team Space
- Bound by SWP: Slack = messaging; Portal = record; WhatsApp = informal/emergency only
- Required to respect the user’s role
- Required to say “I don’t have access to that” when out of scope
- Required to give numbered steps for how-to answers
- Required to recommend Portal paths using official nav names (My work, Time off, Resources, etc.)

---

## 9. Technical build outline

| Piece | Location |
|-------|----------|
| Chat UI | `src/components/ava/AvaPanel.tsx` + FAB in app shell |
| Client API | `src/lib/ava/avaClient.ts` |
| Edge function | `supabase/functions/ava-chat/index.ts` |
| Doc index | `src/lib/ava/knowledge/` or edge-bundled chunks from official docs |
| Feature flag | `VITE_AVA_ENABLED=true` (and server-side check) |
| Secrets | `GEMINI_API_KEY` in Supabase secrets only |
| Tests | e2e: open panel, ask leave how-to, receive steps; staff cannot get other-user leave |

### Local / mock mode
When Gemini key is absent:
- AVA returns curated FAQ answers from local knowledge pack (no live model)
- Allows UI development and e2e without burning quota

---

## 10. Success metrics

| Metric | Target (first 60 days) |
|--------|-------------------------|
| AVA open rate (weekly active users) | ≥ 40% |
| Top intents answered without HR escalation | Leave, learning, Slack/Portal rules, tasks |
| Critical privacy incidents | 0 |
| User “was this helpful?” (optional thumbs) | ≥ 70% positive |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Hallucinated policy | Ground answers in indexed docs; prefer citation; refuse when missing |
| Data leak across users | JWT auth + user-scoped queries only; no service-role reads for chat context |
| Free-tier exhaustion | Flash model, short history, FAQ cache, graceful degradation |
| Over-trust of AVA | Footer + prompt: AVA does not approve leave or replace HR |
| Key exposure | Edge function only; never `VITE_GEMINI_*` |

---

## 12. Delivery phases (build order)

### Phase 1 — MVP (recommended first ship)
1. AVA FAB + chat panel
2. `ava-chat` edge function + Gemini Flash
3. Knowledge pack from User Guide + SWP + Leave Policy
4. Feature flag + rate-limit UX
5. Basic e2e smoke test

### Phase 2 — Personal context
1. Context pack: own tasks / leave / learning / surveys
2. Deep links in answers
3. Audit log of intents

### Phase 3 — Confirmed actions
1. Tool registry (leave draft, check-in draft)
2. Confirm UI before write
3. HR-only expanded tools later

---

## 13. Decision checklist (approve before coding)

- [x] Name: **AfriVate Virtual Assistant (AVA)**
- [x] Model provider: **Google Gemini API**
- [x] Security model: **role-scoped, no full-org access for staff**
- [ ] Approve Phase 1 MVP scope
- [ ] Confirm Gemini API key ownership (who creates Google AI Studio key)
- [ ] Confirm feature flag default (on for staging / off until key set in prod)

---

## 14. Recommended next step

**Build Phase 1 only** after you confirm:

1. Proceed with Phase 1 MVP now  
2. Who will create/store the Gemini API key in Supabase  
3. Preferred FAB label: **AVA** only, or **Ask AVA**

Once confirmed, implementation starts with the chat panel + `ava-chat` edge function + policy knowledge pack.
