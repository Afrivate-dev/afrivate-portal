import type { HrMetrics } from '@/context/hrContextShared'
import type {
  ExitInterview,
  Grievance,
  JobCandidate,
  LearningAssignment,
  LearningSubmission,
  OneOnOneLog,
  PulseResponse,
  PulseSurvey,
} from '@/types/hr'
import type { DocumentItem, LeaveRequest, User } from '@/types'
import { computeEnps, computePulseEngagement, extractEnpsScores, isSurveyOpen } from '@/utils/hrSurvey'

export type HrMetricsOptions = {
  memberIds?: Set<string>
  pulseOverrides?: Pick<HrMetrics, 'engagementScore' | 'enpsScore'>
}

export type HrMetricsInput = {
  pulseSurveys: PulseSurvey[]
  pulseResponses: PulseResponse[]
  learningAssignments: LearningAssignment[]
  learningSubmissions: LearningSubmission[]
  oneOnOneLogs: OneOnOneLog[]
  grievances: Grievance[]
  users: User[]
  leaveRequests: LeaveRequest[]
  exitInterviews: ExitInterview[]
  jobCandidates: JobCandidate[]
  documents: DocumentItem[]
  documentAcknowledgments: { userId: string; documentId: string }[]
}

export function directReportIds(users: User[], managerId: string): Set<string> {
  return new Set(users.filter((u) => u.active && u.reportsToId === managerId).map((u) => u.id))
}

export function computeHrMetrics(input: HrMetricsInput, options?: HrMetricsOptions): HrMetrics {
  const {
    pulseSurveys,
    pulseResponses,
    learningAssignments,
    learningSubmissions,
    oneOnOneLogs,
    grievances,
    users,
    leaveRequests,
    exitInterviews,
    jobCandidates,
    documents,
    documentAcknowledgments,
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

  const openActiveSurveys = pulseSurveys.filter((s) => isSurveyOpen(s))
  let surveyCompletionRate: number | null = null
  if (openActiveSurveys.length > 0 && headcount > 0) {
    const responded = scopedUsers.filter((u) =>
      openActiveSurveys.some((s) =>
        pulseResponses.some((r) => r.surveyId === s.id && r.userId === u.id),
      ),
    ).length
    surveyCompletionRate = Math.round((responded / headcount) * 100)
  }

  const requiredDocs = documents.filter((d) => d.requiresAcknowledgment)
  let policyAckRate: number | null = null
  if (requiredDocs.length > 0 && headcount > 0) {
    const fullyAcked = scopedUsers.filter((u) =>
      requiredDocs.every((doc) =>
        documentAcknowledgments.some((a) => a.userId === u.id && a.documentId === doc.id),
      ),
    ).length
    policyAckRate = Math.round((fullyAcked / headcount) * 100)
  }

  const yearAgo = Date.now() - 365 * 86400000
  const recentExits = exitInterviews.filter(
    (ex) => new Date(ex.createdAt).getTime() >= yearAgo,
  ).length
  const attritionRate = headcount > 0 ? Math.round((recentExits / headcount) * 100) : null

  const hired = jobCandidates.filter((c) => c.stage === 'hired' && c.appliedAt)
  let avgTimeToHireDays: number | null = null
  if (hired.length > 0) {
    const totalDays = hired.reduce((sum, c) => {
      const start = new Date(c.appliedAt!).getTime()
      const end = new Date(c.updatedAt).getTime()
      return sum + Math.max(0, Math.round((end - start) / 86400000))
    }, 0)
    avgTimeToHireDays = Math.round(totalDays / hired.length)
  }

  return {
    engagementScore,
    enpsScore,
    ldCompletionRate,
    oneOnOneRate,
    openGrievances: scopedGrievances.filter((g) => g.status !== 'resolved').length,
    pendingLearningReviews: scopedLearningSubmissions.filter((s) => s.status === 'pending').length,
    activeSurveys: openActiveSurveys.length,
    headcount,
    pendingLeave: scopedLeave.filter((l) => l.status === 'pending').length,
    attritionRate,
    avgTimeToHireDays,
    policyAckRate,
    surveyCompletionRate,
  }
}
