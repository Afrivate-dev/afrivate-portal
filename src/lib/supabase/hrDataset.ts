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
  const breakdown =
    r.score_breakdown && typeof r.score_breakdown === 'object' && !Array.isArray(r.score_breakdown)
      ? (r.score_breakdown as Record<string, number>)
      : undefined
  return {
    id: String(r.id),
    requisitionId: String(r.requisition_id),
    name: String(r.name ?? ''),
    email: r.email ? String(r.email) : undefined,
    phone: r.phone ? String(r.phone) : undefined,
    linkedinUrl: r.linkedin_url ? String(r.linkedin_url) : undefined,
    location: r.location ? String(r.location) : undefined,
    stage: String(r.stage ?? 'applied') as JobCandidate['stage'],
    notes: r.notes ? String(r.notes) : undefined,
    score: r.score != null ? Number(r.score) : undefined,
    source: r.source ? (String(r.source) as JobCandidate['source']) : undefined,
    githubUrl: r.github_url ? String(r.github_url) : undefined,
    portfolioUrl: r.portfolio_url ? String(r.portfolio_url) : undefined,
    coverLetter: r.cover_letter != null ? Boolean(r.cover_letter) : undefined,
    resumeSummary: r.resume_summary ? String(r.resume_summary) : undefined,
    scoreBreakdown: breakdown,
    recommendation: r.recommendation
      ? (String(r.recommendation) as JobCandidate['recommendation'])
      : undefined,
    externalId: r.external_id ? String(r.external_id) : undefined,
    gmailThreadId:
      (r.gmail_thread_id ? String(r.gmail_thread_id) : undefined) ||
      parseGmailExternalId(r.external_id ? String(r.external_id) : undefined).threadId,
    gmailMessageId:
      (r.gmail_message_id ? String(r.gmail_message_id) : undefined) ||
      parseGmailExternalId(r.external_id ? String(r.external_id) : undefined).messageId,
    appliedAt: r.applied_at ? String(r.applied_at) : undefined,
    updatedAt: String(r.updated_at),
  }
}

/** Parse `gmail:messageId` or `gmail:threadId:messageId` from external_id. */
export function parseGmailExternalId(externalId?: string | null): {
  threadId?: string
  messageId?: string
} {
  if (!externalId || !externalId.startsWith('gmail:')) return {}
  const rest = externalId.slice('gmail:'.length).trim()
  if (!rest) return {}
  const parts = rest.split(':').filter(Boolean)
  if (parts.length >= 2) {
    return { threadId: parts[0], messageId: parts[1] }
  }
  return { messageId: parts[0] }
}

export function encodeGmailExternalId(threadId: string, messageId: string): string {
  return `gmail:${threadId}:${messageId}`
}

/**
 * Core candidate columns that exist on older schemas.
 * Identity/Gmail columns are optional — omitted when `includeIdentity` is false
 * so refresh/sync still works before migrations are applied.
 */
export function jobCandidateToRow(c: JobCandidate, opts?: { includeIdentity?: boolean }) {
  const includeIdentity = opts?.includeIdentity !== false
  const row: Record<string, unknown> = {
    id: c.id,
    requisition_id: c.requisitionId,
    name: c.name,
    email: c.email ?? null,
    stage: c.stage,
    notes: c.notes ?? null,
    score: c.score ?? null,
    source: c.source ?? null,
    github_url: c.githubUrl ?? null,
    portfolio_url: c.portfolioUrl ?? null,
    cover_letter: c.coverLetter ?? false,
    resume_summary: c.resumeSummary ?? null,
    score_breakdown: c.scoreBreakdown ?? {},
    recommendation: c.recommendation ?? null,
    external_id: c.externalId ?? null,
    applied_at: c.appliedAt ?? null,
    updated_at: c.updatedAt,
  }
  if (includeIdentity) {
    row.phone = c.phone ?? null
    row.linkedin_url = c.linkedinUrl ?? null
    row.location = c.location ?? null
    row.gmail_thread_id = c.gmailThreadId ?? null
    row.gmail_message_id = c.gmailMessageId ?? null
  }
  return row
}

/** Only the fields present in a patch — avoids writing missing DB columns on rescore. */
export function jobCandidatePatchToRow(
  patch: Partial<JobCandidate> & { updatedAt?: string },
  opts?: { includeIdentity?: boolean },
): Record<string, unknown> {
  const includeIdentity = opts?.includeIdentity !== false
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.email !== undefined) row.email = patch.email ?? null
  if (patch.stage !== undefined) row.stage = patch.stage
  if (patch.notes !== undefined) row.notes = patch.notes ?? null
  if (patch.score !== undefined) row.score = patch.score ?? null
  if (patch.source !== undefined) row.source = patch.source ?? null
  if (patch.githubUrl !== undefined) row.github_url = patch.githubUrl ?? null
  if (patch.portfolioUrl !== undefined) row.portfolio_url = patch.portfolioUrl ?? null
  if (patch.coverLetter !== undefined) row.cover_letter = patch.coverLetter ?? false
  if (patch.resumeSummary !== undefined) row.resume_summary = patch.resumeSummary ?? null
  if (patch.scoreBreakdown !== undefined) row.score_breakdown = patch.scoreBreakdown ?? {}
  if (patch.recommendation !== undefined) row.recommendation = patch.recommendation ?? null
  if (patch.externalId !== undefined) row.external_id = patch.externalId ?? null
  if (patch.appliedAt !== undefined) row.applied_at = patch.appliedAt ?? null
  if (patch.updatedAt !== undefined) row.updated_at = patch.updatedAt
  if (includeIdentity) {
    if (patch.phone !== undefined) row.phone = patch.phone ?? null
    if (patch.linkedinUrl !== undefined) row.linkedin_url = patch.linkedinUrl ?? null
    if (patch.location !== undefined) row.location = patch.location ?? null
    if (patch.gmailThreadId !== undefined) row.gmail_thread_id = patch.gmailThreadId ?? null
    if (patch.gmailMessageId !== undefined) row.gmail_message_id = patch.gmailMessageId ?? null
  }
  return row
}

export function isMissingCandidateColumnError(error: { message?: string } | null | undefined): boolean {
  const msg = (error?.message ?? '').toLowerCase()
  return (
    msg.includes('schema cache') ||
    msg.includes('could not find') ||
    msg.includes('gmail_message_id') ||
    msg.includes('gmail_thread_id') ||
    msg.includes('linkedin_url') ||
    (msg.includes('column') && (msg.includes('phone') || msg.includes('location')))
  )
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
