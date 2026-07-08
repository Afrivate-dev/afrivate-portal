import { createContext, useContext } from 'react'
import type {
  DocumentAcknowledgment,
  ExitInterview,
  FeedbackAssignment,
  FeedbackCycle,
  FeedbackEntry,
  FeedbackTemplate,
  Grievance,
  IndividualDevelopmentPlan,
  JobCandidate,
  JobRequisition,
  LearningAssignment,
  LearningSubmission,
  Okr,
  OneOnOneLog,
  OnboardingMilestone,
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
  /** Exit interviews in the last 12 months as % of headcount. */
  attritionRate: number | null
  /** Average days from application to hire for hired candidates. */
  avgTimeToHireDays: number | null
  /** % of active staff who acknowledged all required policies. */
  policyAckRate: number | null
  /** % of staff who responded to open pulse/eNPS surveys. */
  surveyCompletionRate: number | null
  /** Average key-result progress across the current quarter's OKRs (%). */
  okrAchievement: number | null
  /** Number of shout-outs posted this calendar month. */
  recognitionVolume: number
  /** Average 360° feedback score (0–10) — proxy for values alignment. */
  valuesAlignment: number | null
  /** Average onboarding satisfaction survey score (1–10). */
  onboardingSatisfaction: number | null
}

export interface HrContextValue {
  pulseSurveys: PulseSurvey[]
  pulseResponses: PulseResponse[]
  submitPulseResponse: (surveyId: string, userId: string, answers: Record<string, string | number>) => void
  createPulseSurvey: (s: Omit<PulseSurvey, 'id' | 'createdAt'>) => void
  updatePulseSurvey: (id: string, patch: Partial<PulseSurvey>) => void
  sendPulseSurveyReminders: (surveyId: string) => Promise<number>

  learningAssignments: LearningAssignment[]
  learningSubmissions: LearningSubmission[]
  addLearningAssignment: (a: Omit<LearningAssignment, 'id' | 'createdAt'>) => void
  updateLearningAssignment: (id: string, patch: Partial<LearningAssignment>) => void
  submitLearning: (s: Omit<LearningSubmission, 'id' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewedById' | 'reviewerNote'>) => boolean
  reviewLearningSubmission: (id: string, status: 'approved' | 'rejected', reviewerId: string, note?: string) => void

  documentAcknowledgments: DocumentAcknowledgment[]
  acknowledgeDocument: (documentId: string, userId: string) => void

  okrs: Okr[]
  saveOkr: (okr: Omit<Okr, 'id' | 'updatedAt'> & { id?: string }) => void
  deleteOkr: (id: string) => void

  oneOnOneLogs: OneOnOneLog[]
  setOneOnOneCompleted: (employeeId: string, managerId: string, month: string, completed: boolean) => void

  idps: IndividualDevelopmentPlan[]
  saveIdp: (idp: Omit<IndividualDevelopmentPlan, 'id' | 'updatedAt' | 'reviewedAt'> & { id?: string }) => void
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
  addJobRequisition: (r: Omit<JobRequisition, 'id' | 'createdAt'>) => void
  updateJobRequisition: (id: string, patch: Partial<JobRequisition>) => void
  addJobCandidate: (c: Omit<JobCandidate, 'id' | 'updatedAt'>) => void
  updateJobCandidate: (id: string, patch: Partial<JobCandidate>) => void

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
