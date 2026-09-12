import type { EventItem, User } from '@/types'
import type { EmployeeProfile, EmploymentStatus } from '@/types/hr'

export const PEOPLE_MOMENT_SOURCE = 'people_ops' as const
export const PEOPLE_MOMENT_RESTRICTED_AUDIENCE = 'restricted'

export const NEWHIRE_CHECKINS = [
  { day: 1 as const, offset: 0, label: 'Day 1' },
  { day: 7 as const, offset: 7, label: 'Day 7' },
  { day: 30 as const, offset: 30, label: 'Day 30' },
  { day: 60 as const, offset: 60, label: 'Day 60' },
  { day: 90 as const, offset: 90, label: 'Day 90' },
]

export type PeopleMomentKind = 'birthday' | 'anniversary' | 'newhire'

export type PeopleMomentProfile = Pick<
  EmployeeProfile,
  'userId' | 'preferredName' | 'legalName' | 'dateOfBirth' | 'startDate' | 'employmentStatus' | 'archived'
>

export type PeopleMomentUser = Pick<User, 'id' | 'name' | 'jobTitle' | 'department' | 'active' | 'role' | 'reportsToId'>

export type PlannedPeopleMoment = Omit<EventItem, 'id'> & {
  externalKey: string
  source: typeof PEOPLE_MOMENT_SOURCE
  subjectUserId: string
}

const ACTIVE_STATUSES: EmploymentStatus[] = ['active', 'probation', 'leave']

export function todayYmd(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function activeEmploymentNeedsDates(status: EmploymentStatus | undefined): boolean {
  return !!status && ACTIVE_STATUSES.includes(status)
}

export function isPeopleMomentActive(profile: PeopleMomentProfile, user?: PeopleMomentUser): boolean {
  if (profile.archived) return false
  if (user && user.active === false) return false
  return activeEmploymentNeedsDates(profile.employmentStatus)
}

export function preferredEventName(profile: PeopleMomentProfile, user?: PeopleMomentUser): string {
  const preferred = profile.preferredName?.trim()
  if (preferred) return preferred
  const legal = profile.legalName?.trim()
  if (legal) return legal
  const fromUser = user?.name?.trim()
  if (fromUser) return fromUser
  return 'Team member'
}

export function birthdayKey(userId: string): string {
  return `birthday:${userId}`
}

export function anniversaryKey(userId: string): string {
  return `anniversary:${userId}`
}

export function newhireKey(userId: string, day: 1 | 7 | 30 | 60 | 90): string {
  return `newhire:${userId}:day${day}`
}

export function peopleMomentEventId(externalKey: string): string {
  return `pom:${externalKey}`
}

export function peopleMomentKindFromKey(externalKey?: string): PeopleMomentKind | null {
  if (!externalKey) return null
  if (externalKey.startsWith('birthday:')) return 'birthday'
  if (externalKey.startsWith('anniversary:')) return 'anniversary'
  if (externalKey.startsWith('newhire:')) return 'newhire'
  return null
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function dateOnYear(fromIso: string, year: number): string {
  const [, monthRaw, dayRaw] = fromIso.slice(0, 10).split('-').map(Number)
  const month = monthRaw || 1
  const day = Math.min(dayRaw || 1, daysInMonth(year, month))
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Next occurrence of an annual month-day on or after today (Feb 29 → Feb 28 in non-leap years). */
export function nextAnnualDate(fromIso: string, todayIso: string): string {
  const today = todayIso.slice(0, 10)
  const year = Number(today.slice(0, 4))
  const thisYear = dateOnYear(fromIso, year)
  if (thisYear >= today) return thisYear
  return dateOnYear(fromIso, year + 1)
}

export function addDaysYmd(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days))
  return dt.toISOString().slice(0, 10)
}

export function planPeopleMomentEvents(
  profile: PeopleMomentProfile,
  user: PeopleMomentUser | undefined,
  today: string,
): PlannedPeopleMoment[] {
  if (!isPeopleMomentActive(profile, user)) return []
  const name = preferredEventName(profile, user)
  const userId = profile.userId
  const role = user?.jobTitle?.trim() || 'Team member'
  const planned: PlannedPeopleMoment[] = []

  if (profile.dateOfBirth) {
    planned.push({
      title: `Birthday · ${name}`,
      description: `${name} — birthday`,
      date: nextAnnualDate(profile.dateOfBirth, today),
      audience: 'all',
      source: PEOPLE_MOMENT_SOURCE,
      externalKey: birthdayKey(userId),
      subjectUserId: userId,
    })
  }

  if (profile.startDate) {
    planned.push({
      title: `Work anniversary · ${name}`,
      description: `${name} · ${role} · started ${profile.startDate}`,
      date: nextAnnualDate(profile.startDate, today),
      audience: 'all',
      source: PEOPLE_MOMENT_SOURCE,
      externalKey: anniversaryKey(userId),
      subjectUserId: userId,
    })

    for (const checkin of NEWHIRE_CHECKINS) {
      const extra =
        checkin.day === 7
          ? ' Policy acknowledgements in Resources are due by Day 7.'
          : ''
      planned.push({
        title: `New hire check-in · ${checkin.label} · ${name}`,
        description: `${name} · ${role} · start ${profile.startDate}.${extra} First 90 days: /people/growth?tab=milestones`,
        date: addDaysYmd(profile.startDate, checkin.offset),
        audience: PEOPLE_MOMENT_RESTRICTED_AUDIENCE,
        source: PEOPLE_MOMENT_SOURCE,
        externalKey: newhireKey(userId, checkin.day),
        subjectUserId: userId,
      })
    }
  }

  return planned
}

export function isPeopleOpsEvent(event: Pick<EventItem, 'source' | 'externalKey'>): boolean {
  return event.source === PEOPLE_MOMENT_SOURCE || Boolean(peopleMomentKindFromKey(event.externalKey))
}

export function isPeopleOpsForUser(event: EventItem, userId: string): boolean {
  if (!isPeopleOpsEvent(event)) return false
  if (event.subjectUserId) return event.subjectUserId === userId
  if (!event.externalKey) return false
  return (
    event.externalKey === birthdayKey(userId) ||
    event.externalKey === anniversaryKey(userId) ||
    NEWHIRE_CHECKINS.some((c) => event.externalKey === newhireKey(userId, c.day))
  )
}

export function mergePeopleMomentEvents(
  existing: EventItem[],
  profile: PeopleMomentProfile,
  user: PeopleMomentUser | undefined,
  today: string,
): EventItem[] {
  const userId = profile.userId
  const planned = planPeopleMomentEvents(profile, user, today)
  const active = isPeopleMomentActive(profile, user)
  const next: EventItem[] = []

  for (const event of existing) {
    if (!isPeopleOpsForUser(event, userId)) {
      next.push(event)
      continue
    }
    if (!active && event.date < today) next.push(event)
  }

  if (active) {
    for (const plannedEvent of planned) {
      next.push({
        id: peopleMomentEventId(plannedEvent.externalKey),
        ...plannedEvent,
      })
    }
  }

  return next
}

export function cancelFuturePeopleMoments(existing: EventItem[], userId: string, today: string): EventItem[] {
  return existing.filter((event) => {
    if (!isPeopleOpsForUser(event, userId)) return true
    return event.date < today
  })
}

export function eventVisibleToUser(
  event: EventItem,
  viewer: PeopleMomentUser,
  users: PeopleMomentUser[],
): boolean {
  if (viewer.role === 'hr' || viewer.role === 'admin') return true
  if (event.audience === 'all' || event.audience === viewer.department) return true
  if (event.subjectUserId === viewer.id) return true
  if (event.subjectUserId) {
    const subject = users.find((u) => u.id === event.subjectUserId)
    if (subject?.reportsToId === viewer.id) return true
  }
  return false
}

export function peopleMomentKindLabel(kind: PeopleMomentKind): string {
  if (kind === 'birthday') return 'Birthday'
  if (kind === 'anniversary') return 'Work anniversary'
  return 'New hire check-in'
}
