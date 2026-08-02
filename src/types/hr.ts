/** HR operations types — pulse, L&D, performance, recruitment, confidential ops. */

export type PulseSurveyType = 'pulse' | 'enps' | 'onboarding'

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

export type CandidateSource =
  | 'gmail'
  | 'indeed'
  | 'bebee'
  | 'jobberman'
  | 'linkedin'
  | 'manual'
  | 'other'

export type CandidateRecommendation = 'strong' | 'viable' | 'weak' | 'reject'

export interface JobCandidate {
  id: string
  requisitionId: string
  name: string
  email?: string
  phone?: string
  linkedinUrl?: string
  location?: string
  stage: CandidateStage
  notes?: string
  score?: number
  source?: CandidateSource
  githubUrl?: string
  portfolioUrl?: string
  coverLetter?: boolean
  resumeSummary?: string
  scoreBreakdown?: Record<string, number>
  recommendation?: CandidateRecommendation
  /** Stored application files (resume / cover letter) for file preview. */
  attachments?: CandidateAttachment[]
  /** Gmail message id or Indeed application id for sync dedupe. */
  externalId?: string
  gmailThreadId?: string
  gmailMessageId?: string
  appliedAt?: string
  updatedAt: string
}

export interface CandidateAttachment {
  id: string
  filename: string
  mimeType: string
  storagePath: string
  kind: 'resume' | 'cover_letter' | 'other'
  size?: number
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

/* ─── Employee Information Hub ─── */

export type EngagementType = 'employee' | 'volunteer' | 'contractor'
export type EmploymentStatus = 'active' | 'probation' | 'leave' | 'exiting' | 'terminated' | 'archived'

export interface EmployeeEmergencyContact {
  name: string
  phone: string
  relationship: string
}

/** 1:1 with User.id — hybrid personal (employee) + HR-only fields. */
export interface EmployeeProfile {
  id: string
  userId: string
  /** Employee-editable */
  preferredName?: string
  legalName?: string
  personalEmail?: string
  phone?: string
  workLocation?: string
  addressCountry?: string
  dateOfBirth?: string
  pronouns?: string
  linkedinUrl?: string
  bio?: string
  skills?: string[]
  emergencyContact?: EmployeeEmergencyContact
  nextOfKinNotes?: string
  /** HR-only */
  engagementType: EngagementType
  employmentStatus: EmploymentStatus
  startDate?: string
  probationEndDate?: string
  confirmationDate?: string
  confirmedAt?: string
  confirmedById?: string
  contractTermsSummary?: string
  payrollSetupComplete: boolean
  hrPrivateNotes?: string
  hrRequestsUpdate: boolean
  archived: boolean
  profileCompleteness: number
  lastEmployeeUpdateAt?: string
  lastHrUpdateAt?: string
  createdAt: string
  updatedAt: string
}

/** Fields employees may update via My Info. */
export type EmployeePersonalFields = Pick<
  EmployeeProfile,
  | 'preferredName'
  | 'legalName'
  | 'personalEmail'
  | 'phone'
  | 'workLocation'
  | 'addressCountry'
  | 'dateOfBirth'
  | 'pronouns'
  | 'linkedinUrl'
  | 'bio'
  | 'skills'
  | 'emergencyContact'
  | 'nextOfKinNotes'
>

/* ─── Progressive discipline & PIP (SWP §9) ─── */

export type DisciplineStep =
  | 'coaching_verbal'
  | 'written_warning'
  | 'pip'
  | 'restricted_duties'
  | 'termination_case'

export type DisciplineSeverity = 'low' | 'medium' | 'high' | 'critical'
export type DisciplineEmployeeLevel = 'staff' | 'assistant_lead' | 'team_lead' | 'contractor' | 'volunteer'
export type DisciplineCaseStatus =
  | 'draft'
  | 'pending_hr'
  | 'active'
  | 'completed'
  | 'escalated'
  | 'cancelled'
export type DisciplineDeliveryMode = 'portal_notice' | 'meeting' | 'email_formal' | 'written_letter'

export type DisciplineTrigger =
  | 'missed_deadlines'
  | 'inaccurate_reporting'
  | 'poor_communication'
  | 'unauthorised_absence'
  | 'misconduct'
  | 'underperformance'
  | 'security'
  | 'systems_non_use'
  | 'leave_pattern'

export interface DisciplineEvidenceLink {
  kind: 'task' | 'checkin' | 'okr' | 'leave' | 'other'
  refId?: string
  note?: string
}

export interface DisciplineCase {
  id: string
  subjectUserId: string
  step: DisciplineStep
  severity: DisciplineSeverity
  employeeLevel: DisciplineEmployeeLevel
  triggers: DisciplineTrigger[]
  reason: string
  evidence: DisciplineEvidenceLink[]
  status: DisciplineCaseStatus
  deliveryMode: DisciplineDeliveryMode
  issuedById: string
  recommendedById?: string
  approvedById?: string
  deliveredAt?: string
  acknowledgementRequired: boolean
  acknowledgedAt?: string
  pipId?: string
  createdAt: string
  updatedAt: string
}

export type PipGoalStatus = 'not_started' | 'in_progress' | 'met' | 'missed'
export type PipReviewRating = 'on_track' | 'at_risk' | 'off_track'
export type PipOutcome = 'passed' | 'extended' | 'escalated' | 'terminated_recommendation'

export interface PipGoal {
  id: string
  description: string
  successMetric: string
  dueDate: string
  status: PipGoalStatus
}

export interface PipReview {
  id: string
  scheduledAt: string
  completedAt?: string
  reviewerId: string
  rating?: PipReviewRating
  notes?: string
  nextActions?: string
}

export interface PerformanceImprovementPlan {
  id: string
  caseId: string
  subjectUserId: string
  goals: PipGoal[]
  startDate: string
  endDate: string
  durationDays: number
  reviews: PipReview[]
  outcome?: PipOutcome
  outcomeNote?: string
  outcomeAt?: string
  outcomeById?: string
  templateKey?: string
  createdAt: string
  updatedAt: string
}

export interface PipTemplate {
  id: string
  key: string
  label: string
  employeeLevel: DisciplineEmployeeLevel
  category: 'performance' | 'conduct' | 'attendance'
  defaultDurationDays: number
  defaultDeliveryMode: DisciplineDeliveryMode
  goalTemplates: Array<{ description: string; successMetric: string }>
  reviewCadenceDays: number[]
}

/* ─── Formal appraisals (60/40) ─── */

export type AppraisalCadence = 'quarterly' | 'monthly'
export type AppraisalStatus = 'draft' | 'submitted' | 'calibrated' | 'finalized'
export type AppraisalBand = 'exceptional' | 'good' | 'concern' | 'disciplinary' | 'termination_risk'

export interface AppraisalScores {
  /** 0–100 deliverables/output (60% weight). */
  outputScore: number
  /** 0–100 soft skills (40% weight). */
  softSkillsScore: number
}

export interface FormalAppraisal {
  id: string
  subjectUserId: string
  reviewerId: string
  periodLabel: string
  cadence: AppraisalCadence
  status: AppraisalStatus
  scores: AppraisalScores
  /** Computed overall 0–100. */
  overallScore: number
  band: AppraisalBand
  outputNotes?: string
  softSkillsNotes?: string
  evidenceLinks: DisciplineEvidenceLink[]
  onActivePip: boolean
  createdAt: string
  updatedAt: string
  finalizedAt?: string
}

/* ─── HR audit, offboarding, manager scorecard ─── */

export interface HrAuditEntry {
  id: string
  actorId: string
  entityType: 'employee_profile' | 'discipline_case' | 'pip' | 'appraisal' | 'offboarding'
  entityId: string
  action: string
  summary: string
  createdAt: string
}

export type OffboardingItemStatus = 'pending' | 'done' | 'skipped'

export interface OffboardingChecklistItem {
  id: string
  label: string
  status: OffboardingItemStatus
  completedAt?: string
  completedById?: string
}

export interface OffboardingChecklist {
  id: string
  userId: string
  reason: string
  lastDay?: string
  volunteerBridgeNotice: boolean
  items: OffboardingChecklistItem[]
  status: 'open' | 'completed' | 'cancelled'
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface ManagerPeopleScorecard {
  managerId: string
  periodLabel: string
  deliveryConsistency: number
  kpiCompletion: number
  communicationDiscipline: number
  escalationQuality: number
  notes?: string
}
