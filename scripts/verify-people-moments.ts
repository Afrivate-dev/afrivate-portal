/**
 * Acceptance checks for people-calendar autosave (birthday / anniversary / new hire).
 * Run: npm run test:people-moments
 */
import {
  addDaysYmd,
  anniversaryKey,
  birthdayKey,
  cancelFuturePeopleMoments,
  mergePeopleMomentEvents,
  newhireKey,
  nextAnnualDate,
  peopleMomentEventId,
  planPeopleMomentEvents,
  type PeopleMomentProfile,
  type PeopleMomentUser,
} from '../src/lib/peopleMomentEvents'

let failed = 0

function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1
    console.error('FAIL:', msg)
  } else {
    console.log('OK:', msg)
  }
}

const user: PeopleMomentUser = {
  id: 'u-1',
  name: 'Ada Lovelace',
  jobTitle: 'Engineer',
  department: 'Product',
  active: true,
  role: 'staff',
  reportsToId: 'lead-1',
}

const profile = (patch: Partial<PeopleMomentProfile> = {}): PeopleMomentProfile => ({
  userId: 'u-1',
  preferredName: 'Ada',
  legalName: 'Ada Lovelace',
  dateOfBirth: '1990-03-15',
  startDate: '2026-01-10',
  employmentStatus: 'active',
  archived: false,
  ...patch,
})

assert(nextAnnualDate('1990-03-15', '2026-03-15') === '2026-03-15', 'next annual on the day stays this year')
assert(nextAnnualDate('1990-03-15', '2026-03-16') === '2027-03-15', 'next annual after the day rolls forward')
assert(nextAnnualDate('2000-02-29', '2026-01-01') === '2026-02-28', 'Feb 29 in a non-leap year becomes Feb 28')
assert(addDaysYmd('2026-01-10', 7) === '2026-01-17', 'day 7 is start + 7')
assert(addDaysYmd('2026-01-10', 90) === '2026-04-10', 'day 90 is start + 90')

const planned = planPeopleMomentEvents(profile(), user, '2026-02-01')
assert(planned.length === 7, 'active person with DOB + start date yields 7 events')
assert(planned.filter((e) => e.externalKey === birthdayKey('u-1')).length === 1, 'exactly one birthday key')
assert(planned.filter((e) => e.externalKey === anniversaryKey('u-1')).length === 1, 'exactly one anniversary key')
assert(
  NEWHIRE_OK(planned),
  'five newhire keys day1/7/30/60/90',
)

function NEWHIRE_OK(rows: { externalKey: string }[]) {
  return ([1, 7, 30, 60, 90] as const).every(
    (day) => rows.filter((e) => e.externalKey === newhireKey('u-1', day)).length === 1,
  )
}

assert(
  planned.find((e) => e.externalKey === birthdayKey('u-1'))?.title === 'Birthday · Ada',
  'birthday title uses preferred name',
)
assert(
  planned.find((e) => e.externalKey === birthdayKey('u-1'))?.date === '2026-03-15',
  'birthday lands on next occurrence',
)

const movedDob = planPeopleMomentEvents(profile({ dateOfBirth: '1990-06-01' }), user, '2026-02-01')
assert(
  movedDob.find((e) => e.externalKey === birthdayKey('u-1'))?.date === '2026-06-01',
  'changing DOB moves the birthday',
)

const noDob = planPeopleMomentEvents(profile({ dateOfBirth: undefined }), user, '2026-02-01')
assert(!noDob.some((e) => e.externalKey === birthdayKey('u-1')), 'clearing DOB drops birthday from the plan')

const newStart = planPeopleMomentEvents(profile({ startDate: '2026-02-01' }), user, '2026-02-01')
assert(
  newStart.find((e) => e.externalKey === newhireKey('u-1', 7))?.date === '2026-02-08',
  'changing start date reschedules day 7',
)

const merged = mergePeopleMomentEvents([], profile(), user, '2026-02-01')
assert(merged.length === 7, 'merge creates the full series')
assert(merged.every((e) => e.id === peopleMomentEventId(e.externalKey!)), 'ids are stable pom:{key}')

const afterDobClear = mergePeopleMomentEvents(merged, profile({ dateOfBirth: undefined }), user, '2026-02-01')
assert(!afterDobClear.some((e) => e.externalKey === birthdayKey('u-1')), 'revoking/clearing DOB removes birthday')
assert(afterDobClear.filter((e) => e.externalKey?.startsWith('newhire:')).length === 5, 'check-ins remain when DOB cleared')

const afterExit = mergePeopleMomentEvents(merged, profile({ employmentStatus: 'terminated' }), user, '2026-02-01')
assert(
  afterExit.every((e) => e.date < '2026-02-01'),
  'exit drops future people moments and keeps only past',
)

const deactivated = cancelFuturePeopleMoments(merged, 'u-1', '2026-02-01')
assert(
  deactivated.every((e) => e.date < '2026-02-01' || !e.externalKey),
  'deactivate cancels future people moments',
)

const inactivePlan = planPeopleMomentEvents(profile(), { ...user, active: false }, '2026-02-01')
assert(inactivePlan.length === 0, 'inactive portal user does not get new people moments')

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll people-moment checks passed')
