import type { User, Task, LeaveRequest, WeeklyCheckIn } from '@/types'
import type { AvaRole, AvaUserContext } from '@/lib/ava/types'
import { isHR, isLead } from '@/utils/helpers'

function mondayOf(d = new Date()): string {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x.toISOString().slice(0, 10)
}

export function buildAvaUserContext(input: {
  user: User
  tasks: Task[]
  leaveRequests: LeaveRequest[]
  checkIns: WeeklyCheckIn[]
  managedUserIds?: string[]
  learningPendingForUser?: number
  openSurveysForUser?: number
  myInfoCompleteness?: number
  hrStats?: {
    pendingApprovals: number
    pendingLeaveOrg: number
    activePips: number
    pendingDiscipline: number
    pendingLearningReviews: number
  }
}): AvaUserContext {
  const { user } = input
  const role = user.role as AvaRole
  const myTasks = input.tasks.filter(
    (t) =>
      t.ownerId === user.id ||
      t.assigneeId === user.id ||
      (t.assigneeIds ?? []).includes(user.id),
  )
  const openTasks = myTasks.filter((t) => t.status !== 'done')
  const today = new Date().toISOString().slice(0, 10)
  const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < today)
  const myLeave = input.leaveRequests.filter((l) => l.userId === user.id)
  const pendingLeave = myLeave.filter((l) => l.status === 'pending').length
  const weekStart = mondayOf()
  const checkInThisWeek = input.checkIns.some(
    (c) => c.userId === user.id && c.weekStart === weekStart,
  )

  const ctx: AvaUserContext = {
    userId: user.id,
    name: user.name,
    role,
    department: user.department,
    jobTitle: user.jobTitle,
    personal: {
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      pendingLeave,
      recentLeave: myLeave
        .slice()
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .slice(0, 5)
        .map((l) => ({
          type: l.type,
          status: l.status,
          startDate: l.startDate,
          endDate: l.endDate,
        })),
      learningPending: input.learningPendingForUser ?? 0,
      openSurveys: input.openSurveysForUser ?? 0,
      checkInThisWeek,
      myInfoCompleteness: input.myInfoCompleteness,
    },
  }

  if (isLead(user) && input.managedUserIds?.length) {
    const managed = new Set(input.managedUserIds)
    ctx.lead = {
      pendingLeaveToReview: input.leaveRequests.filter(
        (l) => managed.has(l.userId) && l.status === 'pending',
      ).length,
      teamCheckInsThisWeek: input.checkIns.filter(
        (c) => managed.has(c.userId) && c.weekStart === weekStart,
      ).length,
    }
  }

  if (isHR(user) && input.hrStats) {
    ctx.hr = input.hrStats
  }

  return ctx
}
