/** Alison course recommended for all AfriVate staff — Month 1 L&D. */
export const REVIVAL_ALISON_COURSE = {
  title: 'Fundamentals of Business Writing',
  provider: 'Alison',
  url: 'https://alison.com/course/fundamentals-of-business-writing',
  duration: '~3 hours',
  certificate: true,
  description:
    'Free Alison course covering professional email, memos, and business correspondence — aligns with the revival launch memo and HR digest rhythm.',
} as const

export type RevivalAutoRule =
  | 'team_portal_ready'
  | 'daniel_hr_access'
  | 'opemipo_portal_access'
  | 'staff_directory_complete'
  | 'doc_afrivate_way'
  | 'doc_leave_policy'
  | 'welcome_hr_digest_memo'
  | 'hr_digest_memo'
  | 'active_pulse_survey'
  | 'alison_course_assigned'
  | 'town_hall_posted'
  | 'recognition_by_daniel'
  | 'recognition_volume_3'
  | 'portal_registrations_majority'
  | 'portal_registrations_target'

export type RevivalTaskTag =
  | 'critical'
  | 'portal'
  | 'email'
  | 'whatsapp'
  | 'time'
  | 'approval'

export type RevivalPerson = 'e' | 'd' | 'o'

export interface RevivalLaunchTask {
  id: string
  people: RevivalPerson[]
  title: string
  subtitle?: string
  tags: RevivalTaskTag[]
  timeLabel?: string
  link?: string
  autoRule?: RevivalAutoRule
}

export interface RevivalLaunchUnit {
  id: string
  icon: string
  title: string
  meta: string
  phaseId: string
  tasks: RevivalLaunchTask[]
}

export interface RevivalLaunchPhase {
  id: string
  label: string
}

export const REVIVAL_LAUNCH_PHASES: RevivalLaunchPhase[] = [
  { id: 'p0', label: 'Phase 0 · Before Anything Goes Out — Do These First' },
  { id: 'p1', label: 'Phase 1 · Send Day — The Memo Goes Out' },
  { id: 'p2', label: 'Phase 2 · Same Day — Keep the Engine Running' },
  { id: 'p3', label: 'Phase 3 · Day 3 Checkpoint — Measure & Chase' },
  { id: 'p4', label: 'Phase 4 · Day 7 — The First HR Report' },
  { id: 'p5', label: 'Phase 5 · Week 2 Onward — The Operating Rhythm' },
]

export const REVIVAL_LAUNCH_UNITS: RevivalLaunchUnit[] = [
  {
    id: 'u1',
    icon: '🌐',
    title: 'Unit 1 · Portal Readiness Check',
    meta: 'Emmanuel · Must be done before the memo goes out',
    phaseId: 'p0',
    tasks: [
      {
        id: 'u1-t1',
        people: ['e'],
        title:
          'Open portal.afrivate.org in a fresh browser (incognito) and test the full "Request Access" flow yourself',
        subtitle:
          'Fill in your own name/email and verify the submission works end-to-end before sending the memo',
        tags: ['critical', 'time'],
        timeLabel: '~5 min',
        link: '/request-access',
      },
      {
        id: 'u1-t2',
        people: ['e'],
        title:
          'Confirm all current active staff are listed in Admin → Directory with correct department and reports-to set',
        subtitle: 'Anyone missing = a gap in your Day 1 data. Fix before the memo goes out.',
        tags: ['portal', 'time'],
        timeLabel: '~15 min',
        link: '/admin',
        autoRule: 'staff_directory_complete',
      },
      {
        id: 'u1-t3',
        people: ['e'],
        title:
          'Confirm Daniel has HR-level access and Opemipo has their login credentials and can access the portal',
        subtitle: 'Go to Admin → Users → verify roles. Daniel = HR role. Opemipo = Staff role minimum.',
        tags: ['portal', 'time'],
        timeLabel: '~5 min',
        link: '/admin',
        autoRule: 'team_portal_ready',
      },
      {
        id: 'u1-t4',
        people: ['e'],
        title:
          "Block time in Emmanuel's calendar today to approve portal registrations — morning (9am) and afternoon (2pm) checks for the next 7 days",
        subtitle:
          'People will register today after the memo. Slow approvals kill momentum. Set recurring 10-min calendar blocks.',
        tags: ['critical', 'time'],
        timeLabel: '~5 min',
      },
      {
        id: 'u1-t5',
        people: ['e'],
        title:
          'Verify portal.afrivate.org loads correctly on mobile (WhatsApp links will drive mobile traffic)',
        subtitle:
          'Open on your phone. Test Request Access. If broken on mobile, fix before sending the WhatsApp message.',
        tags: ['portal', 'time'],
        timeLabel: '~3 min',
      },
    ],
  },
  {
    id: 'u2',
    icon: '📂',
    title: 'Unit 2 · Upload Content to Portal Before Sending',
    meta: 'Daniel + Emmanuel · Content must exist on portal when staff click through',
    phaseId: 'p0',
    tasks: [
      {
        id: 'u2-t1',
        people: ['d'],
        title:
          'Upload the Afrivate Way (5 core values document) to portal Resources with "Requires acknowledgment" enabled',
        subtitle:
          'Go to /documents → Add resource → enable Requires acknowledgment toggle. This is your first tracked policy win.',
        tags: ['portal', 'critical', 'time'],
        timeLabel: '~10 min',
        link: '/documents',
        autoRule: 'doc_afrivate_way',
      },
      {
        id: 'u2-t2',
        people: ['d'],
        title: 'Upload the Leave Policy to portal Resources with "Requires acknowledgment" enabled',
        subtitle:
          'The memo says leave now goes through the portal only — the policy must exist there when staff read that directive.',
        tags: ['portal', 'critical', 'time'],
        timeLabel: '~10 min',
        link: '/documents',
        autoRule: 'doc_leave_policy',
      },
      {
        id: 'u2-t3',
        people: ['d'],
        title:
          'Post a welcome Memo on the portal (Announcements) type: HR Digest, mirroring the welcome-back email content',
        subtitle:
          'Go to /announcements → New Memo → type: HR digest. This means the memo lives in the portal permanently, not just in email.',
        tags: ['portal', 'time'],
        timeLabel: '~10 min',
        link: '/announcements',
        autoRule: 'welcome_hr_digest_memo',
      },
      {
        id: 'u2-t4',
        people: ['e'],
        title: 'Create the first monthly Pulse Survey in portal Surveys and set it to open today',
        subtitle:
          'Admin → HR dashboard → Surveys → New. 5 questions max: overall mood, workload, clarity, belonging, one open question. Launch immediately.',
        tags: ['portal', 'critical', 'time'],
        timeLabel: '~15 min',
        link: '/people/surveys',
        autoRule: 'active_pulse_survey',
      },
      {
        id: 'u2-t5',
        people: ['e', 'd'],
        title: `Assign Course 1 (${REVIVAL_ALISON_COURSE.title} — Alison) to all staff in Admin → HR dashboard → Learning`,
        subtitle:
          'Set due date as last day of the month. The Course of the Month email will reference this assignment.',
        tags: ['portal', 'time'],
        timeLabel: '~10 min',
        link: '/admin',
        autoRule: 'alison_course_assigned',
      },
    ],
  },
  {
    id: 'u3',
    icon: '📋',
    title: 'Unit 3 · Send the Official HR Memo Email',
    meta: 'Daniel · hr@afrivate.org → All Staff',
    phaseId: 'p1',
    tasks: [
      {
        id: 'u3-t1',
        people: ['d'],
        title:
          'Fill in all [bracketed placeholders] in the memo email (date, CEO name, HR name, town hall date, WhatsApp number, memo reference number)',
        subtitle: 'Do not send with any unfilled placeholders. Read the whole email once before sending.',
        tags: ['email', 'critical', 'time'],
        timeLabel: '~10 min',
      },
      {
        id: 'u3-t2',
        people: ['d'],
        title:
          'Send a test version of the email to yourself and Emmanuel first — check formatting, links, and that portal.afrivate.org link works',
        subtitle:
          'Check on both desktop and mobile. Confirm the email renders correctly before the full send.',
        tags: ['email', 'time'],
        timeLabel: '~5 min',
      },
      {
        id: 'u3-t3',
        people: ['e'],
        title: 'Emmanuel approves the final memo email before the send — reply "Approved" to Daniel\'s test email',
        subtitle: "Nothing goes to all staff without Emmanuel's final approval. This is the one gate on send day.",
        tags: ['critical', 'approval', 'time'],
        timeLabel: '~5 min',
      },
      {
        id: 'u3-t4',
        people: ['d'],
        title:
          'Send the memo from hr@afrivate.org to all staff. CC the CEO. BCC no one — this is a transparent communication.',
        subtitle:
          'Send Monday morning 8–9am. Subject: 📋 MEMO — Welcome to a New Era at AfriVate',
        tags: ['email', 'critical', 'time'],
        timeLabel: '~2 min',
      },
      {
        id: 'u3-t5',
        people: ['d'],
        title:
          'Note the exact time the email was sent and record it — you\'ll reference this when tracking who opened/replied',
        subtitle:
          'Create a simple note: "Memo sent: [time]. Replies received: [track here]." Update it throughout the day.',
        tags: ['time'],
        timeLabel: '~2 min',
      },
      {
        id: 'u3-t6',
        people: ['d'],
        title:
          'Monitor hr@afrivate.org actively for replies — respond to every reply personally within 2 hours on send day',
        subtitle:
          'The memo promises 24hr responses. Beating that on Day 1 sets the tone for everything. Keep the inbox open all day.',
        tags: ['email', 'critical'],
        timeLabel: 'All day',
      },
    ],
  },
  {
    id: 'u4',
    icon: '💬',
    title: 'Unit 4 · Send the WhatsApp Message',
    meta: 'Daniel or Emmanuel · Within 3 minutes of the email send',
    phaseId: 'p1',
    tasks: [
      {
        id: 'u4-t1',
        people: ['d'],
        title: 'Copy the WhatsApp message from the Revival Memo file and fill in the [time] placeholder',
        subtitle: 'The message is pre-written in the Memo Package document under the WhatsApp tab.',
        tags: ['whatsapp', 'time'],
        timeLabel: '~2 min',
      },
      {
        id: 'u4-t2',
        people: ['d'],
        title:
          'Send the WhatsApp message to the Afrivate team group — within 3 minutes of the email being sent',
        subtitle:
          'The email and WhatsApp must land close together. WhatsApp pulls eyes to the inbox while the email is still fresh.',
        tags: ['whatsapp', 'critical', 'time'],
        timeLabel: '~1 min',
      },
      {
        id: 'u4-t3',
        people: ['d'],
        title: 'Pin the WhatsApp message in the group so latecomers can find it',
        subtitle:
          'Long press the message → Pin → For 7 days. Anyone who opens the group later sees it immediately at the top.',
        tags: ['whatsapp', 'time'],
        timeLabel: '~1 min',
      },
      {
        id: 'u4-t4',
        people: ['o'],
        title:
          'Opemipo: monitor the WhatsApp group all day and flag any questions to Daniel — don\'t answer HR-policy questions yourself',
        subtitle:
          'Your job is to catch anything Daniel might miss and relay it. Keep a note of any questions that come in.',
        tags: ['whatsapp', 'time'],
        timeLabel: 'All day',
      },
    ],
  },
  {
    id: 'u5',
    icon: '📚',
    title: 'Unit 5 · Send the Course 1 Email',
    meta: 'Daniel · Send within 48 hours of the memo — ideally same day or next morning',
    phaseId: 'p2',
    tasks: [
      {
        id: 'u5-t1',
        people: ['d'],
        title: 'Open the L&D Calendar document and copy the Month 1 Course of the Month email template',
        subtitle: `Course: ${REVIVAL_ALISON_COURSE.title} on Alison. Link: ${REVIVAL_ALISON_COURSE.url}. Duration: ${REVIVAL_ALISON_COURSE.duration}.`,
        tags: ['email', 'time'],
        timeLabel: '~5 min',
      },
      {
        id: 'u5-t2',
        people: ['d'],
        title:
          'Fill in the placeholders (HR name, deadline date as last day of month, month number) and send from hr@afrivate.org',
        subtitle: '📚 [Month] L&D: Your course of the month is here',
        tags: ['email', 'time'],
        timeLabel: '~5 min',
      },
      {
        id: 'u5-t3',
        people: ['o'],
        title:
          'Opemipo: post a reminder about the course in the WhatsApp group the day after the email goes out',
        subtitle:
          'Short and warm: "Reminder — your first monthly course is live 📚. Check your email from hr@afrivate.org for the link. Easy and free!"',
        tags: ['whatsapp', 'time'],
        timeLabel: '~2 min',
      },
      {
        id: 'u5-t4',
        people: ['d'],
        title: "Confirm Course 1 is visible in each staff member's Learning tab on the portal (/people/learning)",
        subtitle:
          'Log into the portal and check that the assignment shows up. If anyone is missing it, manually assign from Admin → HR dashboard.',
        tags: ['portal', 'time'],
        timeLabel: '~10 min',
        link: '/people/learning',
        autoRule: 'alison_course_assigned',
      },
    ],
  },
  {
    id: 'u6',
    icon: '📅',
    title: 'Unit 6 · Book and Send the First Town Hall',
    meta: 'Emmanuel + Opemipo · Schedule within 2 weeks of the memo',
    phaseId: 'p2',
    tasks: [
      {
        id: 'u6-t1',
        people: ['e'],
        title:
          'Emmanuel: choose the date and time for the first town hall — within 14 days of memo send date',
        subtitle:
          'Aim for a weekday, 10am–12pm or 3pm–5pm. Avoid Mondays. Confirm the CEO is available on that date/time first.',
        tags: ['critical', 'time'],
        timeLabel: '~5 min',
      },
      {
        id: 'u6-t2',
        people: ['o'],
        title: 'Opemipo: create the Google Meet link and set up the calendar invite for all staff',
        subtitle:
          'Google Meet → New meeting → copy link. Google Calendar → New event → add all staff emails → paste Meet link in location field.',
        tags: ['time'],
        timeLabel: '~10 min',
      },
      {
        id: 'u6-t3',
        people: ['d'],
        title:
          'Daniel: post the town hall as an Event/Memo on the portal with date, time, Meet link, and the agenda',
        subtitle:
          'Agenda: CEO opens (5 min) → HR presents revival plan (10 min) → Portal walkthrough (10 min) → Open Q&A (15 min)',
        tags: ['portal', 'time'],
        timeLabel: '~10 min',
        link: '/events',
        autoRule: 'town_hall_posted',
      },
      {
        id: 'u6-t4',
        people: ['o'],
        title:
          'Opemipo: send a WhatsApp reminder about the town hall in the group — date, time, Meet link, and "attendance expected"',
        subtitle:
          'Short message. Include the Meet link directly in the WhatsApp so people can tap to join without hunting for the email.',
        tags: ['whatsapp', 'time'],
        timeLabel: '~3 min',
      },
      {
        id: 'u6-t5',
        people: ['o'],
        title:
          'Opemipo: send a calendar reminder email 24 hours before the town hall from hr@afrivate.org',
        subtitle:
          'Subject: "Reminder: Afrivate Town Hall tomorrow — [time] on Google Meet." Include the Meet link. Daniel confirms content before Opemipo sends.',
        tags: ['email', 'time'],
        timeLabel: '~5 min',
      },
    ],
  },
  {
    id: 'u7',
    icon: '🔑',
    title: 'Unit 7 · Portal Registration Follow-Up',
    meta: 'Daniel + Opemipo · Run on Day 3 after memo send',
    phaseId: 'p3',
    tasks: [
      {
        id: 'u7-t1',
        people: ['d'],
        title:
          'Daniel: check Admin → Directory on Day 3 — how many of [total staff] have registered on the portal?',
        subtitle:
          'Record: X registered out of Y total. Target: 80%+ by Day 7. Anything below 50% by Day 3 = urgent follow-up needed.',
        tags: ['portal', 'time'],
        timeLabel: '~5 min',
        link: '/admin',
        autoRule: 'portal_registrations_majority',
      },
      {
        id: 'u7-t2',
        people: ['d'],
        title:
          'Send a WhatsApp Day 3 update: "X of you have signed up on the portal so far 💚 — [Y] remaining. 4 days left. portal.afrivate.org → Request Access"',
        subtitle:
          'The count creates social proof. Keep the tone warm, not threatening. This nudge typically converts 30-40% of holdouts.',
        tags: ['whatsapp', 'time'],
        timeLabel: '~3 min',
      },
      {
        id: 'u7-t3',
        people: ['o'],
        title:
          'Opemipo: compile the list of staff who have NOT yet registered — share it privately with Daniel (not in the group)',
        subtitle:
          'Go to Admin → Directory → filter for pending/not approved. Create a simple list: Name | Email | Status.',
        tags: ['portal', 'time'],
        timeLabel: '~10 min',
        link: '/admin',
      },
      {
        id: 'u7-t4',
        people: ['d'],
        title:
          'Daniel: send a personal WhatsApp DM to each non-registrant — not a group message — warm and helpful in tone',
        subtitle:
          'Hey [Name], just checking in — any trouble getting onto the portal? Happy to help sort it. Here\'s the link: portal.afrivate.org 💚',
        tags: ['whatsapp', 'time'],
        timeLabel: '~15 min',
      },
    ],
  },
  {
    id: 'u8',
    icon: '📊',
    title: 'Unit 8 · Pulse Survey — Monitor & Nudge',
    meta: 'Opemipo monitors · Daniel nudges · Run across first week',
    phaseId: 'p3',
    tasks: [
      {
        id: 'u8-t1',
        people: ['o'],
        title:
          'Opemipo: check the Pulse Survey response rate in portal Surveys every 2 days while the survey is open',
        subtitle:
          'Go to /people/surveys → check responses count. If below 70% of active users by midmonth, tell Daniel immediately.',
        tags: ['portal', 'time'],
        timeLabel: '~3 min / check',
        link: '/people/surveys',
      },
      {
        id: 'u8-t2',
        people: ['d'],
        title:
          'Daniel: if response rate drops below 70% midmonth, include a survey reminder in the next HR digest and a WhatsApp nudge',
        subtitle:
          'The monthly pulse survey is still open on the portal — takes 2 minutes. Your voice shapes how we run Afrivate 💚',
        tags: ['whatsapp', 'time'],
        timeLabel: '~5 min',
      },
      {
        id: 'u8-t3',
        people: ['d'],
        title:
          'Daniel: DO NOT close the pulse survey yourself — Emmanuel closes it at month end and reviews the results',
        subtitle:
          'This is explicitly in your guide. Survey close = Emmanuel only. Your job is monitoring and nudging, not closing.',
        tags: ['critical'],
      },
    ],
  },
  {
    id: 'u9',
    icon: '📈',
    title: 'Unit 9 · Pull the Week 1 Revival Report',
    meta: 'Daniel compiles · Emmanuel presents to CEO',
    phaseId: 'p4',
    tasks: [
      {
        id: 'u9-t1',
        people: ['d'],
        title:
          'Daniel: record Metric 1 — Portal registrations: how many of [total staff] have registered and been approved?',
        subtitle: 'Source: Admin → Directory → count active users. Target: 80%+. Log the number.',
        tags: ['portal', 'time'],
        timeLabel: '~3 min',
        link: '/admin',
        autoRule: 'portal_registrations_target',
      },
      {
        id: 'u9-t2',
        people: ['d'],
        title:
          'Daniel: record Metric 2 — Course assignment: is Course 1 showing in the Learning tab for all active staff?',
        subtitle: 'Admin → HR dashboard → Learning. Note: [X] assigned, [Y] submitted certificates so far.',
        tags: ['portal', 'time'],
        timeLabel: '~3 min',
        link: '/admin',
        autoRule: 'alison_course_assigned',
      },
      {
        id: 'u9-t3',
        people: ['d'],
        title:
          'Daniel: record Metric 3 — Afrivate Way acknowledgments: how many staff have acknowledged the values document?',
        subtitle:
          'Portal → /documents (Resources) → Afrivate Way → view acknowledgment count. Target: should be climbing from Day 1.',
        tags: ['portal', 'time'],
        timeLabel: '~3 min',
        link: '/documents',
        autoRule: 'doc_afrivate_way',
      },
      {
        id: 'u9-t4',
        people: ['d'],
        title:
          'Daniel: record Metric 4 — Email replies: how many people replied to the memo? What were the themes?',
        subtitle:
          'Check hr@afrivate.org sent/received thread. Group replies by theme: questions, excitement, concerns. No names in the report.',
        tags: ['email', 'time'],
        timeLabel: '~10 min',
      },
      {
        id: 'u9-t5',
        people: ['d', 'e'],
        title:
          'Daniel compiles all 4 metrics into a 1-page summary and sends to Emmanuel — Emmanuel shares with CEO the same day',
        subtitle:
          'Format: "Week 1 Revival Report · [Date] · Portal: X/Y · Course: assigned ✓ · Values acks: X · Replies: X (themes: ...)". This is the first HR leadership report.',
        tags: ['critical', 'time'],
        timeLabel: '~15 min',
      },
    ],
  },
  {
    id: 'u10',
    icon: '📰',
    title: 'Unit 10 · Write and Send the First HR Digest',
    meta: 'Daniel writes · Opemipo sends · Due: end of Week 2',
    phaseId: 'p5',
    tasks: [
      {
        id: 'u10-t1',
        people: ['d'],
        title: 'Daniel: write the first HR Digest content using the HR Digest email template (already built)',
        subtitle:
          'Sections: Announcements, Celebrations this fortnight (any birthdays?), Course of the Month reminder, Afrivate Spotlight (choose one person), Upcoming dates (town hall). Keep it under 400 words total.',
        tags: ['email', 'time'],
        timeLabel: '~30 min',
      },
      {
        id: 'u10-t2',
        people: ['d'],
        title: 'Daniel: share the draft digest with Emmanuel for review before it goes to all staff',
        subtitle:
          'Send the draft to Emmanuel\'s personal email with subject "DRAFT: HR Digest [date] — please review." Give Emmanuel 24hrs to respond.',
        tags: ['time'],
        timeLabel: '~2 min',
      },
      {
        id: 'u10-t3',
        people: ['o'],
        title:
          'Opemipo: once approved, send the digest from hr@afrivate.org to all staff using the Digest email template',
        subtitle:
          'Daniel gives Opemipo the final text. Opemipo copies it into Gmail, sends to all staff, then confirms back to Daniel it\'s sent.',
        tags: ['email', 'time'],
        timeLabel: '~10 min',
      },
      {
        id: 'u10-t4',
        people: ['o'],
        title: 'Opemipo: post the same digest content as a Memo on the portal — type: HR Digest',
        subtitle:
          'Portal → /announcements → New Memo → set type to "HR digest" → paste content → Publish. Confirm to Daniel once done.',
        tags: ['portal', 'time'],
        timeLabel: '~10 min',
        link: '/announcements',
        autoRule: 'hr_digest_memo',
      },
      {
        id: 'u10-t5',
        people: ['d'],
        title:
          'Daniel: set a recurring calendar reminder — "Write HR Digest" every 2 weeks, 3 days before the send date',
        subtitle:
          'The digest must never be late. Build the writing time into your calendar now, not the week it\'s due.',
        tags: ['time'],
        timeLabel: '~3 min · Set it once',
      },
    ],
  },
  {
    id: 'u11',
    icon: '🤝',
    title: 'Unit 11 · Set Up Monthly Manager 1:1s',
    meta: 'Emmanuel directs · Opemipo schedules · Within Week 2',
    phaseId: 'p5',
    tasks: [
      {
        id: 'u11-t1',
        people: ['e'],
        title: 'Emmanuel: confirm the list of all managers and who reports to each of them',
        subtitle:
          'Pull this from Admin → Directory. Every manager should have at least one direct report assigned. Fix any gaps.',
        tags: ['portal', 'time'],
        timeLabel: '~10 min',
        link: '/admin',
        autoRule: 'staff_directory_complete',
      },
      {
        id: 'u11-t2',
        people: ['e'],
        title:
          'Emmanuel: brief every manager by WhatsApp or email — "Monthly 1:1s are now required. Please schedule your first one this week. Log it in portal Growth → 1:1 after."',
        subtitle:
          'Send personally to each manager, not a group blast. Managers respond differently when addressed directly.',
        tags: ['whatsapp', 'time'],
        timeLabel: '~10 min',
      },
      {
        id: 'u11-t3',
        people: ['o'],
        title:
          'Opemipo: set up recurring monthly calendar invites (Google Meet) between each manager and their reports',
        subtitle:
          'Opemipo gets the list from Emmanuel, creates one recurring 30-min Meet event per manager-report pair. Monthly, same slot each month.',
        tags: ['time'],
        timeLabel: '~20 min total',
      },
      {
        id: 'u11-t4',
        people: ['d'],
        title:
          'Daniel: check Admin → HR dashboard at month end — which managers have logged their 1:1s in Growth?',
        subtitle:
          'Target: 90% completion. Anyone who hasn\'t logged gets a personal nudge from Daniel — not a group reminder.',
        tags: ['portal', 'time'],
        timeLabel: '~5 min',
        link: '/admin',
      },
    ],
  },
  {
    id: 'u12',
    icon: '🌟',
    title: 'Unit 12 · Launch Peer Recognition (Shout-outs)',
    meta: 'Daniel seeds it · Opemipo helps · Do this Week 1',
    phaseId: 'p5',
    tasks: [
      {
        id: 'u12-t1',
        people: ['d'],
        title:
          'Daniel: post the first shout-out on the portal yourself — recognise someone genuinely, link it to an Afrivate Way value',
        subtitle:
          'Portal → /people/shout-outs → New shout-out. Be specific. "Shout-out to [Name] for [specific thing they did] — that\'s what Rise Together looks like." This seeds the culture.',
        tags: ['portal', 'time'],
        timeLabel: '~5 min',
        link: '/people/shout-outs',
        autoRule: 'recognition_by_daniel',
      },
      {
        id: 'u12-t2',
        people: ['o'],
        title:
          'Opemipo: post a message in the team WhatsApp pointing to the Shout-outs section — "Go nominate a colleague who deserves recognition this week 🌟"',
        subtitle:
          'Keep it light and fun. Include the portal link. This is how the recognition culture starts — someone has to go first.',
        tags: ['whatsapp', 'time'],
        timeLabel: '~2 min',
      },
      {
        id: 'u12-t3',
        people: ['d'],
        title:
          'Daniel: track shout-out volume in the first month — target is 3+ per month. Feature shout-out highlights in the bi-weekly digest.',
        subtitle:
          'If nobody posts after a week, reach out personally to 2–3 team leads and ask them to post one. Culture needs seeding, not waiting.',
        tags: ['portal', 'time'],
        timeLabel: 'Ongoing',
        autoRule: 'recognition_volume_3',
      },
    ],
  },
]

export const REVIVAL_LAUNCH_TASKS = REVIVAL_LAUNCH_UNITS.flatMap((u) => u.tasks)

export const REVIVAL_AUTO_RULES: Record<string, RevivalAutoRule | undefined> = Object.fromEntries(
  REVIVAL_LAUNCH_TASKS.map((t) => [t.id, t.autoRule]),
)

export function taskMatchesPersonFilter(task: RevivalLaunchTask, filter: RevivalPerson | 'all'): boolean {
  if (filter === 'all') return true
  return task.people.includes(filter)
}
