import { test, expect, type Page } from '@playwright/test'

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
}

async function seedUsers(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('av-users', JSON.stringify([user]))
    localStorage.setItem('av-last-activity-at', String(Date.now()))
  }, STAFF)
}

async function login(page: Page, email: string, password: string) {
  await page.getByLabel(/email address|work email/i).fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
}

test('a stored session stays on the deep link', async ({ page }) => {
  await page.addInitScript((user) => {
    const { password: _password, ...sessionUser } = user
    void _password
    sessionStorage.setItem('av-auth-user', JSON.stringify(sessionUser))
    localStorage.setItem('av-users', JSON.stringify([user]))
    localStorage.setItem('av-last-activity-at', String(Date.now()))
  }, STAFF)

  await page.goto('/onboarding')
  await expect(page).toHaveURL(/\/onboarding$/)
  await expect(page.getByRole('heading', { name: /getting started/i })).toBeVisible()
  await expect(page).not.toHaveURL(/\/login/)
})

test('signed-out deep link returns after password sign-in', async ({ page }) => {
  await seedUsers(page)
  await page.goto('/people/my-info')
  await expect(page).toHaveURL(/\/login\?next=/)
  expect(decodeURIComponent(new URL(page.url()).searchParams.get('next') ?? '')).toBe('/people/my-info')
  await login(page, STAFF.email, STAFF.password)
  await expect(page).toHaveURL(/\/people\/my-info$/)
})

test('unsafe next values land on home', async ({ page }) => {
  await seedUsers(page)
  await page.goto('/login?next=https://evil.com')
  await login(page, STAFF.email, STAFF.password)
  await expect(page).toHaveURL(/\/$/)

  await page.evaluate(() => sessionStorage.removeItem('av-auth-user'))
  await page.goto('/login?next=//evil.com')
  await login(page, STAFF.email, STAFF.password)
  await expect(page).toHaveURL(/\/$/)
})
