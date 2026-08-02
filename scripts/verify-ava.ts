/**
 * Offline verification of AVA parse + local guidance (no browser / Gemini).
 * Run: npx tsx --tsconfig tsconfig.app.json scripts/verify-ava.ts
 */
import { localAvaRespond } from '../src/lib/ava/localFallback'
import { normalizeAvaDisplayText, parseAvaModelText } from '../src/lib/ava/parseResponse'
import type { AvaUserContext } from '../src/lib/ava/types'

let failed = 0

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1
    console.error('FAIL:', msg)
  } else {
    console.log('OK:', msg)
  }
}

const ctx: AvaUserContext = {
  userId: 'u1',
  name: 'Test User',
  role: 'staff',
  department: 'Operations',
  personal: {
    openTasks: 2,
    overdueTasks: 0,
    pendingLeave: 0,
    recentLeave: [],
    learningPending: 1,
    openSurveys: 1,
    checkInThisWeek: false,
    myInfoCompleteness: 80,
  },
}

// --- Truncated Gemini JSON (real failure mode) ---
const truncated = `{
"reply": "To request leave, please submit through the Portal.\\n\\n1. Go to People.\\n2. Select Time off.",
"citations": [
"Leave and Absence Policy"
],
"links": [
{
"label": "People -> Time off
`
const parsedTrunc = parseAvaModelText(truncated, 'gemini')
assert(!parsedTrunc.reply.trim().startsWith('{'), 'truncated JSON does not show raw envelope')
assert(parsedTrunc.reply.includes('Time off'), 'truncated JSON extracts leave reply')
assert(parsedTrunc.citations?.includes('Leave and Absence Policy'), 'truncated JSON extracts citations')
assert(parsedTrunc.links?.[0]?.path === '/people/leave', 'truncated JSON recovers Time off link')

// --- Valid JSON with draft action must be stripped ---
const withDraft = JSON.stringify({
  reply: 'I will submit leave for you.',
  suggestedActions: [
    {
      type: 'draft_leave',
      label: 'Submit leave',
      payload: {
        leaveType: 'annual',
        startDate: '2026-08-10',
        endDate: '2026-08-11',
        reason: 'x',
      },
    },
    { type: 'navigate', label: 'Go to Time off', path: '/people/leave' },
  ],
})
const parsedDraft = parseAvaModelText(withDraft, 'gemini')
assert(
  !parsedDraft.suggestedActions?.some((a) => (a as { type: string }).type !== 'navigate'),
  'draft_leave action is rejected',
)
assert(
  parsedDraft.suggestedActions?.some((a) => a.type === 'navigate' && a.path === '/people/leave'),
  'navigate action is kept',
)

// --- Markdown bold envelope normalize ---
const rawStored = `{"reply":"Use **People → Time off** to request leave.","links":[{"label":"Time off","path":"/people/leave"}]}`
assert(
  normalizeAvaDisplayText(rawStored).includes('People → Time off') &&
    !normalizeAvaDisplayText(rawStored).startsWith('{'),
  'normalize recovers reply from stored JSON bubble',
)

// --- Local FAQ paths ---
const leave = localAvaRespond([{ role: 'user', content: 'How do I request leave?' }], ctx)
assert(leave.links?.some((l) => l.path === '/people/leave'), 'local leave links to /people/leave')
assert(
  leave.suggestedActions?.every((a) => a.type === 'navigate'),
  'local leave actions are navigate-only',
)
assert(/cannot submit leave/i.test(leave.reply), 'local leave states AVA cannot submit')

const learning = localAvaRespond(
  [{ role: 'user', content: 'Where do I submit my Alison certificate?' }],
  ctx,
)
assert(learning.suggestedActions?.[0]?.path === '/people/learning', 'local learning navigates')

const checkin = localAvaRespond(
  [{ role: 'user', content: 'How do I submit my weekly check-in?' }],
  ctx,
)
assert(checkin.suggestedActions?.[0]?.path === '/checkin', 'local check-in navigates')
assert(!/draft_checkin/i.test(JSON.stringify(checkin)), 'no draft_checkin in local check-in')

const tasks = localAvaRespond([{ role: 'user', content: 'What are my open tasks?' }], ctx)
assert(tasks.suggestedActions?.[0]?.path === '/tasks', 'local tasks navigates')

const slack = localAvaRespond([{ role: 'user', content: 'What is the four-hour Slack rule?' }], ctx)
assert(/four \(4\) hours/i.test(slack.reply), 'local Slack rule answer')

const hrCtx: AvaUserContext = {
  ...ctx,
  role: 'hr',
  hr: {
    pendingApprovals: 2,
    pendingLeaveOrg: 1,
    activePips: 0,
    pendingDiscipline: 0,
    pendingLearningReviews: 1,
  },
}
const hr = localAvaRespond([{ role: 'user', content: 'Where do I review approvals?' }], hrCtx)
assert(hr.suggestedActions?.[0]?.path === '/admin', 'HR guidance navigates to Admin')
assert(/never completes/i.test(hr.reply), 'HR guidance states AVA never completes actions')

if (failed) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll AVA offline checks passed.')
