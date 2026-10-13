import { expect, test, type Page } from '@playwright/test'

const PASSWORD = 'TestPass1!'

const ADMIN = person('vis-admin', 'Ada Admin', 'admin')
const LEAD_A = person('vis-lead-a', 'Leo Lead', 'staff')
const MEMBER_A = person('vis-member-a', 'Mia Member', 'staff')
const LEAD_B = person('vis-lead-b', 'Bo Lead', 'team_lead')
const MEMBER_B = person('vis-member-b', 'Bea Member', 'staff')

const USERS = [ADMIN, LEAD_A, MEMBER_A, LEAD_B, MEMBER_B]
const today = new Date().toISOString()

const TASKS = [
  item('t-admin', 'Admin only roadmap', ADMIN.id),
  item('t-alpha', 'Alpha sprint', MEMBER_A.id),
  item('t-beta', 'Beta launch', MEMBER_B.id, [], today),
  item('t-shared', 'Shared with Alpha', MEMBER_B.id, [MEMBER_A.id], today),
  item('t-lead', 'Lead personal note', LEAD_A.id),
]

const TEAMS = [
  {
    id: 'team-a',
    name: 'Alpha',
    memberIds: [MEMBER_A.id],
    leadUserId: LEAD_A.id,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'team-b',
    name: 'Beta',
    memberIds: [MEMBER_B.id],
    leadUserId: LEAD_B.id,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ users, tasks, teams }) => {
      localStorage.setItem('av-last-activity-at', String(Date.now()))
      if (localStorage.getItem('av-visibility-seeded') === '1') return
      localStorage.setItem('av-users', JSON.stringify(users))
      localStorage.setItem('av-tasks', JSON.stringify(tasks))
      localStorage.setItem('av-teams', JSON.stringify(teams))
      localStorage.setItem('av-inbox', JSON.stringify([]))
      localStorage.setItem('av-visibility-seeded', '1')
    },
    { users: USERS, tasks: TASKS, teams: TEAMS },
  )
})

test('each role sees only the tasks they are allowed to see', async ({ page }) => {
  await login(page, ADMIN)
  await page.goto('/tasks')
  const adminFocus = page.getByLabel('Focus')
  await expect(adminFocus).toHaveValue('all')
  await expect(adminFocus.locator('option')).toHaveText([
    'All tasks',
    'Related to me',
    'I own',
    'Assigned to me',
  ])
  for (const title of ['Admin only roadmap', 'Alpha sprint', 'Beta launch', 'Shared with Alpha', 'Lead personal note']) {
    await expect(page.getByText(title, { exact: true })).toBeVisible()
  }
  await page.goto('/')
  await expect(dueTodayValue(page)).toHaveText('2')

  await login(page, LEAD_A)
  await page.goto('/tasks')
  const leadFocus = page.getByLabel('Focus')
  await expect(leadFocus).toHaveValue('mine')
  await expect(leadFocus.locator('option')).toHaveText([
    'My team',
    'Related to me',
    'I own',
    'Assigned to me',
  ])
  await expect(page.getByText('Lead personal note', { exact: true })).toBeVisible()
  await expect(page.getByText('Alpha sprint', { exact: true })).toHaveCount(0)
  await leadFocus.selectOption('team')
  await expect(page.getByText('Alpha sprint', { exact: true })).toBeVisible()
  await expect(page.getByText('Shared with Alpha', { exact: true })).toBeVisible()
  await expect(page.getByText('Lead personal note', { exact: true })).toBeVisible()
  await expect(page.getByText('Beta launch', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Admin only roadmap', { exact: true })).toHaveCount(0)
  await page.goto('/search?q=Beta%20launch')
  await expect(page.getByRole('link', { name: 'Beta launch' })).toHaveCount(0)
  await page.goto('/search?q=Alpha%20sprint')
  await expect(page.getByRole('link', { name: 'Alpha sprint' })).toBeVisible()
  await page.goto('/')
  await expect(dueTodayValue(page)).toHaveText('1')

  await login(page, MEMBER_A)
  await page.goto('/tasks')
  const memberFocus = page.getByLabel('Focus')
  await expect(memberFocus).toHaveValue('mine')
  await expect(memberFocus.locator('option')).toHaveText(['Related to me', 'I own', 'Assigned to me'])
  await expect(page.getByText('Alpha sprint', { exact: true })).toBeVisible()
  await expect(page.getByText('Shared with Alpha', { exact: true })).toBeVisible()
  await expect(page.getByText('Beta launch', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Lead personal note', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Admin only roadmap', { exact: true })).toHaveCount(0)
  await page.goto('/')
  await expect(dueTodayValue(page)).toHaveText('1')

  await login(page, MEMBER_B)
  await page.goto('/tasks')
  await expect(page.getByText('Beta launch', { exact: true })).toBeVisible()
  await expect(page.getByText('Shared with Alpha', { exact: true })).toBeVisible()
  await expect(page.getByText('Alpha sprint', { exact: true })).toHaveCount(0)

  await login(page, LEAD_B)
  await page.goto('/tasks')
  await page.getByLabel('Focus').selectOption('team')
  await expect(page.getByText('Beta launch', { exact: true })).toBeVisible()
  await expect(page.getByText('Shared with Alpha', { exact: true })).toBeVisible()
  await expect(page.getByText('Alpha sprint', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Admin only roadmap', { exact: true })).toHaveCount(0)
})

test('assigning a task shows it at once, and edit and delete still work', async ({ page }) => {
  await login(page, MEMBER_A)
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'New task' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title').fill('Fresh assignment')
  for (const name of ['Ada Admin', 'Leo Lead', 'Mia Member', 'Bo Lead', 'Bea Member']) {
    await expect(dialog.locator('label').filter({ hasText: name })).toBeVisible()
  }
  await dialog.locator('label').filter({ hasText: 'Bea Member' }).locator('input[type="checkbox"]').check()
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await page.getByRole('button', { name: 'Create task' }).click()
  await expect(page.getByText('Fresh assignment', { exact: true })).toBeVisible()
  await page.waitForFunction(() => (localStorage.getItem('av-tasks') ?? '').includes('Fresh assignment'))

  await login(page, MEMBER_B)
  await page.goto('/tasks')
  await expect(page.getByText('Fresh assignment', { exact: true })).toBeVisible()
  await page.goto('/inbox')
  await expect(page.getByText('Fresh assignment', { exact: true })).toBeVisible()

  await login(page, LEAD_A)
  await page.goto('/tasks')
  await page.getByLabel('Focus').selectOption('team')
  await expect(page.getByText('Fresh assignment', { exact: true })).toBeVisible()

  await login(page, MEMBER_A)
  await page.goto('/tasks')
  await page.getByText('Alpha sprint', { exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Edit' }).click()
  const edit = page.getByRole('dialog').filter({ hasText: 'Edit item' })
  await edit.getByLabel('Title').fill('Alpha sprint updated')
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('dialog').filter({ hasText: 'Save this task?' }).getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Alpha sprint updated', { exact: true })).toBeVisible()
  await page.waitForFunction(() => (localStorage.getItem('av-tasks') ?? '').includes('Alpha sprint updated'))

  await page.getByText('Alpha sprint updated', { exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').filter({ hasText: 'Delete this item?' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Alpha sprint updated', { exact: true })).toHaveCount(0)
  await page.waitForFunction((id) => {
    const raw = localStorage.getItem('av-tasks') ?? '[]'
    return !JSON.parse(raw).some((row: { id: string }) => row.id === id)
  }, 't-alpha')

  await login(page, LEAD_A)
  await page.goto('/tasks')
  await page.getByLabel('Focus').selectOption('team')
  await expect(page.getByText('Alpha sprint updated', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Fresh assignment', { exact: true })).toBeVisible()

  await login(page, ADMIN)
  await page.goto('/tasks')
  await expect(page.getByText('Fresh assignment', { exact: true })).toBeVisible()
  await expect(page.getByText('Alpha sprint updated', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Beta launch', { exact: true })).toBeVisible()
})

function dueTodayValue(page: Page) {
  return page.getByText('Tasks due today', { exact: true }).locator('xpath=following-sibling::div[1]')
}

async function login(page: Page, who: typeof ADMIN) {
  await page.goto('/login')
  await page.evaluate(() => sessionStorage.removeItem('av-auth-user'))
  await page.goto('/login')
  await page.getByLabel(/email address|work email/i).fill(who.email)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
}

function person(id: string, name: string, role: 'admin' | 'staff' | 'team_lead') {
  return {
    id,
    email: `${id}@afrivate.test`,
    password: PASSWORD,
    name,
    role,
    department: 'Operations',
    jobTitle: role === 'admin' ? 'Portal Admin' : 'Associate',
    joinedAt: '2024-01-01',
    active: true,
    approvedAt: '2024-01-01T00:00:00.000Z',
  }
}

function item(id: string, title: string, ownerId: string, assigneeIds: string[] = [], dueDate?: string) {
  const now = '2026-10-13T08:00:00.000Z'
  return {
    id,
    ownerId,
    assigneeIds,
    assigneeId: assigneeIds[0],
    title,
    status: 'todo',
    priority: 'medium',
    category: 'general',
    dueDate,
    activity: [{ at: now, by: ownerId, message: 'Created task' }],
    createdAt: now,
    updatedAt: now,
  }
}
