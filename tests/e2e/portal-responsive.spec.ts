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

/** Fail if the document scrolls horizontally more than a small tolerance. */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth)
    const clientW = doc.clientWidth
    return { scrollW, clientW, delta: scrollW - clientW }
  })
  expect(overflow.delta, `horizontal overflow ${overflow.delta}px (scroll=${overflow.scrollW}, client=${overflow.clientW})`).toBeLessThanOrEqual(2)
}

const ROUTES = [
  '/',
  '/tasks',
  '/checkin',
  '/onboarding',
  '/announcements',
  '/documents',
  '/events',
  '/leave',
  '/recognition',
  '/people/directory',
  '/people/growth',
  '/notes',
  '/inbox',
  '/admin',
  '/search',
  '/profile',
  '/account',
]

test.describe('Responsive — no horizontal page overflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedUsers(page, [ADMIN, STAFF])
    await login(page, ADMIN.email, ADMIN.password)
  })

  for (const path of ROUTES) {
    test(`${path} fits viewport`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('body')).not.toContainText('Something went wrong')
      await expectNoHorizontalOverflow(page)
    })
  }

  test('mobile nav and availability menu are reachable', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone/tablet projects only')
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
    await page.locator('header button[aria-haspopup="menu"]').click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByLabel(/your availability/i)).toBeVisible()
  })

  test('events schedule defaults to list on phone', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 1280
    test.skip(width > 639, 'listWeek default only below 640px')
    await page.goto('/events')
    await expect(page.locator('main')).toBeVisible()
    await page.getByRole('tab', { name: /schedule/i }).click()
    const listView = page.locator('.fc-listWeek-view, .fc-list-view, .fc-list-table, .fc-list')
    await expect(listView.first()).toBeVisible({ timeout: 10_000 })
    await expectNoHorizontalOverflow(page)
  })
})
