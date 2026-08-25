/**
 * Offline verification of AVA parse + local guidance (no browser / Gemini).
 * Run: npx tsx --tsconfig tsconfig.app.json scripts/verify-ava.ts
 */
import { localAvaRespond } from '../src/lib/ava/localFallback'
import {
  applyAvaSuggestedActions,
  peekAvaDraft,
  sanitizeSuggestedActions,
} from '../src/lib/ava/avaDrafts'
import { normalizeAvaDisplayText, parseAvaModelText } from '../src/lib/ava/parseResponse'
import { draftsOfKind, isNotePayload, isTaskPayload, readComposerDraftsStore } from '../src/lib/composerDrafts'
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
  !parsedDraft.suggestedActions?.some((a) => (a as { type: string }).type === 'draft_leave'),
  'draft_leave action is rejected',
)
assert(
  parsedDraft.suggestedActions?.some((a) => a.type === 'navigate' && a.path === '/people/leave'),
  'navigate action is kept',
)

const withInsert = JSON.stringify({
  reply: 'I inserted a weekly update draft. Review it, then send it yourself.',
  suggestedActions: [
    {
      type: 'insert_draft',
      label: 'Review weekly update draft',
      path: '/checkin',
      kind: 'weekly_update',
      mode: 'insert',
      fields: {
        completed: 'Shipped the mobile layout.',
        nextWeek: 'QA the AVA drafts.',
        blockers: 'None',
        hoursWorked: '40',
      },
    },
    {
      type: 'submit',
      label: 'Submit check-in',
      path: '/checkin',
    },
  ],
})
const parsedInsert = parseAvaModelText(withInsert, 'gemini')
assert(
  parsedInsert.suggestedActions?.some(
    (a) =>
      a.type === 'insert_draft' &&
      a.kind === 'weekly_update' &&
      a.fields.completed.includes('mobile'),
  ),
  'insert_draft weekly update is kept',
)
assert(
  !parsedInsert.suggestedActions?.some((a) => a.type !== 'navigate' && a.type !== 'insert_draft'),
  'submit action is rejected',
)

const strippedDone = sanitizeSuggestedActions([
  {
    type: 'insert_draft',
    label: 'Review task draft',
    path: '/tasks',
    kind: 'task',
    mode: 'insert',
    fields: { title: 'Write report', status: 'done' },
  },
])
assert(
  strippedDone?.[0]?.type === 'insert_draft' &&
    strippedDone[0].kind === 'task' &&
    strippedDone[0].fields.status === 'todo',
  'task insert_draft cannot be marked done',
)

assert(
  !sanitizeSuggestedActions([{ type: 'approve', label: 'Approve leave', path: '/admin' }])?.length,
  'approve action is rejected',
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

const draftUpdate = localAvaRespond(
  [{ role: 'user', content: 'Help me draft my weekly update: shipped the portal mobile pass' }],
  ctx,
)
assert(
  draftUpdate.suggestedActions?.some(
    (a) => a.type === 'insert_draft' && a.kind === 'weekly_update',
  ),
  'local weekly draft inserts a form draft',
)
assert(/cannot send|review/i.test(draftUpdate.reply), 'local weekly draft reminds user to submit')

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
assert(
  tasks.suggestedActions?.every((a) => a.type === 'navigate'),
  'open-tasks question stays navigate-only',
)

const createTask = localAvaRespond(
  [{ role: 'user', content: 'Help me create a task titled Prepare onboarding kit due 2026-08-28' }],
  ctx,
)
assert(
  createTask.suggestedActions?.some(
    (a) =>
      a.type === 'insert_draft' &&
      a.kind === 'task' &&
      a.fields.title.toLowerCase().includes('onboarding') &&
      a.fields.dueDate === '2026-08-28',
  ),
  'create-task request inserts a task draft with title and due date',
)

const multiTasks = localAvaRespond(
  [
    {
      role: 'user',
      content: 'Help me create tasks titled Prep kit, Call vendor, and Write report',
    },
  ],
  ctx,
)
assert(
  multiTasks.suggestedActions?.filter(
    (a) => a.type === 'insert_draft' && a.kind === 'task',
  ).length === 3,
  'multiple task titles produce multiple insert_draft actions',
)

const noteDrafts = localAvaRespond(
  [{ role: 'user', content: 'Draft notes titled Standup agenda and Onboarding FAQ' }],
  ctx,
)
assert(
  noteDrafts.suggestedActions?.filter((a) => a.type === 'insert_draft' && a.kind === 'note')
    .length === 2,
  'multiple note titles produce multiple note drafts',
)

const noteKind = sanitizeSuggestedActions([
  {
    type: 'insert_draft',
    label: 'Review note draft',
    path: '/notes',
    kind: 'note',
    mode: 'insert',
    fields: { title: 'Kickoff', text: 'Agenda and owners' },
  },
])
assert(
  noteKind?.[0]?.type === 'insert_draft' &&
    noteKind[0].kind === 'note' &&
    noteKind[0].fields.title === 'Kickoff' &&
    noteKind[0].fields.body === 'Agenda and owners',
  'note insert_draft aliases body from text',
)

const aliasedTask = sanitizeSuggestedActions([
  {
    type: 'insert_draft',
    label: 'Review task draft',
    path: '/tasks',
    kind: 'task',
    mode: 'insert',
    fields: { name: 'Write report', due: '2026-08-28T12:00:00.000Z' },
  },
])
assert(
  aliasedTask?.[0]?.type === 'insert_draft' &&
    aliasedTask[0].fields.title === 'Write report' &&
    aliasedTask[0].fields.dueDate === '2026-08-28',
  'task field aliases and ISO due dates are normalized',
)

const truncatedInsert = `{
"reply": "I have inserted a task draft. Review it, then create it yourself.",
"suggestedActions": [
{
"type": "insert_draft",
"label": "Review task draft",
"path": "/tasks",
"kind": "task",
"mode": "insert",
"fields": {"title": "Prepare kit", "dueDate": "2026-08-28"}
}
]
}`
const parsedTruncInsert = parseAvaModelText(truncatedInsert, 'gemini')
assert(
  parsedTruncInsert.suggestedActions?.some(
    (a) => a.type === 'insert_draft' && a.kind === 'task' && a.fields.title === 'Prepare kit',
  ),
  'truncated JSON still recovers insert_draft actions',
)

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

const leaveNamedTask = localAvaRespond(
  [{ role: 'user', content: 'Help me create a task titled Leave handover' }],
  ctx,
)
assert(
  leaveNamedTask.suggestedActions?.some(
    (a) => a.type === 'insert_draft' && a.kind === 'task' && /handover/i.test(a.fields.title),
  ),
  'task titled Leave handover is a task draft, not a leave draft',
)

const multiJson = JSON.stringify({
  reply: 'I saved two task drafts.',
  suggestedActions: [
    {
      type: 'insert_draft',
      label: 'Review task: A',
      path: '/tasks',
      kind: 'task',
      mode: 'insert',
      fields: { title: 'Task A' },
    },
    {
      type: 'insert_draft',
      label: 'Review task: B',
      path: '/tasks',
      kind: 'task',
      mode: 'insert',
      fields: { title: 'Task B' },
    },
  ],
})
const parsedMulti = parseAvaModelText(multiJson, 'gemini')
assert(
  parsedMulti.suggestedActions?.filter((a) => a.type === 'insert_draft' && a.kind === 'task').length === 2,
  'parser keeps multiple insert_draft actions',
)

function memoryStorage() {
  const mem = new Map<string, string>()
  return {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => {
      mem.set(k, String(v))
    },
    removeItem: (k: string) => {
      mem.delete(k)
    },
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size
    },
  }
}
const localStorage = memoryStorage()
const sessionStorage = memoryStorage()
const win = {
  localStorage,
  sessionStorage,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
}
Object.defineProperty(globalThis, 'window', { value: win, configurable: true })
Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorage, configurable: true })

const persisted = applyAvaSuggestedActions([
  {
    type: 'insert_draft',
    label: 'Review task: Kit',
    path: '/tasks',
    kind: 'task',
    mode: 'insert',
    fields: { title: 'Kit', dueDate: '2026-08-28' },
  },
  {
    type: 'insert_draft',
    label: 'Review task: Vendor',
    path: '/tasks',
    kind: 'task',
    mode: 'insert',
    fields: { title: 'Vendor' },
  },
  {
    type: 'insert_draft',
    label: 'Review note: Agenda',
    path: '/notes',
    kind: 'note',
    mode: 'insert',
    fields: { title: 'Agenda', body: 'Stand-up notes' },
  },
])
const store = readComposerDraftsStore()
const taskDrafts = draftsOfKind(store, 'task')
const noteDraftsStore = draftsOfKind(store, 'note')
assert(taskDrafts.length === 2, 'applyInsertDraft saves multiple task drafts to composer store')
assert(taskDrafts.every((d) => isTaskPayload(d.payload)), 'saved task drafts have task payloads')
assert(noteDraftsStore.length === 1 && isNotePayload(noteDraftsStore[0].payload), 'applyInsertDraft saves a note draft')
assert(!peekAvaDraft('task'), 'task insert does not open a one-shot form draft')
assert(
  persisted?.every((a) => a.type !== 'insert_draft' || a.path.startsWith('/')),
  'applied drafts keep review paths',
)

const weeklyPersist = applyAvaSuggestedActions([
  {
    type: 'insert_draft',
    label: 'Review weekly update draft',
    path: '/checkin',
    kind: 'weekly_update',
    mode: 'insert',
    fields: { completed: 'Shipped drafts', nextWeek: 'QA', hoursWorked: '40' },
  },
])
assert(
  weeklyPersist?.[0]?.type === 'insert_draft' && peekAvaDraft('weekly_update')?.fields.completed === 'Shipped drafts',
  'weekly insert still fills the live form draft',
)

if (failed) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll AVA offline checks passed.')
