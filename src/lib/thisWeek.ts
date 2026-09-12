import { format, isSameDay, parseISO, startOfDay } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarCheck,
  CalendarDays,
  IdCard,
  ListChecks,
  Megaphone,
  PlayCircle,
  UserPlus,
} from 'lucide-react'
import type {
  Announcement,
  Department,
  EventItem,
  LeaveRequest,
  Task,
  User,
  WeeklyCheckIn,
  WorkspaceTeam,
} from '@/types'
import type { EmployeeProfile } from '@/types/hr'
import { unreadAnnouncementsFor } from '@/lib/announcementVisibility'
import {
  hasWeeklyUpdateThisWeek,
  isOnboardingActive,
  leaveTouchesThisWeek,
} from '@/lib/dailyPath'
import { eventVisibleToUser } from '@/lib/peopleMomentEvents'
import { isFirstTimePendingUser, usersAwaitingApproval } from '@/context/dataContextShared'
import { managesPeople } from '@/lib/orgStructure'
import { isHR, isLead, isDueToday, isOverdue } from '@/utils/helpers'
import { leaveRequestsForManager } from '@/utils/leaveScope'
import { managedReportIds } from '@/utils/hrMetrics'

export type ThisWeekItem = {
  id: string
  title: string
  detail: string
  to: string
  icon: LucideIcon
}

function isMyTask(task: Task, userId: string): boolean {
  if (task.ownerId === userId) return true
  if (task.assigneeIds?.includes(userId)) return true
  return task.assigneeId === userId
}

function nextVisibleEvent(events: EventItem[], user: User, users: User[], now = new Date()): EventItem | undefined {
  const today = startOfDay(now)
  return events
    .filter((e) => eventVisibleToUser(e, user, users))
    .filter((e) => {
      const d = parseISO(e.date)
      if (Number.isNaN(d.getTime())) return false
      return startOfDay(d) >= today
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))[0]
}

export function buildThisWeekItems(opts: {
  user: User
  users: User[]
  teams: WorkspaceTeam[]
  departments: Department[]
  tasks: Task[]
  leaveRequests: LeaveRequest[]
  events: EventItem[]
  announcements: Announcement[]
  checkIns: WeeklyCheckIn[]
  onboardingVideoTotal: number
  onboardingWatched: number
  employeeProfiles: EmployeeProfile[]
}): ThisWeekItem[] {
  const {
    user,
    users,
    teams,
    departments,
    tasks,
    leaveRequests,
    events,
    announcements,
    checkIns,
    onboardingVideoTotal,
    onboardingWatched,
    employeeProfiles,
  } = opts
  const items: ThisWeekItem[] = []
  const lead = (isLead(user) || managesPeople(user, teams, departments)) && !isHR(user)

  if (isOnboardingActive(user) && onboardingVideoTotal > 0 && onboardingWatched < onboardingVideoTotal) {
    items.push({
      id: 'onboarding',
      title: 'Continue getting started',
      detail: `${onboardingWatched} of ${onboardingVideoTotal} welcome videos watched`,
      to: '/onboarding?tab=checklist',
      icon: PlayCircle,
    })
  }

  if (isHR(user)) {
    const waiting = usersAwaitingApproval(users).length
    if (waiting > 0) {
      items.push({
        id: 'access-requests',
        title: waiting === 1 ? '1 access request waiting' : `${waiting} access requests waiting`,
        detail: 'Review them in Admin.',
        to: '/admin?section=approvals',
        icon: UserPlus,
      })
    }
    const incomplete = employeeProfiles.filter((p) => {
      if (p.archived || p.profileCompleteness >= 80) return false
      const person = users.find((u) => u.id === p.userId)
      if (!person?.active || isFirstTimePendingUser(person)) return false
      return true
    }).length
    if (incomplete > 0) {
      items.push({
        id: 'incomplete-files',
        title:
          incomplete === 1
            ? '1 team file needs an update'
            : `${incomplete} team files need an update`,
        detail: 'Ask them to finish My info, or open the file in Admin.',
        to: '/admin?section=employees',
        icon: IdCard,
      })
    }
  }

  if (lead || isHR(user)) {
    const pendingForMe = leaveRequestsForManager(leaveRequests, user, users, teams, departments).filter(
      (l) => l.status === 'pending' && l.userId !== user.id,
    )
    if (pendingForMe.length > 0) {
      items.push({
        id: 'leave-approve',
        title:
          pendingForMe.length === 1
            ? '1 time-off request to review'
            : `${pendingForMe.length} time-off requests to review`,
        detail: 'People are waiting on your decision.',
        to: '/people/leave',
        icon: CalendarDays,
      })
    }
  }

  const myOpen = tasks.filter((t) => t.status !== 'done' && isMyTask(t, user.id))
  const dueToday = myOpen.filter((t) => isDueToday(t.dueDate)).length
  const overdue = myOpen.filter((t) => isOverdue(t.dueDate)).length
  if (dueToday > 0 || overdue > 0) {
    const parts: string[] = []
    if (overdue > 0) parts.push(`${overdue} overdue`)
    if (dueToday > 0) parts.push(`${dueToday} due today`)
    items.push({
      id: 'my-work',
      title: 'My work today',
      detail: parts.join(' · '),
      to: '/tasks',
      icon: ListChecks,
    })
  }

  const submitted = hasWeeklyUpdateThisWeek(checkIns, user.id)
  if (!submitted) {
    items.push({
      id: 'weekly-write',
      title: 'Send this week’s update',
      detail: 'A short note on what you finished, what’s next, and blockers.',
      to: '/checkin',
      icon: CalendarCheck,
    })
  } else if (lead || isHR(user)) {
    const reportIds = managedReportIds(user, users, teams, departments)
    const missing = [...reportIds].filter((id) => {
      const person = users.find((u) => u.id === id)
      return person?.active && !hasWeeklyUpdateThisWeek(checkIns, id)
    }).length
    if (missing > 0) {
      items.push({
        id: 'weekly-team',
        title: missing === 1 ? '1 person has not sent a weekly update' : `${missing} people have not sent a weekly update`,
        detail: 'Open the team tab to see who is still outstanding.',
        to: '/checkin',
        icon: CalendarCheck,
      })
    }
  }

  const nextEvent = nextVisibleEvent(events, user, users)
  if (nextEvent) {
    const when = isSameDay(parseISO(nextEvent.date), new Date())
      ? `Today${nextEvent.startTime ? ` · ${nextEvent.startTime}` : ''}`
      : format(parseISO(nextEvent.date), 'EEE d MMM')
    items.push({
      id: 'next-event',
      title: nextEvent.title,
      detail: when + (nextEvent.location ? ` · ${nextEvent.location}` : ''),
      to: '/events',
      icon: CalendarDays,
    })
  }

  const myLeave = leaveRequests.filter(
    (l) =>
      l.userId === user.id &&
      (l.status === 'pending' || l.status === 'approved') &&
      leaveTouchesThisWeek(l),
  )
  if (myLeave.length > 0) {
    const pending = myLeave.filter((l) => l.status === 'pending').length
    items.push({
      id: 'my-leave',
      title: pending > 0 ? 'Your time off is waiting for review' : 'You have time off this week',
      detail: pending > 0 ? 'Track it under Time off.' : 'Dates are on your Time off page.',
      to: '/people/leave',
      icon: CalendarDays,
    })
  }

  const unreadMemos = unreadAnnouncementsFor(announcements, user).length
  if (unreadMemos > 0) {
    items.push({
      id: 'memos',
      title: unreadMemos === 1 ? '1 unread memo' : `${unreadMemos} unread memos`,
      detail: 'Catch up when you have a minute.',
      to: '/announcements?unread=1',
      icon: Megaphone,
    })
  }

  return items.slice(0, 7)
}
