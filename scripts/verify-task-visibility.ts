/**
 * Task visibility rules for admins, team leads, and everyone else.
 * Run: npx tsx --tsconfig tsconfig.app.json scripts/verify-task-visibility.ts
 */
import assert from 'node:assert/strict'
import { mayNotifyAboutTask, userCanSeeTask } from '../src/utils/helpers.ts'
import type { Task, User, WorkspaceTeam } from '../src/types/index.ts'

const admin: User = user('admin', 'admin')
const leadA: User = user('lead-a', 'staff')
const memberA: User = user('member-a', 'staff')
const leadB: User = user('lead-b', 'team_lead')
const memberB: User = user('member-b', 'staff')
const outsider: User = user('outsider', 'hr')

const teams: WorkspaceTeam[] = [
  {
    id: 'team-a',
    name: 'Alpha',
    memberIds: [memberA.id],
    leadUserId: leadA.id,
  },
  {
    id: 'team-b',
    name: 'Beta',
    memberIds: [memberB.id, leadB.id],
    leadUserId: leadB.id,
    asstLeadUserId: outsider.id,
  },
]

const adminTask = task('t-admin', admin.id)
const alphaTask = task('t-alpha', memberA.id)
const betaTask = task('t-beta', memberB.id)
const sharedTask = task('t-shared', memberB.id, [memberA.id])
const leadTask = task('t-lead', leadA.id)

const viewers = [admin, leadA, memberA, leadB, memberB, outsider]

function sees(viewer: User, item: Task): boolean {
  return userCanSeeTask(item, viewer, teams)
}

assert.equal(sees(admin, adminTask), true)
assert.equal(sees(admin, alphaTask), true)
assert.equal(sees(admin, betaTask), true)
assert.equal(sees(admin, sharedTask), true)

assert.equal(sees(leadA, leadTask), true, 'lead sees their own task')
assert.equal(sees(leadA, alphaTask), true, 'lead sees a task owned by their team')
assert.equal(sees(leadA, sharedTask), true, 'lead sees a task assigned to their team')
assert.equal(sees(leadA, betaTask), false, 'lead does not see another team')
assert.equal(sees(leadA, adminTask), false)

assert.equal(sees(memberA, alphaTask), true)
assert.equal(sees(memberA, sharedTask), true, 'assignee sees the task')
assert.equal(sees(memberA, betaTask), false)
assert.equal(sees(memberA, leadTask), false)
assert.equal(sees(memberA, adminTask), false)

assert.equal(sees(leadB, betaTask), true)
assert.equal(sees(leadB, sharedTask), true)
assert.equal(sees(leadB, alphaTask), false)

assert.equal(sees(memberB, betaTask), true)
assert.equal(sees(memberB, sharedTask), true)
assert.equal(sees(memberB, alphaTask), false)

assert.equal(sees(outsider, betaTask), true, 'assistant lead sees a task owned by their team')
assert.equal(sees(outsider, sharedTask), true, 'assistant lead sees a task whose owner is on their team')
assert.equal(sees(outsider, alphaTask), false, 'hr who does not lead that team cannot see it')

assert.equal(
  mayNotifyAboutTask(memberA.id, sharedTask, viewers, teams),
  true,
  'assignee can be notified',
)
assert.equal(
  mayNotifyAboutTask(memberA.id, betaTask, viewers, teams),
  false,
  'a mention does not notify someone who cannot open the task',
)

console.log('task visibility checks passed')

function user(id: string, role: User['role']): User {
  return {
    id,
    email: `${id}@afrivate.test`,
    name: id,
    role,
    department: 'Operations',
    jobTitle: 'Staff',
    joinedAt: '2024-01-01',
    active: true,
  }
}

function task(id: string, ownerId: string, assigneeIds: string[] = []): Task {
  return {
    id,
    ownerId,
    assigneeIds,
    assigneeId: assigneeIds[0],
    title: id,
    status: 'todo',
    priority: 'medium',
    category: 'general',
    activity: [],
    createdAt: '2026-10-13T00:00:00.000Z',
    updatedAt: '2026-10-13T00:00:00.000Z',
  }
}
