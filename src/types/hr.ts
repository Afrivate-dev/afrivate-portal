/** HR operations types — pulse, L&D, performance, recruitment, confidential ops. */

export type PulseSurveyType = 'pulse' | 'enps'

export interface PulseQuestion {
  id: string
  text: string
  type: 'scale' | 'text'
  /** scale: min–max labels; e.g. 1–10 */
  min?: number
  max?: number
}

export interface PulseSurvey {
  id: string
  title: string
  description?: string
  surveyType: PulseSurveyType
  questions: PulseQuestion[]
  active: boolean
  opensAt?: string
  closesAt?: string
  createdById?: string
  createdAt: string
}

/** HR-managed reusable survey blueprint — launched as a live pulse/eNPS survey. */
export interface PulseSurveyTemplate {
  id: string
  label: string
  surveyType: PulseSurveyType
  description?: string
  questions: PulseQuestion[]
}

export interface PulseResponse {
  id: string
  surveyId: string
  userId: string
  answers: Record<string, string | number>
  submittedAt: string
}

export interface LearningAssignment {
  id: string
  title: string
  alisonUrl: string
  description?: string
  dueDate?: string
  monthLabel?: string
  active: boolean
  createdAt: string
}

export type LearningSubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface LearningSubmission {
  id: string
  assignmentId: string
  userId: string
  courseName: string
  completedAt: string
  certificatePath?: string
  status: LearningSubmissionStatus
  reviewerNote?: string
  reviewedById?: string
  reviewedAt?: string
  submittedAt: string
}

export interface DocumentAcknowledgment {
  id: string
  documentId: string
  userId: string
  acknowledgedAt: string
}

export interface OkrKeyResult {
  id: string
  text: string
  progress: number
}

export interface Okr {
  id: string
  userId: string
  year: number
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  objective: string
  keyResults: OkrKeyResult[]
  updatedAt: string
}

export interface OneOnOneLog {
  id: string
  employeeId: string
  managerId: string
  /** yyyy-MM */
  month: string
  completed: boolean
  createdAt: string
}

export type IdpStatus = 'draft' | 'submitted' | 'reviewed'

export interface IndividualDevelopmentPlan {
  id: string
  userId: string
  content: string
  status: IdpStatus
  managerNote?: string
  updatedAt: string
  reviewedAt?: string
}

export type FeedbackCycleHalf = 'H1' | 'H2'
export type FeedbackCycleStatus = 'draft' | 'open' | 'closed'
export type FeedbackRelationship = 'self' | 'manager' | 'peer' | 'report'

export interface FeedbackCycle {
  id: string
  title: string
  year: number
  half: FeedbackCycleHalf
  status: FeedbackCycleStatus
  questions: PulseQuestion[]
  opensAt?: string
  closesAt?: string
}

export interface FeedbackEntry {
  id: string
  cycleId: string
  subjectUserId: string
  reviewerId: string
  relationship: FeedbackRelationship
  answers: Record<string, string | number>
  submittedAt: string
}

/** HR-managed reusable 360° question set. */
export interface FeedbackTemplate {
  id: string
  label: string
  description?: string
  questions: PulseQuestion[]
}

/** Who reviews whom in a 360° cycle. */
export interface FeedbackAssignment {
  id: string
  cycleId: string
  subjectUserId: string
  reviewerId: string
  relationship: FeedbackRelationship
  createdAt: string
}

export type JobRequisitionStatus = 'open' | 'filled' | 'closed'
export type CandidateStage =
  | 'applied'
  | 'screen'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'

export interface JobRequisition {
  id: string
  title: string
  department: string
  status: JobRequisitionStatus
  description?: string
  createdById?: string
  createdAt: string
}

export interface JobCandidate {
  id: string
  requisitionId: string
  name: string
  email?: string
  stage: CandidateStage
  notes?: string
  score?: number
  appliedAt?: string
  updatedAt: string
}

export interface ExitInterview {
  id: string
  userId?: string
  departingName: string
  lastDay?: string
  /** Config reason IDs from portal_exit_reasons. */
  reasons: string[]
  notes?: string
  conductedById?: string
  createdAt: string
}

export type GrievanceStatus = 'open' | 'reviewing' | 'resolved'

export interface Grievance {
  id: string
  userId: string
  category: string
  body: string
  status: GrievanceStatus
  hrNote?: string
  confidential: boolean
  createdAt: string
}

export type OnboardingMilestonePhase = 'day_30' | 'day_60' | 'day_90'

export interface OnboardingMilestone {
  id: string
  userId: string
  phase: OnboardingMilestonePhase
  label: string
  completed: boolean
  completedAt?: string
  dueDate?: string
}

export interface QuarterlyAward {
  id: string
  year: number
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  category: string
  winnerId: string
  nominatedById?: string
  note?: string
  createdAt: string
}
