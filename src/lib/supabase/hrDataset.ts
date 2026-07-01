import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DocumentAcknowledgment,
  ExitInterview,
  FeedbackCycle,
  FeedbackEntry,
  Grievance,
  IndividualDevelopmentPlan,
  JobCandidate,
  JobRequisition,
  LearningAssignment,
  LearningSubmission,
  Okr,
  OkrKeyResult,
  OneOnOneLog,
  OnboardingMilestone,
  PulseQuestion,
  PulseResponse,
  PulseSurvey,
  QuarterlyAward,
} from '@/types/hr'

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(String)
}

export function rowToPulseSurvey(r: Record<string, unknown>): PulseSurvey {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    description: r.description ? String(r.description) : undefined,
    surveyType: String(r.survey_type ?? 'pulse') as PulseSurvey['surveyType'],
    questions: Array.isArray(r.questions) ? (r.questions as PulseQuestion[]) : [],
    active: Boolean(r.active),
    opensAt: r.opens_at ? String(r.opens_at) : undefined,
    closesAt: r.closes_at ? String(r.closes_at) : undefined,
    createdById: r.created_by ? String(r.created_by) : undefined,
    createdAt: String(r.created_at),
  }
}

export function rowToPulseResponse(r: Record<string, unknown>): PulseResponse {
  return {
    id: String(r.id),
    surveyId: String(r.survey_id),
    userId: String(r.user_id),
    answers: (r.answers && typeof r.answers === 'object' ? r.answers : {}) as Record<string, string | number>,
    submittedAt: String(r.submitted_at),
  }
}

export function rowToLearningAssignment(r: Record<string, unknown>): LearningAssignment {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    alisonUrl: String(r.alison_url ?? ''),
    description: r.description ? String(r.description) : undefined,
    dueDate: r.due_date ? String(r.due_date) : undefined,
    monthLabel: r.month_label ? String(r.month_label) : undefined,
    active: Boolean(r.active),
    createdAt: String(r.created_at),
  }
}

export function rowToLearningSubmission(r: Record<string, unknown>): LearningSubmission {
  return {
    id: String(r.id),
    assignmentId: String(r.assignment_id),
    userId: String(r.user_id),
    courseName: String(r.course_name ?? ''),
    completedAt: String(r.completed_at),
    certificatePath: r.certificate_path ? String(r.certificate_path) : undefined,
    status: String(r.status ?? 'pending') as LearningSubmission['status'],
    reviewerNote: r.reviewer_note ? String(r.reviewer_note) : undefined,
    reviewedById: r.reviewed_by ? String(r.reviewed_by) : undefined,
    reviewedAt: r.reviewed_at ? String(r.reviewed_at) : undefined,
    submittedAt: String(r.submitted_at),
  }
}

export function rowToDocumentAck(r: Record<string, unknown>): DocumentAcknowledgment {
  return {
    id: String(r.id),
    documentId: String(r.document_id),
    userId: String(r.user_id),
    acknowledgedAt: String(r.acknowledged_at),
  }
}

export function rowToOkr(r: Record<string, unknown>): Okr {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    year: Number(r.year),
    quarter: String(r.quarter) as Okr['quarter'],
    objective: String(r.objective ?? ''),
    keyResults: Array.isArray(r.key_results) ? (r.key_results as OkrKeyResult[]) : [],
    updatedAt: String(r.updated_at),
  }
}

export function rowToOneOnOneLog(r: Record<string, unknown>): OneOnOneLog {
  return {
    id: String(r.id),
    employeeId: String(r.employee_id),
    managerId: String(r.manager_id),
    month: String(r.month),
    completed: Boolean(r.completed),
    createdAt: String(r.created_at),
  }
}

export function rowToIdp(r: Record<string, unknown>): IndividualDevelopmentPlan {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    content: String(r.content ?? ''),
    status: String(r.status ?? 'draft') as IndividualDevelopmentPlan['status'],
    managerNote: r.manager_note ? String(r.manager_note) : undefined,
    updatedAt: String(r.updated_at),
    reviewedAt: r.reviewed_at ? String(r.reviewed_at) : undefined,
  }
}

export function rowToFeedbackCycle(r: Record<string, unknown>): FeedbackCycle {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    year: Number(r.year),
    half: String(r.half) as FeedbackCycle['half'],
    status: String(r.status ?? 'draft') as FeedbackCycle['status'],
    questions: Array.isArray(r.questions) ? (r.questions as PulseQuestion[]) : [],
    opensAt: r.opens_at ? String(r.opens_at) : undefined,
    closesAt: r.closes_at ? String(r.closes_at) : undefined,
  }
}

export function rowToFeedbackEntry(r: Record<string, unknown>): FeedbackEntry {
  return {
    id: String(r.id),
    cycleId: String(r.cycle_id),
    subjectUserId: String(r.subject_user_id),
    reviewerId: String(r.reviewer_id),
    relationship: String(r.relationship) as FeedbackEntry['relationship'],
    answers: (r.answers && typeof r.answers === 'object' ? r.answers : {}) as Record<string, string | number>,
    submittedAt: String(r.submitted_at),
  }
}

export function rowToJobRequisition(r: Record<string, unknown>): JobRequisition {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    department: String(r.department ?? ''),
    status: String(r.status ?? 'open') as JobRequisition['status'],
    description: r.description ? String(r.description) : undefined,
    createdById: r.created_by ? String(r.created_by) : undefined,
    createdAt: String(r.created_at),
  }
}

export function rowToFeedbackAssignment(r: Record<string, unknown>): import('@/types/hr').FeedbackAssignment {
  return {
    id: String(r.id),
    cycleId: String(r.cycle_id),
    subjectUserId: String(r.subject_user_id),
    reviewerId: String(r.reviewer_id),
    relationship: String(r.relationship) as import('@/types/hr').FeedbackAssignment['relationship'],
    createdAt: String(r.created_at),
  }
}

export function rowToJobCandidate(r: Record<string, unknown>): JobCandidate {
  return {
    id: String(r.id),
    requisitionId: String(r.requisition_id),
    name: String(r.name ?? ''),
    email: r.email ? String(r.email) : undefined,
    stage: String(r.stage ?? 'applied') as JobCandidate['stage'],
    notes: r.notes ? String(r.notes) : undefined,
    score: r.score != null ? Number(r.score) : undefined,
    appliedAt: r.applied_at ? String(r.applied_at) : undefined,
    updatedAt: String(r.updated_at),
  }
}

export function rowToExitInterview(r: Record<string, unknown>): ExitInterview {
  return {
    id: String(r.id),
    userId: r.user_id ? String(r.user_id) : undefined,
    departingName: String(r.departing_name ?? ''),
    lastDay: r.last_day ? String(r.last_day) : undefined,
    reasons: readStringArray(r.reasons),
    notes: r.notes ? String(r.notes) : undefined,
    conductedById: r.conducted_by ? String(r.conducted_by) : undefined,
    createdAt: String(r.created_at),
  }
}

export function rowToGrievance(r: Record<string, unknown>): Grievance {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    category: String(r.category ?? ''),
    body: String(r.body ?? ''),
    status: String(r.status ?? 'open') as Grievance['status'],
    hrNote: r.hr_note ? String(r.hr_note) : undefined,
    confidential: Boolean(r.confidential),
    createdAt: String(r.created_at),
  }
}

export function rowToOnboardingMilestone(r: Record<string, unknown>): OnboardingMilestone {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    phase: String(r.phase) as OnboardingMilestone['phase'],
    label: String(r.label ?? ''),
    completed: Boolean(r.completed),
    completedAt: r.completed_at ? String(r.completed_at) : undefined,
    dueDate: r.due_date ? String(r.due_date) : undefined,
  }
}

export function rowToQuarterlyAward(r: Record<string, unknown>): QuarterlyAward {
  return {
    id: String(r.id),
    year: Number(r.year),
    quarter: String(r.quarter) as QuarterlyAward['quarter'],
    category: String(r.category) as QuarterlyAward['category'],
    winnerId: String(r.winner_id),
    nominatedById: r.nominated_by ? String(r.nominated_by) : undefined,
    note: r.note ? String(r.note) : undefined,
    createdAt: String(r.created_at),
  }
}

export interface HrDataset {
  pulseSurveys: PulseSurvey[]
  pulseResponses: PulseResponse[]
  learningAssignments: LearningAssignment[]
  learningSubmissions: LearningSubmission[]
  documentAcknowledgments: DocumentAcknowledgment[]
  okrs: Okr[]
  oneOnOneLogs: OneOnOneLog[]
  idps: IndividualDevelopmentPlan[]
  feedbackCycles: FeedbackCycle[]
  feedbackEntries: FeedbackEntry[]
  feedbackAssignments: import('@/types/hr').FeedbackAssignment[]
  jobRequisitions: JobRequisition[]
  jobCandidates: JobCandidate[]
  exitInterviews: ExitInterview[]
  grievances: Grievance[]
  onboardingMilestones: OnboardingMilestone[]
  quarterlyAwards: QuarterlyAward[]
}

export async function fetchHrDataset(client: SupabaseClient): Promise<HrDataset> {
  const [
    surveysRes,
    responsesRes,
    assignmentsRes,
    submissionsRes,
    acksRes,
    okrsRes,
    o1Res,
    idpsRes,
    cyclesRes,
    entriesRes,
    assignRes,
    jobsRes,
    candidatesRes,
    exitRes,
    grievancesRes,
    milestonesRes,
    awardsRes,
  ] = await Promise.all([
    client.from('portal_pulse_surveys').select('*').order('created_at', { ascending: false }),
    client.from('portal_pulse_responses').select('*').order('submitted_at', { ascending: false }),
    client.from('portal_learning_assignments').select('*').order('created_at', { ascending: false }),
    client.from('portal_learning_submissions').select('*').order('submitted_at', { ascending: false }),
    client.from('portal_document_acknowledgments').select('*').order('acknowledged_at', { ascending: false }),
    client.from('portal_okrs').select('*').order('updated_at', { ascending: false }),
    client.from('portal_one_on_one_logs').select('*').order('created_at', { ascending: false }),
    client.from('portal_idps').select('*').order('updated_at', { ascending: false }),
    client.from('portal_feedback_cycles').select('*').order('year', { ascending: false }),
    client.from('portal_feedback_entries').select('*').order('submitted_at', { ascending: false }),
    client.from('portal_feedback_assignments').select('*').order('created_at', { ascending: false }),
    client.from('portal_job_requisitions').select('*').order('created_at', { ascending: false }),
    client.from('portal_job_candidates').select('*').order('updated_at', { ascending: false }),
    client.from('portal_exit_interviews').select('*').order('created_at', { ascending: false }),
    client.from('portal_grievances').select('*').order('created_at', { ascending: false }),
    client.from('portal_onboarding_milestones').select('*'),
    client.from('portal_quarterly_awards').select('*').order('created_at', { ascending: false }),
  ])

  const err =
    surveysRes.error ||
    responsesRes.error ||
    assignmentsRes.error ||
    submissionsRes.error ||
    acksRes.error ||
    okrsRes.error ||
    o1Res.error ||
    idpsRes.error ||
    cyclesRes.error ||
    entriesRes.error ||
    assignRes.error ||
    jobsRes.error ||
    candidatesRes.error ||
    exitRes.error ||
    grievancesRes.error ||
    milestonesRes.error ||
    awardsRes.error

  if (err) throw new Error(err.message)

  const map = <T>(rows: unknown[] | null, fn: (r: Record<string, unknown>) => T) =>
    (rows ?? []).map((r) => fn(r as Record<string, unknown>))

  return {
    pulseSurveys: map(surveysRes.data, rowToPulseSurvey),
    pulseResponses: map(responsesRes.data, rowToPulseResponse),
    learningAssignments: map(assignmentsRes.data, rowToLearningAssignment),
    learningSubmissions: map(submissionsRes.data, rowToLearningSubmission),
    documentAcknowledgments: map(acksRes.data, rowToDocumentAck),
    okrs: map(okrsRes.data, rowToOkr),
    oneOnOneLogs: map(o1Res.data, rowToOneOnOneLog),
    idps: map(idpsRes.data, rowToIdp),
    feedbackCycles: map(cyclesRes.data, rowToFeedbackCycle),
    feedbackEntries: map(entriesRes.data, rowToFeedbackEntry),
    feedbackAssignments: map(assignRes.data, rowToFeedbackAssignment),
    jobRequisitions: map(jobsRes.data, rowToJobRequisition),
    jobCandidates: map(candidatesRes.data, rowToJobCandidate),
    exitInterviews: map(exitRes.data, rowToExitInterview),
    grievances: map(grievancesRes.data, rowToGrievance),
    onboardingMilestones: map(milestonesRes.data, rowToOnboardingMilestone),
    quarterlyAwards: map(awardsRes.data, rowToQuarterlyAward),
  }
}
