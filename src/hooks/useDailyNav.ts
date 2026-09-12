import { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { visibleNavItems, type NavItem } from '@/config/nav'
import { unreadAnnouncementsFor } from '@/lib/announcementVisibility'
import {
  hasWeeklyUpdateThisWeek,
  isOnboardingActive,
  isWeeklyUpdatePrimary,
} from '@/lib/dailyPath'
import { isSuspended } from '@/lib/dutyStatus'

function isPrimaryPath(
  to: string,
  unreadInbox: number,
  weeklyPrimary: boolean,
): boolean {
  if (to === '/' || to === '/tasks' || to === '/people') return true
  if (to === '/inbox') return unreadInbox > 0
  if (to === '/checkin') return weeklyPrimary
  if (to === '/onboarding') return true
  return false
}

export function useDailyNav(): {
  primary: NavItem[]
  more: NavItem[]
  bottom: NavItem[]
  unreadInbox: number
  unreadMemos: number
} {
  const { user, role } = useAuth()
  const { inbox, announcements, checkIns } = useData()
  const all = visibleNavItems(user, role)

  const unreadInbox = user ? inbox.filter((n) => n.userId === user.id && !n.read).length : 0
  const unreadMemos = user ? unreadAnnouncementsFor(announcements, user).length : 0
  const submitted = user ? hasWeeklyUpdateThisWeek(checkIns, user.id) : true
  const weeklyPrimary = isWeeklyUpdatePrimary({ submittedThisWeek: submitted })
  const onboarding = isOnboardingActive(user)

  return useMemo(() => {
    if (isSuspended(user)) {
      return { primary: all, more: [], bottom: all.slice(0, 4), unreadInbox, unreadMemos }
    }

    const placed = all.filter((item) => (item.to === '/onboarding' ? onboarding : true))
    const primary = placed.filter((item) => isPrimaryPath(item.to, unreadInbox, weeklyPrimary))
    const more = placed.filter((item) => !isPrimaryPath(item.to, unreadInbox, weeklyPrimary))

    const byTo = (to: string) => placed.find((item) => item.to === to)
    const fourth =
      unreadInbox > 0 ? byTo('/inbox') : unreadMemos > 0 ? byTo('/announcements') : byTo('/inbox')
    const bottom = [byTo('/'), byTo('/tasks'), byTo('/people'), fourth].filter(
      (item): item is NavItem => Boolean(item),
    )

    return { primary, more, bottom, unreadInbox, unreadMemos }
  }, [all, onboarding, unreadInbox, unreadMemos, user, weeklyPrimary])
}
