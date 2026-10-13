import { test, expect, type Page } from '@playwright/test'

const ADMIN = {
  id: 'e2e-admin-1',
  email: 'admin@afrivate.test',
  password: 'TestPass1!',
  name: 'E2E Admin',
  role: 'admin' as const,
  department: 'Operations',
  jobTitle: 'Portal Admin',
  joinedAt: '2024-01-01',
  active: true,
  approvedAt: '2024-01-01T00:00:00.000Z',
}

const STAFF = {
  id: 'e2e-staff-1',
  email: 'staff@afrivate.test',
  password: 'TestPass1!',
  name: 'E2E Staff',
  role: 'staff' as const,
  department: 'Operations',
  jobTitle: 'Associate',
  joinedAt: '2024-06-01',
  active: true,
  approvedAt: '2024-06-01T00:00:00.000Z',
  reportsToId: ADMIN.id,
  bio: 'New hire bio',
}

async function seedUsers(page: Page, users: unknown[]) {
  await page.addInitScript((rows) => {
    localStorage.setItem('av-users', JSON.stringify(rows))
    localStorage.setItem('av-last-activity-at', String(Date.now()))
  }, users)
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.evaluate(() => sessionStorage.removeItem('av-auth-user'))
  await page.getByLabel(/email address|work email/i).fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
}

test('getting started matches the new-hire welcome message', async ({ page }) => {
  await seedUsers(page, [ADMIN, STAFF])
  await login(page, STAFF.email, STAFF.password)
  await page.goto('/onboarding')

  await expect(page.getByRole('heading', { name: /getting started/i })).toBeVisible()
  await expect(page.getByText(/of 11/)).toBeVisible()
  await expect(page.getByText('Access', { exact: true })).toBeVisible()
  await expect(page.getByText('Policies', { exact: true })).toBeVisible()
  await expect(page.getByText('Goals', { exact: true })).toBeVisible()
  await expect(page.getByText('Rhythm', { exact: true })).toBeVisible()
  await expect(page.getByText('Work week: Monday to Thursday.')).toBeVisible()
  await expect(page.getByText(/Stuck\? Click the purple AVA button/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'afrivatehr@gmail.com' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('People & Culture')
  await expect(page.locator('body')).not.toContainText('kit PDF')
  await expect(page.locator('body')).not.toContainText('welcome video')

  await page.getByRole('tab', { name: /checklist/i }).click()

  const slack = page.getByRole('button', { name: /Set up your Slack profile/i })
  await expect(slack).toBeVisible()
  await expect(slack).toContainText('Join #annoucements')
  await expect(page.getByRole('listitem').filter({ hasText: 'Set up your Slack profile' }).getByRole('link')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open My info' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open my card' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open directory' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Resources' })).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Open Growth' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open My work' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Write weekly update' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Memos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Events' })).toBeVisible()
  await expect(page.getByText('Watch the welcome onboarding videos')).toHaveCount(0)

  const card = page.getByRole('button', { name: /Update your directory card/i })
  const lead = page.getByRole('button', { name: /Confirm your department/i })
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await expect(lead).toHaveAttribute('aria-pressed', 'true')

  const pack = page.getByRole('button', { name: /Read your onboarding pack/i })
  const policies = page.getByRole('button', { name: /Acknowledge your assigned policies/i })
  await expect(pack).toHaveAttribute('aria-pressed', 'false')
  await expect(policies).toHaveAttribute('aria-pressed', 'false')

  await page.getByRole('listitem').filter({ hasText: 'Read your onboarding pack' }).getByRole('link', { name: 'Open Resources' }).click()
  await page.waitForURL(/\/documents/)
  await page.goto('/onboarding?tab=checklist')
  await expect(page.getByRole('button', { name: /Read your onboarding pack/i })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Acknowledge your assigned policies/i })).toHaveAttribute('aria-pressed', 'false')

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(slack).toBeVisible()
  const myInfo = page.getByRole('link', { name: 'Open My info' })
  await expect(myInfo).toBeVisible()
  const box = await myInfo.boundingBox()
  expect(box?.width ?? 0).toBeLessThanOrEqual(390)
})

test('admin can edit and remove a checklist description', async ({ page }) => {
  await seedUsers(page, [ADMIN, STAFF])
  await login(page, ADMIN.email, ADMIN.password)
  await page.goto('/admin?section=onboarding')

  await expect(page.getByRole('heading', { name: 'Checklist items' })).toBeVisible()
  await expect(page.getByText(/In Slack, set your real first and last name/).first()).toBeVisible()

  const slackRow = page.locator('tr, li').filter({ hasText: 'Set up your Slack profile' }).first()
  await slackRow.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Description (optional)').fill('Updated slack note for Human Resources.')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Updated slack note for Human Resources.').first()).toBeVisible()
  await page.reload()
  await expect(page.getByText('Updated slack note for Human Resources.').first()).toBeVisible()

  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Label').fill('Temporary checklist row')
  await page.getByLabel('Link (optional)').fill('')
  await page.getByLabel('Description (optional)').fill('A short note with no link.')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Temporary checklist row').first()).toBeVisible()
  await expect(page.getByText('A short note with no link.').first()).toBeVisible()

  const tempRow = page.locator('tr, li').filter({ hasText: 'Temporary checklist row' }).first()
  await tempRow.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Temporary checklist row')).toHaveCount(0)
})
