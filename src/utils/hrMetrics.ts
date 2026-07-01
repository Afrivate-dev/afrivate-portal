import type { HrMetrics } from '@/context/hrContextShared'
import type {
  Grievance,
  LearningAssignment,
  LearningSubmission,
  OneOnOneLog,
  PulseResponse,
  PulseSurvey,
} from '@/types/hr'
import type { LeaveRequest, User } from '@/types'
import { computeEnps, computePulseEngagement, extractEnpsScores, isSurveyOpen } from '@/utils/hrSurvey'

export type HrMetricsOptions = {
  /** Limit people metrics to these user IDs (e.g. direct reports). */
  memberIds?: Set<string>
  /** When pulse rows are RLS-restricted, inject server-side aggregates. */
  pulseOverrides?: Pick<HrMetrics, 'engagementScore' | 'enpsScore'>
}

export function directReportIds(users: User[], managerId: string): Set<string> {
  return new Set(users.filter((u) => u.active && u.reportsToId === managerId).map((u) => u.id))
}

export function computeHrMetrics(
  input: {
    pulseSurveys: PulseSurvey[]
    pulseResponses: PulseResponse[]
    learningAssignments: LearningAssignment[]
    learningSubmissions: LearningSubmission[]
    oneOnOneLogs: OneOnOneLog[]
    grievances: Grievance[]
    users: User[]
    leaveRequests: LeaveRequest[]
  },
  options?: HrMetricsOptions,
): HrMetrics {
  const {
    pulseSurveys,
    pulseResponses,
    learningAssignments,
    learningSubmissions,
    oneOnOneLogs,
    grievances,
    users,
    leaveRequests,
  } = input

  const memberIds = options?.memberIds
  const scopedUsers = memberIds
    ? users.filter((u) => u.active && memberIds.has(u.id))
    : users.filter((u) => u.active)

  const headcount = scopedUsers.length
  const scopedUserIds = new Set(scopedUsers.map((u) => u.id))

  const pulseSurveyIds = new Set(
    pulseSurveys.filter((s) => s.surveyType === 'pulse').map((s) => s.id),
  )
  const enpsSurveyIds = new Set(
    pulseSurveys.filter((s) => s.surveyType === 'enps').map((s) => s.id),
  )

  const scopedPulseResponses = memberIds
    ? pulseResponses.filter((r) => scopedUserIds.has(r.userId))
    : pulseResponses

  const pulseOnlyResponses = scopedPulseResponses.filter((r) => pulseSurveyIds.has(r.surveyId))
  const enpsResponses = scopedPulseResponses.filter((r) => enpsSurveyIds.has(r.surveyId))

  const engagementScore =
    options?.pulseOverrides?.engagementScore ?? computePulseEngagement(pulseOnlyResponses)
  const enpsScore =
    options?.pulseOverrides?.enpsScore ?? computeEnps(extractEnpsScores(enpsResponses))

  const activeAssignment = learningAssignments.find((a) => a.active)
  let ldCompletionRate: number | null = null
  if (activeAssignment && headcount > 0) {
    const completed = scopedUsers.filter((u) =>
      learningSubmissions.some(
        (s) =>
          s.assignmentId === activeAssignment.id &&
          s.userId === u.id &&
          s.status === 'approved',
      ),
    ).length
    ldCompletionRate = Math.round((completed / headcount) * 100)
  }

  const thisMonth = new Date().toISOString().slice(0, 7)
  const employeesWithManagers = scopedUsers.filter((u) => u.reportsToId)
  const completedOneOnOnes = new Set(
    oneOnOneLogs
      .filter((l) => l.month === thisMonth && l.completed && scopedUserIds.has(l.employeeId))
      .map((l) => l.employeeId),
  )
  const oneOnOneRate =
    employeesWithManagers.length > 0
      ? Math.round(
          (employeesWithManagers.filter((u) => completedOneOnOnes.has(u.id)).length /
            employeesWithManagers.length) *
            100,
        )
      : null

  const scopedLeave = memberIds
    ? leaveRequests.filter((l) => scopedUserIds.has(l.userId))
    : leaveRequests

  const scopedGrievances = memberIds
    ? grievances.filter((g) => scopedUserIds.has(g.userId))
    : grievances

  const scopedLearningSubmissions = memberIds
    ? learningSubmissions.filter((s) => scopedUserIds.has(s.userId))
    : learningSubmissions

  return {
    engagementScore,
    enpsScore,
    ldCompletionRate,
    oneOnOneRate,
    openGrievances: scopedGrievances.filter((g) => g.status !== 'resolved').length,
    pendingLearningReviews: scopedLearningSubmissions.filter((s) => s.status === 'pending').length,
    activeSurveys: pulseSurveys.filter((s) => isSurveyOpen(s)).length,
    headcount,
    pendingLeave: scopedLeave.filter((l) => l.status === 'pending').length,
  }
}
