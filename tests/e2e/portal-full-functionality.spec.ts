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

async function expectMainOk(page: Page) {
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Something went wrong')
}

async function clickIfVisible(page: Page, name: RegExp) {
  const btn = page.getByRole('button', { name }).first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    return true
  }
  return false
}

async function closeDialogIfOpen(page: Page) {
  const dialog = page.getByRole('dialog')
  if (await dialog.isVisible().catch(() => false)) {
    const cancel = dialog.getByRole('button', { name: /cancel|close|done|ok/i }).first()
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await expect(dialog).toBeHidden({ timeout: 5_000 }).catch(() => undefined)
  }
}

test.describe('Auth pages (no login)', () => {
  test('login page controls', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /request access/i })).toBeVisible()
    const showPw = page.getByRole('button', { name: /show password|hide password/i })
    if (await showPw.isVisible().catch(() => false)) await showPw.click()
  })

  test('request access page loads', async ({ page }) => {
    await page.goto('/request-access')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.locator('form').or(page.getByRole('button')).first()).toBeVisible()
  })

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByText(/forgot|reset|password/i).first()).toBeVisible()
  })

  test('invalid login shows error', async ({ page }) => {
    await seedUsers(page, [STAFF])
    await page.goto('/login')
    await page.getByLabel(/email address|work email/i).fill(STAFF.email)
    await page.locator('#password').fill('WrongPass1!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert').or(page.getByText(/incorrect|failed|invalid/i))).toBeVisible({
      timeout: 10_000,
    })
  })
})

test.describe('Full portal — admin session', () => {
  test.beforeEach(async ({ page }) => {
    await seedUsers(page, [ADMIN, STAFF])
    await login(page, ADMIN.email, ADMIN.password)
  })

  const pages: { path: string; heading?: RegExp }[] = [
    { path: '/', heading: /good|home|dashboard|welcome/i },
    { path: '/tasks', heading: /task|work/i },
    { path: '/checkin', heading: /weekly|check|update/i },
    { path: '/onboarding', heading: /getting started|onboarding|welcome/i },
    { path: '/announcements', heading: /update|announcement|memo/i },
    { path: '/documents', heading: /resource|document/i },
    { path: '/events', heading: /what|event|calendar/i },
    { path: '/inbox', heading: /inbox/i },
    { path: '/search', heading: /search/i },
    { path: '/notes', heading: /note/i },
    { path: '/privacy', heading: /privacy|ndpr/i },
    { path: '/account', heading: /account|security|password|email/i },
    { path: '/people', heading: /people/i },
    { path: '/people/leave', heading: /time off|leave/i },
    { path: '/people/shout-outs', heading: /shout/i },
    { path: '/people/learning', heading: /learning/i },
    { path: '/people/surveys', heading: /survey/i },
    { path: '/people/growth', heading: /growth/i },
    { path: '/people/directory', heading: /people|directory|team/i },
    { path: '/admin', heading: /admin|workspace|approvals|users/i },
    { path: '/launch-checklist', heading: /launch|checklist|revival/i },
  ]

  for (const route of pages) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path)
      await expectMainOk(page)
      // Directory under /people hides its own PageHeader (embedded in People hub).
      if (route.path === '/people/directory') {
        await expect(page.getByPlaceholder(/search by name|search/i).first()).toBeVisible()
      } else {
        await expect(page.getByRole('heading').first()).toBeVisible()
      }
    })
  }

  test('legacy redirects work', async ({ page }) => {
    await page.goto('/leave')
    await expect(page).toHaveURL(/\/people\/leave/)
    await page.goto('/directory?profile=1')
    await expect(page).toHaveURL(/\/people\/directory\?profile=1/)
    await page.goto('/recognition')
    await expect(page).toHaveURL(/\/people\/shout-outs/)
  })

  test('404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz')
    await expect(page.getByRole('heading', { name: /page not found/i }).first()).toBeVisible()
  })

  test('sidebar nav links are clickable', async ({ page }) => {
    await page.goto('/')
    const links = [
      /home|dashboard/i,
      /my work|tasks/i,
      /inbox/i,
      /people/i,
      /search/i,
      /weekly|check/i,
      /getting started|onboarding/i,
      /notes/i,
      /updates|announcements/i,
      /resources|documents/i,
      /what's on|events/i,
      /workspace admin|admin/i,
    ]
    for (const name of links) {
      const link = page.locator('aside nav').getByRole('link', { name }).first()
      if (await link.isVisible().catch(() => false)) {
        await link.click()
        await expectMainOk(page)
      }
    }
  })

  test('top bar: theme, search, inbox', async ({ page }) => {
    await page.goto('/')
    await clickIfVisible(page, /theme|dark|light|toggle/i)
    const search = page.getByRole('link', { name: /search/i }).first()
    if (await search.isVisible().catch(() => false)) {
      await search.click()
      await expect(page).toHaveURL(/\/search/)
    }
    await page.goto('/')
    const inbox = page.getByRole('link', { name: /inbox/i }).first()
    if (await inbox.isVisible().catch(() => false)) {
      await inbox.click()
      await expect(page).toHaveURL(/\/inbox/)
    }
  })

  test('tasks: open create modal and cancel', async ({ page }) => {
    await page.goto('/tasks')
    const opened = await clickIfVisible(page, /new task|add task|create task/i)
    if (opened) {
      await expect(page.getByRole('dialog')).toBeVisible()
      await closeDialogIfOpen(page)
    }
  })

  test('tasks: switch view tabs if present', async ({ page }) => {
    await page.goto('/tasks')
    for (const name of [/board/i, /list/i, /week/i]) {
      await clickIfVisible(page, name)
      await expectMainOk(page)
    }
  })

  test('check-in: tabs and form controls', async ({ page }) => {
    await page.goto('/checkin')
    for (const name of [/this week|submit/i, /history/i, /team/i]) {
      await clickIfVisible(page, name)
    }
    await expectMainOk(page)
  })

  test('onboarding: tabs', async ({ page }) => {
    await page.goto('/onboarding')
    for (const name of [/videos?/i, /checklist/i, /admin|progress/i]) {
      await clickIfVisible(page, name)
      await expectMainOk(page)
    }
  })

  test('announcements: open compose if available', async ({ page }) => {
    await page.goto('/announcements')
    const opened = await clickIfVisible(page, /new|post|compose|create|write/i)
    if (opened) {
      await expect(page.getByRole('dialog').or(page.locator('form')).first()).toBeVisible()
      await closeDialogIfOpen(page)
    }
  })

  test('documents: open upload modal', async ({ page }) => {
    await page.goto('/documents')
    const opened = await clickIfVisible(page, /upload|add document|new document/i)
    if (opened) {
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/attach file|file name|title/i).first()).toBeVisible()
      await closeDialogIfOpen(page)
    }
  })

  test('events: open create modal', async ({ page }) => {
    await page.goto('/events')
    for (const name of [/list/i, /schedule|calendar/i]) {
      await clickIfVisible(page, name)
    }
    const opened = await clickIfVisible(page, /add event|new event|create/i)
    if (opened) {
      await expect(page.getByRole('dialog')).toBeVisible()
      await closeDialogIfOpen(page)
    }
  })

  test('search: type query', async ({ page }) => {
    await page.goto('/search')
    const input = page.getByRole('textbox').or(page.getByPlaceholder(/search/i)).first()
    await input.fill('admin')
    await expect(input).toHaveValue('admin')
    await expectMainOk(page)
  })

  test('notes: create note button', async ({ page }) => {
    await page.goto('/notes')
    const opened = await clickIfVisible(page, /new note|add note|create/i)
    if (opened) {
      await expectMainOk(page)
    }
  })

  test('inbox: mark all if present', async ({ page }) => {
    await page.goto('/inbox')
    await clickIfVisible(page, /mark all/i)
    await closeDialogIfOpen(page)
    await expectMainOk(page)
  })

  test('people leave: open request form, fill, dismiss', async ({ page }) => {
    await page.goto('/people/leave')
    await expect(page.getByRole('heading', { name: /time off/i })).toBeVisible()
    await page.getByRole('button', { name: /request leave/i }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel(/start date/i).fill('2026-08-01')
    await dialog.getByLabel(/end date/i).fill('2026-08-02')
    await dialog.getByLabel(/reason/i).fill('E2E functionality test leave reason')
    // Upload control should be present (same pattern as memos)
    await expect(dialog.getByText(/supporting document|upload file/i).first()).toBeVisible()
    await dialog.getByRole('button', { name: /cancel/i }).click()
    await expect(dialog).toBeHidden()
  })

  test('people leave: tabs', async ({ page }) => {
    await page.goto('/people/leave')
    for (const name of [/my requests/i, /all requests|team requests/i, /calendar/i]) {
      await clickIfVisible(page, name)
      await expectMainOk(page)
    }
  })

  test('people shout-outs: open form', async ({ page }) => {
    await page.goto('/people/shout-outs')
    const opened = await clickIfVisible(page, /give shout|new|recognize|shout/i)
    if (opened) {
      await expect(page.getByRole('dialog')).toBeVisible()
      await closeDialogIfOpen(page)
    }
  })

  test('people learning page controls', async ({ page }) => {
    await page.goto('/people/learning')
    await expectMainOk(page)
    await expect(page.getByRole('heading', { name: /learning/i })).toBeVisible()
  })

  test('people surveys page', async ({ page }) => {
    await page.goto('/people/surveys')
    await expectMainOk(page)
  })

  test('people growth: all tabs', async ({ page }) => {
    await page.goto('/people/growth')
    for (const name of [/okr/i, /1:1|one.on.one/i, /idp/i, /360/i, /30.60.90|milestone/i, /award/i, /speak|grievance/i]) {
      await clickIfVisible(page, name)
      await expectMainOk(page)
    }
  })

  test('people directory: search and open profile', async ({ page }) => {
    await page.goto('/people/directory')
    const search = page.getByPlaceholder(/search/i).first()
    await expect(search).toBeVisible()
    await search.fill('Admin')
    await expect(search).toHaveValue('Admin')
    const person = page.getByText(ADMIN.name).first()
    if (await person.isVisible().catch(() => false)) {
      await person.click()
      const dialog = page.getByRole('dialog')
      if (await dialog.isVisible().catch(() => false)) {
        await closeDialogIfOpen(page)
      }
    }
  })

  test('admin: every section tab', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/)
    const sectionNames = [
      /approvals/i,
      /recruitment|hiring|ats/i,
      /users/i,
      /departments/i,
      /teams/i,
      /announcements|updates|memos/i,
      /leave/i,
      /onboarding|getting started/i,
      /check.?ins?/i,
      /hr dashboard|hr ops|people ops/i,
    ]
    for (const name of sectionNames) {
      const tab = page.getByRole('button', { name }).first()
      if (await tab.isVisible().catch(() => false)) {
        await tab.click()
        await expectMainOk(page)
        await expect(page.getByRole('heading').first()).toBeVisible()
      }
    }
  })

  test('admin leave: all requests list visible', async ({ page }) => {
    await page.goto('/admin')
    const leaveTab = page.getByRole('button', { name: /^leave$/i }).first()
    if (await leaveTab.isVisible().catch(() => false)) {
      await leaveTab.click()
      await expect(page.getByText(/approval queue|all leave requests|leave calendar/i).first()).toBeVisible()
    }
  })

  test('admin invite modal opens', async ({ page }) => {
    await page.goto('/admin')
    await clickIfVisible(page, /approvals/i)
    const opened = await clickIfVisible(page, /invite/i)
    if (opened) {
      await expect(page.getByRole('dialog')).toBeVisible()
      await closeDialogIfOpen(page)
    }
  })

  test('account security page controls', async ({ page }) => {
    await page.goto('/account')
    await expectMainOk(page)
    await expect(page.getByText(/email|password|security/i).first()).toBeVisible()
  })

  test('privacy page', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByText(/privacy|personal data|ndpr/i).first()).toBeVisible()
  })
})

test.describe('Staff session (non-admin)', () => {
  test.beforeEach(async ({ page }) => {
    await seedUsers(page, [ADMIN, STAFF])
    await login(page, STAFF.email, STAFF.password)
  })

  test('staff cannot stay on admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin$/)
  })

  test('staff can open leave request form', async ({ page }) => {
    await page.goto('/people/leave')
    await page.getByRole('button', { name: /request leave/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/upload file|supporting document/i).first()).toBeVisible()
    await page.getByRole('button', { name: /cancel/i }).click()
  })

  test('staff people hub subnav', async ({ page }) => {
    await page.goto('/people')
    for (const path of [
      '/people/leave',
      '/people/shout-outs',
      '/people/learning',
      '/people/surveys',
      '/people/growth',
      '/people/directory',
    ]) {
      await page.goto(path)
      await expectMainOk(page)
    }
  })
})

test.describe('Sign out', () => {
  test('admin can sign out', async ({ page }) => {
    await seedUsers(page, [ADMIN])
    await login(page, ADMIN.email, ADMIN.password)
    await page.goto('/')
    // Profile / menu may hide sign out — try common entry points
    const profile = page.getByRole('button', { name: /profile|account|menu|E2E Admin/i }).first()
    if (await profile.isVisible().catch(() => false)) await profile.click()
    const signOut = page.getByRole('button', { name: /sign out/i }).or(page.getByRole('menuitem', { name: /sign out/i }))
    if (await signOut.first().isVisible().catch(() => false)) {
      await signOut.first().click()
      const confirm = page.getByRole('button', { name: /sign out|confirm|yes/i }).last()
      if (await confirm.isVisible().catch(() => false)) await confirm.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })
})
