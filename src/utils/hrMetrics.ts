import type { HrMetrics } from '@/context/hrContextShared'
import type {
  ExitInterview,
  FeedbackEntry,
  Grievance,
  JobCandidate,
  LearningAssignment,
  LearningSubmission,
  Okr,
  OneOnOneLog,
  PulseResponse,
  PulseSurvey,
} from '@/types/hr'
import type { Department, DocumentItem, LeaveRequest, RecognitionPost, User, WorkspaceTeam } from '@/types'
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
  okrs: Okr[]
  feedbackEntries: FeedbackEntry[]
  recognition: RecognitionPost[]
}

export function directReportIds(users: User[], managerId: string): Set<string> {
  return new Set(users.filter((u) => u.active && u.reportsToId === managerId).map((u) => u.id))
}

/**
 * Everyone a user manages — regardless of their portal role. Combines:
 *   1. Direct reports (reports_to)
 *   2. Members of teams they lead (team lead or assistant lead)
 *   3. Members of departments they head
 *
 * This makes leadership assignment-based, so an admin (or any role) assigned as
 * a team lead / department head gets the matching management scope.
 */
export function managedReportIds(
  user: User,
  users: User[],
  teams: WorkspaceTeam[],
  departments: Department[],
): Set<string> {
  const ids = new Set<string>()
  const activeIds = new Set(users.filter((u) => u.active).map((u) => u.id))

  for (const u of users) {
    if (u.active && u.id !== user.id && u.reportsToId === user.id) ids.add(u.id)
  }

  for (const t of teams) {
    if (t.leadUserId === user.id || t.asstLeadUserId === user.id) {
      for (const memberId of t.memberIds) {
        if (memberId !== user.id && activeIds.has(memberId)) ids.add(memberId)
      }
    }
  }

  const headedDeptNames = new Set(
    departments.filter((d) => d.headUserId === user.id).map((d) => d.name),
  )
  if (headedDeptNames.size > 0) {
    for (const u of users) {
      if (u.active && u.id !== user.id && headedDeptNames.has(u.department)) ids.add(u.id)
    }
  }

  return ids
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
    okrs,
    feedbackEntries,
    recognition,
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
  const onboardingSurveyIds = new Set(
    pulseSurveys.filter((s) => s.surveyType === 'onboarding').map((s) => s.id),
  )

  const scopedPulseResponses = memberIds
    ? pulseResponses.filter((r) => scopedUserIds.has(r.userId))
    : pulseResponses

  const pulseOnlyResponses = scopedPulseResponses.filter((r) => pulseSurveyIds.has(r.surveyId))
  const enpsResponses = scopedPulseResponses.filter((r) => enpsSurveyIds.has(r.surveyId))
  const onboardingResponses = scopedPulseResponses.filter((r) =>
    onboardingSurveyIds.has(r.surveyId),
  )
  const onboardingSatisfaction = computePulseEngagement(onboardingResponses)

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

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1}` as Okr['quarter']
  const currentMonthPrefix = now.toISOString().slice(0, 7)

  const currentOkrKrs = okrs
    .filter(
      (o) =>
        scopedUserIds.has(o.userId) && o.year === currentYear && o.quarter === currentQuarter,
    )
    .flatMap((o) => o.keyResults)
  const okrAchievement =
    currentOkrKrs.length > 0
      ? Math.round(
          currentOkrKrs.reduce((sum, kr) => sum + (kr.progress ?? 0), 0) / currentOkrKrs.length,
        )
      : null

  const recognitionVolume = recognition.filter(
    (r) =>
      r.createdAt.slice(0, 7) === currentMonthPrefix &&
      (scopedUserIds.has(r.receiverId) || scopedUserIds.has(r.giverId)),
  ).length

  const valuesAlignment = computePulseEngagement(
    feedbackEntries.filter((e) => scopedUserIds.has(e.subjectUserId)),
  )

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
    okrAchievement,
    recognitionVolume,
    valuesAlignment,
    onboardingSatisfaction,
  }
}
