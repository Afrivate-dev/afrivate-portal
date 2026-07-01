import { test, expect } from '@playwright/test'



const STAFF = {

  email: process.env.E2E_STAFF_EMAIL ?? '',

  password: process.env.E2E_STAFF_PASSWORD ?? '',

}

const ADMIN = {

  email: process.env.E2E_ADMIN_EMAIL ?? '',

  password: process.env.E2E_ADMIN_PASSWORD ?? '',

}

const PENDING = {

  email: process.env.E2E_PENDING_EMAIL ?? '',

  password: process.env.E2E_PENDING_PASSWORD ?? '',

}



const hasStaffCreds = Boolean(STAFF.email && STAFF.password)

const hasAdminCreds = Boolean(ADMIN.email && ADMIN.password)

const hasPendingCreds = Boolean(PENDING.email && PENDING.password)



async function login(page: import('@playwright/test').Page, email: string, password: string) {

  await page.goto('/login')

  await page.getByLabel(/email address|work email/i).fill(email)

  await page.locator('#password').fill(password)

  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })

}



test.describe('Auth flows', () => {

  test('login page renders', async ({ page }) => {

    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

  })



  test('staff can sign in and reach dashboard', async ({ page }) => {

    test.skip(!hasStaffCreds, 'Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD in .env.test.local')

    await login(page, STAFF.email, STAFF.password)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  })



  test('invalid credentials show error', async ({ page }) => {

    await page.goto('/login')

    await page.getByLabel(/email address|work email/i).fill('wrong@afrivate.org')

    await page.locator('#password').fill('wrongpass')

    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('alert').or(page.getByText(/invalid|failed/i))).toBeVisible({

      timeout: 10_000,

    })

  })



  test('forgot password page loads', async ({ page }) => {

    await page.goto('/forgot-password')

    await expect(page.getByText(/forgot|reset|password/i).first()).toBeVisible()

  })



  test('pending user sees request access screen', async ({ page }) => {

    test.skip(!hasPendingCreds, 'Set E2E_PENDING_EMAIL and E2E_PENDING_PASSWORD in .env.test.local')

    await login(page, PENDING.email, PENDING.password)

    await expect(page.getByRole('heading', { name: /account pending approval/i })).toBeVisible()

    await expect(page.getByRole('button', { name: /request access/i })).toBeVisible()

  })



  test('pending user can submit request access', async ({ page }) => {

    test.skip(!hasPendingCreds, 'Set E2E_PENDING_EMAIL and E2E_PENDING_PASSWORD in .env.test.local')

    await login(page, PENDING.email, PENDING.password)

    const deptSelect = page.getByLabel(/department/i)
    if (await deptSelect.isVisible()) {
      const options = await deptSelect.locator('option').allTextContents()
      const firstDept = options.find((o) => o && !o.toLowerCase().includes('select'))
      if (firstDept) await deptSelect.selectOption({ label: firstDept })
    }

    const jobTitle = page.getByLabel(/job title/i)
    if (await jobTitle.isVisible()) {
      await jobTitle.fill('Test Role')
    }

    await page.getByRole('button', { name: /request access/i }).click()

    await expect(

      page.getByText(/access request sent|already with the team|will review/i),

    ).toBeVisible({ timeout: 10_000 })

  })

})



test.describe('Navigation — staff', () => {

  test.beforeEach(async ({ page }) => {

    test.skip(!hasStaffCreds, 'Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD in .env.test.local')

    await login(page, STAFF.email, STAFF.password)

  })



  const routes = [

    { path: '/', name: /home|dashboard|good/i },

    { path: '/tasks', name: /task|work/i },

    { path: '/checkin', name: /weekly|check|update/i },

    { path: '/onboarding', name: /getting started|onboarding/i },

    { path: '/announcements', name: /update|announcement/i },

    { path: '/leave', name: /time off|leave/i },

    { path: '/directory', name: /people|directory|team/i },

    { path: '/documents', name: /resource|document/i },

    { path: '/recognition', name: /shout|recognition/i },

    { path: '/events', name: /what's on|event|calendar/i },

    { path: '/inbox', name: /inbox/i },

    { path: '/search', name: /search/i },

    { path: '/notes', name: /note/i },

    { path: '/people', name: /people/i },

    { path: '/people/leave', name: /time off|leave/i },

    { path: '/people/growth', name: /growth/i },

    { path: '/people/surveys', name: /surveys/i },

    { path: '/privacy', name: /privacy|ndpr/i },

  ]



  for (const route of routes) {

    test(`page loads: ${route.path}`, async ({ page }) => {

      await page.goto(route.path)

      await expect(page.locator('main')).toBeVisible()

      await expect(page.getByRole('heading').first()).toBeVisible()

    })

  }



  test('admin route redirects staff away', async ({ page }) => {

    await page.goto('/admin')

    await expect(page).not.toHaveURL(/\/admin/)

  })

})



test.describe('Navigation — admin', () => {

  test('admin can open workspace admin', async ({ page }) => {

    test.skip(!hasAdminCreds, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.test.local')

    await login(page, ADMIN.email, ADMIN.password)

    await page.goto('/admin')

    await expect(page).toHaveURL(/\/admin/)

    await expect(page.getByRole('heading').first()).toBeVisible()

  })

  test('admin can open HR dashboard section', async ({ page }) => {
    test.skip(!hasAdminCreds, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.test.local')

    await login(page, ADMIN.email, ADMIN.password)

    await page.goto('/admin')

    const hrTab = page.getByRole('button', { name: /hr dashboard|hr ops|people ops/i }).first()
    if (await hrTab.isVisible()) {
      await hrTab.click()
    }

    await expect(page.getByText(/hr dashboard|assign alison|pulse survey|eNPS/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('admin can see portal labels section on HR dashboard', async ({ page }) => {
    test.skip(!hasAdminCreds, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.test.local')

    await login(page, ADMIN.email, ADMIN.password)

    await page.goto('/admin')

    const hrTab = page.getByRole('button', { name: /hr dashboard|hr ops|people ops/i }).first()
    if (await hrTab.isVisible()) {
      await hrTab.click()
    }

    await expect(page.getByText(/portal labels|task categories|exit reasons/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

})



test.describe('Core interactions', () => {

  test.beforeEach(async ({ page }) => {

    test.skip(!hasStaffCreds, 'Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD in .env.test.local')

    await login(page, STAFF.email, STAFF.password)

  })



  test('tasks: open create task modal', async ({ page }) => {

    await page.goto('/tasks')

    const newBtn = page.getByRole('button', { name: /new task|add task|create/i }).first()

    if (await newBtn.isVisible()) {

      await newBtn.click()

      await expect(page.getByRole('dialog').or(page.locator('form'))).toBeVisible()

    }

  })



  test('people hub overview loads', async ({ page }) => {
    await page.goto('/people')
    await expect(page.getByRole('heading', { name: /^people$/i })).toBeVisible()
  })

  test('people learning page loads', async ({ page }) => {
    await page.goto('/people/learning')
    await expect(page.getByRole('heading', { name: /learning/i })).toBeVisible()
  })

  test('people growth page loads', async ({ page }) => {
    await page.goto('/people/growth')
    await expect(page.getByRole('heading', { name: /growth/i })).toBeVisible()
  })

  test('people surveys page loads', async ({ page }) => {
    await page.goto('/people/surveys')
    await expect(page.getByRole('heading', { name: /surveys/i })).toBeVisible()
  })

  test('people shout-outs page loads', async ({ page }) => {
    await page.goto('/people/shout-outs')
    await expect(page.getByRole('heading', { name: /shout-outs/i })).toBeVisible()
  })

  test('people leave page loads', async ({ page }) => {
    await page.goto('/people/leave')
    await expect(page.getByRole('heading', { name: /time off/i })).toBeVisible()
  })

  test('people directory page loads', async ({ page }) => {
    await page.goto('/people/directory')
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible()
  })

  test('legacy directory redirect preserves query params', async ({ page }) => {
    await page.goto('/directory?profile=1')
    await expect(page).toHaveURL(/\/people\/directory\?profile=1/)
  })

  test('unknown route shows 404 in app shell', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByRole('heading', { name: /not found|page not found/i })).toBeVisible()
  })

  test('leave: request form visible', async ({ page }) => {

    await page.goto('/leave')

    await expect(page.getByRole('button', { name: /request|submit|time off/i }).first()).toBeVisible()

  })



  test('directory: search input works', async ({ page }) => {

    await page.goto('/directory')

    const search = page.getByPlaceholder(/search/i).first()

    if (await search.isVisible()) {

      await search.fill('admin')

      await expect(search).toHaveValue('admin')

    }

  })



  test('sign out works', async ({ page }) => {

    await page.goto('/')

    const signOut = page.getByRole('button', { name: /sign out/i })

    if (await signOut.isVisible()) {

      await signOut.click()

      await expect(page).toHaveURL(/\/login/)

    }

  })

})

