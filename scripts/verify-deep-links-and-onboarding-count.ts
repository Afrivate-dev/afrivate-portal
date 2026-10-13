import assert from 'node:assert/strict'
import { DEFAULT_GETTING_STARTED_CHECKLIST, computeOnboardingProgress } from '../src/content/gettingStartedChecklist'
import { getSafeNext } from '../src/lib/safeRedirect'

function checkRedirects() {
  assert.equal(getSafeNext(new URLSearchParams('next=/onboarding'), null), '/onboarding')
  assert.equal(getSafeNext(new URLSearchParams('next=/people/my-info'), null), '/people/my-info')
  assert.equal(
    getSafeNext(new URLSearchParams('next=/tasks?filter=mine'), null),
    '/tasks?filter=mine',
  )
  assert.equal(getSafeNext(new URLSearchParams('next=//evil.com'), null), '/')
  assert.equal(getSafeNext(new URLSearchParams('next=https://evil.com'), null), '/')
  assert.equal(getSafeNext(new URLSearchParams('next=/\\evil'), null), '/')
  assert.equal(getSafeNext(new URLSearchParams('next=/login'), null), '/')
  assert.equal(getSafeNext(new URLSearchParams('next=/forgot-password'), null), '/')
  assert.equal(
    getSafeNext(new URLSearchParams('next=https://evil.com'), { from: { pathname: '/tasks' } }),
    '/',
  )
  assert.equal(
    getSafeNext(new URLSearchParams(), { from: { pathname: '/tasks', search: '', hash: '' } }),
    '/tasks',
  )
  assert.equal(getSafeNext(new URLSearchParams(), null), '/')
}

function checkProgress() {
  const items = DEFAULT_GETTING_STARTED_CHECKLIST
  const zero = computeOnboardingProgress({
    items,
    checkedIds: [],
    videos: [],
    watchedIds: [],
  })
  assert.equal(zero.total, 11)
  assert.equal(zero.overallTotal, 11)

  const one = computeOnboardingProgress({
    items,
    checkedIds: [],
    videos: [{ id: 'v1' }],
    watchedIds: [],
  })
  assert.equal(one.total, 12)
  assert.equal(one.overallTotal, 13)

  const hidden = computeOnboardingProgress({
    items,
    checkedIds: ['ck_videos'],
    videos: [],
    watchedIds: [],
  })
  assert.equal(hidden.done, 0)
  assert.equal(hidden.total, 11)
  assert.equal(hidden.overallDone, 0)
}

checkRedirects()
checkProgress()
console.log('deep link and onboarding count checks passed')
