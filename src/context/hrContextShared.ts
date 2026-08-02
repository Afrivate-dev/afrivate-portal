import { createContext, useContext } from 'react'
import type {
  DocumentAcknowledgment,
  DisciplineCase,
  EmployeePersonalFields,
  EmployeeProfile,
  ExitInterview,
  FeedbackAssignment,
  FeedbackCycle,
  FeedbackEntry,
  FeedbackTemplate,
  FormalAppraisal,
  Grievance,
  HrAuditEntry,
  IndividualDevelopmentPlan,
  JobCandidate,
  JobRequisition,
  LearningAssignment,
  LearningSubmission,
  ManagerPeopleScorecard,
  OffboardingChecklist,
  Okr,
  OneOnOneLog,
  OnboardingMilestone,
  PerformanceImprovementPlan,
  PipTemplate,
  PulseResponse,
  PulseSurvey,
  QuarterlyAward,
} from '@/types/hr'

export interface HrMetrics {
  engagementScore: number | null
  enpsScore: number | null
  ldCompletionRate: number | null
  oneOnOneRate: number | null
  openGrievances: number
  pendingLearningReviews: number
  activeSurveys: number
  headcount: number
  pendingLeave: number
  attritionRate: number | null
  avgTimeToHireDays: number | null
  policyAckRate: number | null
  surveyCompletionRate: number | null
  okrAchievement: number | null
  recognitionVolume: number
  valuesAlignment: number | null
  onboardingSatisfaction: number | null
  activePips: number
  pendingDiscipline: number
  upcomingProbations: number
}

export interface HrContextValue {
  pulseSurveys: PulseSurvey[]
  pulseResponses: PulseResponse[]
  submitPulseResponse: (
    surveyId: string,
    userId: string,
    answers: Record<string, string | number>,
  ) => Promise<boolean>
  createPulseSurvey: (s: Omit<PulseSurvey, 'id' | 'createdAt'>) => void
  updatePulseSurvey: (id: string, patch: Partial<PulseSurvey>) => void
  sendPulseSurveyReminders: (surveyId: string) => Promise<number>

  learningAssignments: LearningAssignment[]
  learningSubmissions: LearningSubmission[]
  addLearningAssignment: (a: Omit<LearningAssignment, 'id' | 'createdAt'>) => void
  updateLearningAssignment: (id: string, patch: Partial<LearningAssignment>) => void
  submitLearning: (
    s: Omit<
      LearningSubmission,
      'id' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewedById' | 'reviewerNote'
    >,
  ) => boolean
  reviewLearningSubmission: (
    id: string,
    status: 'approved' | 'rejected',
    reviewerId: string,
    note?: string,
  ) => void

  documentAcknowledgments: DocumentAcknowledgment[]
  acknowledgeDocument: (documentId: string, userId: string) => void

  okrs: Okr[]
  saveOkr: (okr: Omit<Okr, 'id' | 'updatedAt'> & { id?: string }) => void
  deleteOkr: (id: string) => void

  oneOnOneLogs: OneOnOneLog[]
  setOneOnOneCompleted: (
    employeeId: string,
    managerId: string,
    month: string,
    completed: boolean,
  ) => void

  idps: IndividualDevelopmentPlan[]
  saveIdp: (
    idp: Omit<IndividualDevelopmentPlan, 'id' | 'updatedAt' | 'reviewedAt'> & { id?: string },
  ) => void
  reviewIdp: (userId: string, managerNote: string) => boolean

  feedbackCycles: FeedbackCycle[]
  feedbackEntries: FeedbackEntry[]
  feedbackTemplates: FeedbackTemplate[]
  addFeedbackTemplate: (t: Omit<FeedbackTemplate, 'id'>) => void
  updateFeedbackTemplate: (id: string, patch: Partial<FeedbackTemplate>) => void
  deleteFeedbackTemplate: (id: string) => void
  feedbackAssignments: FeedbackAssignment[]
  addFeedbackAssignment: (a: Omit<FeedbackAssignment, 'id' | 'createdAt'>) => void
  removeFeedbackAssignment: (id: string) => void
  openFeedbackCycleFromTemplate: (templateId: string, title?: string) => Promise<string | null>
  createFeedbackCycle: (c: Omit<FeedbackCycle, 'id'>) => void
  updateFeedbackCycle: (id: string, patch: Partial<FeedbackCycle>) => void
  submitFeedback: (e: Omit<FeedbackEntry, 'id' | 'submittedAt'>) => void

  jobRequisitions: JobRequisition[]
  jobCandidates: JobCandidate[]
  addJobRequisition: (
    r: Omit<JobRequisition, 'id' | 'createdAt'>,
    opts?: { reload?: boolean },
  ) => Promise<string>
  updateJobRequisition: (id: string, patch: Partial<JobRequisition>) => void
  addJobCandidate: (c: Omit<JobCandidate, 'id' | 'updatedAt'>, opts?: { reload?: boolean }) => void
  addJobCandidatesBatch: (
    rows: Array<Omit<JobCandidate, 'id' | 'updatedAt'>>,
  ) => Promise<{ added: number; failed: number }>
  updateJobCandidate: (
    id: string,
    patch: Partial<JobCandidate>,
    opts?: { reload?: boolean },
  ) => void | Promise<{ error: { message: string } | null }>
  removeJobCandidates: (ids: string[]) => Promise<{ removed: number }>

  exitInterviews: ExitInterview[]
  addExitInterview: (e: Omit<ExitInterview, 'id' | 'createdAt'>) => void

  grievances: Grievance[]
  submitGrievance: (g: Omit<Grievance, 'id' | 'status' | 'hrNote' | 'createdAt'>) => void
  updateGrievance: (id: string, patch: Partial<Grievance>) => void

  onboardingMilestones: OnboardingMilestone[]
  setMilestoneCompleted: (id: string, completed: boolean) => void
  seedOnboardingMilestones: (userId: string) => void

  quarterlyAwards: QuarterlyAward[]
  addQuarterlyAward: (a: Omit<QuarterlyAward, 'id' | 'createdAt'>) => void

  employeeProfiles: EmployeeProfile[]
  ensureEmployeeProfile: (userId: string) => EmployeeProfile
  saveEmployeePersonalFields: (userId: string, fields: EmployeePersonalFields) => void
  saveEmployeeProfileHr: (
    profile: Omit<EmployeeProfile, 'id' | 'createdAt' | 'updatedAt' | 'profileCompleteness'> & {
      id?: string
    },
  ) => void
  archiveEmployeeProfile: (userId: string, archived?: boolean) => void

  disciplineCases: DisciplineCase[]
  recommendDisciplineCase: (
    c: Omit<
      DisciplineCase,
      | 'id'
      | 'status'
      | 'approvedById'
      | 'deliveredAt'
      | 'acknowledgedAt'
      | 'pipId'
      | 'createdAt'
      | 'updatedAt'
    >,
  ) => string
  saveDisciplineCase: (
    c: Omit<DisciplineCase, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => string
  approveDisciplineCase: (id: string, approvedById: string) => boolean
  acknowledgeDisciplineCase: (id: string) => boolean

  performanceImprovementPlans: PerformanceImprovementPlan[]
  pipTemplates: PipTemplate[]
  createPipForCase: (
    caseId: string,
    opts?: { templateKey?: string; durationDays?: number; startDate?: string },
  ) => string | null
  savePip: (
    pip: Omit<PerformanceImprovementPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => void
  completePipReview: (
    pipId: string,
    reviewId: string,
    patch: {
      rating: NonNullable<PerformanceImprovementPlan['reviews'][0]['rating']>
      notes?: string
      nextActions?: string
      reviewerId: string
    },
  ) => boolean
  closePip: (
    pipId: string,
    outcome: NonNullable<PerformanceImprovementPlan['outcome']>,
    outcomeById: string,
    note?: string,
  ) => boolean

  formalAppraisals: FormalAppraisal[]
  saveFormalAppraisal: (
    a: Omit<FormalAppraisal, 'id' | 'createdAt' | 'updatedAt' | 'overallScore' | 'band'> & {
      id?: string
    },
  ) => string
  finalizeAppraisal: (id: string) => boolean

  hrAuditLog: HrAuditEntry[]
  appendHrAudit: (entry: Omit<HrAuditEntry, 'id' | 'createdAt'>) => void

  offboardingChecklists: OffboardingChecklist[]
  createOffboardingChecklist: (
    c: Omit<OffboardingChecklist, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'items'> & {
      items?: OffboardingChecklist['items']
    },
  ) => string
  updateOffboardingChecklist: (id: string, patch: Partial<OffboardingChecklist>) => void

  getManagerPeopleScorecard: (managerId: string, periodLabel?: string) => ManagerPeopleScorecard

  getMetrics: (options?: { teamScope?: boolean }) => HrMetrics
  hrStatus: 'ready' | 'loading'
  reloadHr: () => Promise<void>
}

export const HrContext = createContext<HrContextValue | null>(null)

export function useHr() {
  const ctx = useContext(HrContext)
  if (!ctx) throw new Error('useHr must be used inside <HrProvider>')
  return ctx
}
