import { REVIVAL_ALISON_COURSE } from '@/content/revivalLaunchChecklist'

/** Memo to send Daniel before launch — he is not on the portal yet. */
export const DANIEL_PORTAL_ONBOARDING_MEMO = {
  subject: 'AfriVate Portal — Your HR access before revival launch',
  to: 'Daniel',
  from: 'Emmanuel Okpiaifo',
  body: `Hi Daniel,

We're launching the AfriVate revival this week and the portal is the backbone of how HR will run from Day 1. I need you set up before we send anything to all staff.

**Your action (today):**
1. Go to https://portal.afrivate.org/request-access
2. Submit your details (name, work email, department: HR)
3. I will approve your access and assign you the **HR** role within a few hours

Once you're in, you'll use the portal to:
- Upload the Afrivate Way and Leave Policy (with acknowledgment required)
- Post the welcome HR Digest memo
- Track the revival launch checklist (only you, Opemipo, and I can see this)

**Login:** Use the email you register with. You'll receive a magic link or set a password on first sign-in.

**Need help?** Reply to this email or WhatsApp me directly.

The launch checklist lives at **portal.afrivate.org/launch-checklist** once you're approved.

Thanks for leading this with us.

Emmanuel
CEO, AfriVate`,
} as const

/** All-staff revival memo — Daniel sends from hr@afrivate.org after Emmanuel approves. */
export const STAFF_REVIVAL_MEMO_DRAFT = {
  subject: '📋 MEMO — Welcome to a New Era at AfriVate',
  from: 'hr@afrivate.org',
  to: 'All Staff',
  cc: '[CEO name]',
  body: `Dear AfriVate Team,

Welcome to a new era at AfriVate.

This memo marks the start of how we will work together going forward — clearer systems, stronger culture, and a shared home for people operations. It is not a one-off announcement. It is the beginning of how AfriVate runs.

---

**Why this matters**
AfriVate is building a People & Culture rhythm that is consistent, fair, and easy to follow. From today, the AfriVate Team Space portal is our system of record for people work. Email remains how we announce and reach everyone. Learning happens on Alison. Master documents live in Drive, with staff-facing copies in the portal.

Simple rule of thumb:
- Needs a record, approval, or acknowledgment → **portal**
- Needs a broadcast to everyone → **email (hr@afrivate.org)**
- Builds a skill → **Alison** (assigned and tracked in the portal)
- Quick team chat → **WhatsApp** (helpful for updates; not the official HR record)

Live at: **https://portal.afrivate.org**

---

**How AfriVate will operate from now on**

**1. One portal for people operations**
Register and log in at portal.afrivate.org. Once approved, use it for:
- Leave requests (portal only going forward)
- Policies and acknowledgments (Resources)
- Monthly pulse surveys
- Learning assignments and certificate uploads
- Shout-outs / peer recognition
- Growth conversations (OKRs, manager 1:1s, development plans)
- Memos and important notices

**2. Our values and policies live where everyone can find them**
In Week 1, please open **Resources** and acknowledge:
- The AfriVate Way (our core values)
- The Leave Policy

When a policy is updated, you will see it in the portal and receive a clear notice. Please read and acknowledge when asked — that keeps us aligned.

**3. A steady operating rhythm (what you can expect)**
- **Bi-weekly HR Digest** — short updates by email and mirrored in Memos
- **Monthly Course of the Month** — free Alison course assigned to all staff
- **Monthly pulse survey** — a few minutes to share how work feels
- **Monthly town hall** — leadership update, portal walkthrough when needed, open Q&A
- **Monthly manager 1:1s** — every manager meets their reports; progress is logged in Growth
- **Quarterly goals (OKRs)** — set and reviewed in Growth with your manager

**4. Recognition and growth**
Great work should be visible. Use **People → Shout-outs** to recognise colleagues against our values. Learning is not optional theatre — complete your assigned course and upload your certificate in **People → Learning**.

**5. How to reach HR**
hr@afrivate.org is your HR inbox. We aim to respond within **24 hours** on working days (faster during launch week when we can).

WhatsApp remains useful for quick team messages. Policy questions, leave, and formal HR matters belong on the portal or at hr@afrivate.org.

---

**Your first course of the month**
**${REVIVAL_ALISON_COURSE.title}** (${REVIVAL_ALISON_COURSE.provider})
🔗 ${REVIVAL_ALISON_COURSE.url}
⏱ ${REVIVAL_ALISON_COURSE.duration} · Free certificate

Find it under **People → Learning**. Deadline: last day of this month.

---

**Town hall — save the date**
Our first town hall of this new era:
📅 [Town hall date]
🕐 [Town hall time]
📍 Google Meet — link to follow

Attendance is expected. Agenda: welcome to the new era → how AfriVate will operate → portal walkthrough → open Q&A.

---

**Your next steps this week**
☐ Register on the portal → https://portal.afrivate.org → Request Access
☐ Read and acknowledge The AfriVate Way and Leave Policy
☐ Complete the monthly pulse survey (a few minutes)
☐ Start your Alison course of the month

---

This is AfriVate choosing systems over noise, clarity over confusion, and people over paperwork. Thank you for stepping into this new era with us.

Warm regards,

Daniel [Surname]
HR, AfriVate
hr@afrivate.org

Ref: AV-HR-MEMO-[YYYY-MM]-001
Date: [Send date]`,
} as const

/** Course-of-the-month email — Daniel sends within 48 hours of the revival memo. */
export const COURSE_OF_MONTH_EMAIL_DRAFT = {
  subject: '📚 [Month] L&D: Your course of the month is here',
  from: 'hr@afrivate.org',
  to: 'All Staff',
  body: `Hi team,

Your **Course of the Month** for [Month] is ready — and it's already waiting for you in the portal.

**${REVIVAL_ALISON_COURSE.title}**
Provider: ${REVIVAL_ALISON_COURSE.provider} (free)
Duration: ${REVIVAL_ALISON_COURSE.duration}
Certificate: Yes — upload yours in the portal when done

🔗 Start here: ${REVIVAL_ALISON_COURSE.url}

**Also in the portal:** People → Learning → submit your certificate when you finish.

**Deadline:** [Last day of month]

Why business writing? Clear emails and memos keep our revival running smoothly — every reply, digest, and announcement counts.

Questions? Reply to hr@afrivate.org.

— Daniel
HR, AfriVate`,
} as const

/** WhatsApp message — send within 3 minutes of the staff memo email. */
export const REVIVAL_WHATSAPP_DRAFT = `💚 *Welcome to a new era at AfriVate*

The official memo just landed from hr@afrivate.org — how we'll operate going forward (portal as home base, clear people rhythm, Alison learning).

*Do this today:*
1️⃣ Register → portal.afrivate.org (Request Access)
2️⃣ Acknowledge The AfriVate Way + Leave Policy
3️⃣ Complete the short pulse survey

Memo sent at [time]. Portal: portal.afrivate.org`

export const REVIVAL_LAUNCH_MEMOS = [
  { id: 'daniel-onboarding', label: 'Daniel — portal onboarding', ...DANIEL_PORTAL_ONBOARDING_MEMO },
  { id: 'staff-revival', label: 'All staff — revival memo', ...STAFF_REVIVAL_MEMO_DRAFT },
  { id: 'course-month', label: 'All staff — course of the month', ...COURSE_OF_MONTH_EMAIL_DRAFT },
  { id: 'whatsapp', label: 'WhatsApp — launch day', subject: 'Team WhatsApp', body: REVIVAL_WHATSAPP_DRAFT },
] as const
