import { format, parseISO } from 'date-fns'
import type { EventItem, User } from '@/types'

/** Employee-file fields used to build birthday and work-anniversary rows. */
export interface CelebrationProfile {
  userId: string
  dateOfBirth?: string
  startDate?: string
  legalName?: string
  archived?: boolean
}

function isoDay(value?: string | null): string | null {
  if (!value) return null
  const match = String(value).match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/** Next calendar date (this year or next) for a month-day, as yyyy-MM-dd. */
function nextOccurrence(sourceDay: string, todayIso: string): string | null {
  const parts = sourceDay.split('-')
  const month = parts[1]
  const day = parts[2]
  if (!month || !day) return null
  const year = Number(todayIso.slice(0, 4))
  const thisYear = `${year}-${month}-${day}`
  if (thisYear >= todayIso) return thisYear
  return `${year + 1}-${month}-${day}`
}

function fullYearsBetween(startDay: string, occurrenceDay: string): number {
  const start = parseISO(startDay)
  const occurrence = parseISO(occurrenceDay)
  if (Number.isNaN(start.getTime()) || Number.isNaN(occurrence.getTime())) return 0
  let years = occurrence.getFullYear() - start.getFullYear()
  const anniversaryThisYear = new Date(occurrence.getFullYear(), start.getMonth(), start.getDate())
  if (occurrence < anniversaryThisYear) years -= 1
  return years
}

function fullName(user: User, profile?: CelebrationProfile): string {
  const legal = profile?.legalName?.trim()
  if (legal && legal.includes(' ')) return legal
  return user.name.trim() || legal || 'Teammate'
}

/**
 * Birthday and work-anniversary rows for the calendar.
 * Names come from the directory (or legal name), never a nickname.
 * A work anniversary is omitted until a full year has passed.
 */
export function buildCelebrationEvents(
  users: User[],
  profiles: CelebrationProfile[],
  today = new Date(),
): EventItem[] {
  const todayIso = format(today, 'yyyy-MM-dd')
  const byUser = new Map(profiles.filter((p) => !p.archived).map((p) => [p.userId, p]))
  const events: EventItem[] = []

  for (const user of users) {
    if (!user.active) continue
    const profile = byUser.get(user.id)
    const name = fullName(user, profile)

    const birthday = isoDay(profile?.dateOfBirth)
    if (birthday) {
      const date = nextOccurrence(birthday, todayIso)
      if (date) {
        events.push({
          id: `bday_${user.id}_${date}`,
          title: `${name}'s birthday`,
          date,
          audience: 'all',
          source: 'workspace',
        })
      }
    }

    const started = isoDay(profile?.startDate) ?? isoDay(user.joinedAt)
    if (started) {
      const date = nextOccurrence(started, todayIso)
      if (date) {
        const years = fullYearsBetween(started, date)
        if (years >= 1) {
          events.push({
            id: `anniv_${user.id}_${date}`,
            title: `${name} — ${years} year${years === 1 ? '' : 's'} at AfriVate`,
            date,
            audience: 'all',
            source: 'workspace',
          })
        }
      }
    }
  }

  return events
}

/** Stored rows that are auto celebrations, so nicknames are not shown twice. */
export function isGeneratedCelebrationTitle(title: string): boolean {
  return /\bbirthday\b|\bwork anniversary\b|\byear(?:s)? at afri?vate\b/i.test(title)
}
