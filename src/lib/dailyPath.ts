import { endOfWeek, parseISO, startOfWeek } from 'date-fns'
import type { LeaveRequest, User, WeeklyCheckIn } from '@/types'

export const ONBOARDING_DAYS = 30

export function isOnboardingActive(user: User | null | undefined, now = new Date()): boolean {
  if (!user?.joinedAt) return false
  const joined = new Date(user.joinedAt)
  if (Number.isNaN(joined.getTime())) return false
  const days = (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24)
  return days <= ONBOARDING_DAYS
}

/** Thursday–Sunday: weekly update is the ritual for the week. */
export function isWeeklyUpdateWindow(now = new Date()): boolean {
  const day = now.getDay()
  return day === 0 || day >= 4
}

export function currentWeekStartIso(now = new Date()): string {
  return startOfWeek(now, { weekStartsOn: 1 }).toISOString()
}

export function isSameIsoWeek(a: string, b: string): boolean {
  return (
    startOfWeek(parseISO(a), { weekStartsOn: 1 }).toISOString() ===
    startOfWeek(parseISO(b), { weekStartsOn: 1 }).toISOString()
  )
}

export function hasWeeklyUpdateThisWeek(
  checkIns: WeeklyCheckIn[],
  userId: string,
  now = new Date(),
): boolean {
  const weekStart = currentWeekStartIso(now)
  return checkIns.some((c) => c.userId === userId && isSameIsoWeek(c.weekStart, weekStart))
}

export function leaveTouchesThisWeek(leave: LeaveRequest, now = new Date()): boolean {
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  const from = parseISO(leave.startDate)
  const to = parseISO(leave.endDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false
  return from <= end && to >= start
}

export function isWeeklyUpdatePrimary(opts: {
  submittedThisWeek: boolean
  now?: Date
}): boolean {
  return isWeeklyUpdateWindow(opts.now) || !opts.submittedThisWeek
}
