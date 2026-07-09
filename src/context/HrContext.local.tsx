import { useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useData } from '@/context/DataContext'
import { HrContext, type HrContextValue, type HrMetrics } from '@/context/hrContextShared'
import { computeHrMetrics, managedReportIds } from '@/utils/hrMetrics'
import { DEFAULT_FEEDBACK_TEMPLATES } from '@/lib/feedbackConfig'
import { uid } from '@/utils/helpers'
import type {
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
  OnboardingMilestone,
  PulseSurvey,
  QuarterlyAward,
} from '@/types/hr'

const DEFAULT_MILESTONES = (userId: string): OnboardingMilestone[] => [
  { id: `ms_${uid()}`, userId, phase: 'day_30', label: 'Complete culture orientation & tools setup', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_30', label: 'Day 30 check-in with manager', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_60', label: 'First project milestone delivered', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_60', label: 'Day 60 manager review', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_90', label: 'Day 90 onboarding survey completed', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_90', label: 'Fully integrated into team rhythm', completed: false },
]

const SEED_SURVEY: PulseSurvey = {
  id: 'survey_welcome_pulse',
  title: 'Monthly pulse check',
  description: '3 quick questions — your honest feedback helps us improve.',
  surveyType: 'pulse',
  questions: [
    { id: 'q1', text: 'How engaged do you feel at work this month?', type: 'scale', min: 1, max: 10 },
    { id: 'q2', text: 'Do you have what you need to do your best work?', type: 'scale', min: 1, max: 10 },
    { id: 'q3', text: 'Anything we should know? (optional)', type: 'text' },
  ],
  active: true,
  createdAt: new Date().toISOString(),
}

export function LocalHrProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { users, teams, departments, leaveRequests, documents, recognition } = useData()

  const [pulseSurveys, setPulseSurveys] = useLocalStorage<PulseSurvey[]>('av-hr-pulse-surveys', [SEED_SURVEY])
  const [pulseResponses, setPulseResponses] = useLocalStorage<HrContextValue['pulseResponses']>('av-hr-pulse-responses', [])
  const [learningAssignments, setLearningAssignments] = useLocalStorage<LearningAssignment[]>('av-hr-learning-assignments', [])
  const [learningSubmissions, setLearningSubmissions] = useLocalStorage<LearningSubmission[]>('av-hr-learning-submissions', [])
  const [documentAcknowledgments, setDocumentAcknowledgments] = useLocalStorage<HrContextValue['documentAcknowledgments']>('av-hr-doc-acks', [])
  const [okrs, setOkrs] = useLocalStorage<Okr[]>('av-hr-okrs', [])
  const [oneOnOneLogs, setOneOnOneLogs] = useLocalStorage<HrContextValue['oneOnOneLogs']>('av-hr-one-on-ones', [])
  const [idps, setIdps] = useLocalStorage<IndividualDevelopmentPlan[]>('av-hr-idps', [])
  const [feedbackCycles, setFeedbackCycles] = useLocalStorage<FeedbackCycle[]>('av-hr-feedback-cycles', [])
  const [feedbackEntries, setFeedbackEntries] = useLocalStorage<FeedbackEntry[]>('av-hr-feedback-entries', [])
  const [feedbackTemplates, setFeedbackTemplates] = useLocalStorage<FeedbackTemplate[]>(
    'av-hr-feedback-templates',
    DEFAULT_FEEDBACK_TEMPLATES,
  )
  const [feedbackAssignments, setFeedbackAssignments] = useLocalStorage<FeedbackAssignment[]>(
    'av-hr-feedback-assignments',
    [],
  )
  const [jobRequisitions, setJobRequisitions] = useLocalStorage<JobRequisition[]>('av-hr-jobs', [])
  const [jobCandidates, setJobCandidates] = useLocalStorage<JobCandidate[]>('av-hr-candidates', [])
  const [exitInterviews, setExitInterviews] = useLocalStorage<HrContextValue['exitInterviews']>('av-hr-exit', [])
  const [grievances, setGrievances] = useLocalStorage<Grievance[]>('av-hr-grievances', [])
  const [onboardingMilestones, setOnboardingMilestones] = useLocalStorage<OnboardingMilestone[]>('av-hr-milestones', [])
  const [quarterlyAwards, setQuarterlyAwards] = useLocalStorage<QuarterlyAward[]>('av-hr-awards', [])

  const submitPulseResponse = useCallback(
    async (surveyId: string, userId: string, answers: Record<string, string | number>) => {
      setPulseResponses((prev) => {
        const existing = prev.find((r) => r.surveyId === surveyId && r.userId === userId)
        if (existing) {
          return prev.map((r) =>
            r.id === existing.id ? { ...r, answers, submittedAt: new Date().toISOString() } : r,
          )
        }
        return [...prev, { id: 'pr_' + uid(), surveyId, userId, answers, submittedAt: new Date().toISOString() }]
      })
      return true
    },
    [setPulseResponses],
  )

  const createPulseSurvey = useCallback((s: Omit<PulseSurvey, 'id' | 'createdAt'>) => {
    setPulseSurveys((prev) => [
      ...prev.map((x) => (x.active && x.surveyType === s.surveyType ? { ...x, active: false } : x)),
      { ...s, id: 'survey_' + uid(), createdAt: new Date().toISOString() },
    ])
  }, [setPulseSurveys])

  const updatePulseSurvey = useCallback((id: string, patch: Partial<PulseSurvey>) => {
    setPulseSurveys((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [setPulseSurveys])

  const sendPulseSurveyReminders = useCallback(async (surveyId: string): Promise<number> => {
    const headcount = users.filter((u) => u.active).length
    const responded = new Set(
      pulseResponses.filter((r) => r.surveyId === surveyId).map((r) => r.userId),
    ).size
    return Math.max(0, headcount - responded)
  }, [users, pulseResponses])

  const addLearningAssignment = useCallback((a: Omit<LearningAssignment, 'id' | 'createdAt'>) => {
    setLearningAssignments((prev) => [
      ...prev.map((x) => (x.active ? { ...x, active: false } : x)),
      { ...a, id: 'learn_' + uid(), createdAt: new Date().toISOString() },
    ])
  }, [setLearningAssignments])

  const updateLearningAssignment = useCallback((id: string, patch: Partial<LearningAssignment>) => {
    setLearningAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [setLearningAssignments])

  const submitLearning = useCallback((s: Omit<LearningSubmission, 'id' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewedById' | 'reviewerNote'>) => {
    const existing = learningSubmissions.find(
      (x) => x.assignmentId === s.assignmentId && x.userId === s.userId,
    )
    if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
      return false
    }
    const submittedAt = new Date().toISOString()
    const row: LearningSubmission = {
      ...s,
      id: existing?.id ?? 'ls_' + uid(),
      status: 'pending',
      submittedAt,
    }
    setLearningSubmissions((prev) => {
      if (existing) {
        return prev.map((x) => (x.id === existing.id ? row : x))
      }
      return [...prev, row]
    })
    return true
  }, [learningSubmissions, setLearningSubmissions])

  const reviewLearningSubmission = useCallback((id: string, status: 'approved' | 'rejected', reviewerId: string, note?: string) => {
    setLearningSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status, reviewedById: reviewerId, reviewerNote: note, reviewedAt: new Date().toISOString() } : s,
      ),
    )
  }, [setLearningSubmissions])

  const acknowledgeDocument = useCallback((documentId: string, userId: string) => {
    setDocumentAcknowledgments((prev) => {
      if (prev.some((a) => a.documentId === documentId && a.userId === userId)) return prev
      return [...prev, { id: 'ack_' + uid(), documentId, userId, acknowledgedAt: new Date().toISOString() }]
    })
  }, [setDocumentAcknowledgments])

  const saveOkr = useCallback((okr: Omit<Okr, 'id' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString()
    if (okr.id) {
      setOkrs((prev) => prev.map((o) => (o.id === okr.id ? { ...o, ...okr, updatedAt: now } : o)))
    } else {
      setOkrs((prev) => [...prev, { ...okr, id: 'okr_' + uid(), updatedAt: now } as Okr])
    }
  }, [setOkrs])

  const deleteOkr = useCallback((id: string) => setOkrs((prev) => prev.filter((o) => o.id !== id)), [setOkrs])

  const setOneOnOneCompleted = useCallback((employeeId: string, managerId: string, month: string, completed: boolean) => {
    setOneOnOneLogs((prev) => {
      const existing = prev.find((l) => l.employeeId === employeeId && l.managerId === managerId && l.month === month)
      if (existing) return prev.map((l) => (l.id === existing.id ? { ...l, completed } : l))
      return [...prev, { id: 'o1_' + uid(), employeeId, managerId, month, completed, createdAt: new Date().toISOString() }]
    })
  }, [setOneOnOneLogs])

  const saveIdp = useCallback((idp: Omit<IndividualDevelopmentPlan, 'id' | 'updatedAt' | 'reviewedAt'> & { id?: string }) => {
    const now = new Date().toISOString()
    if (idp.id) {
      setIdps((prev) => prev.map((i) => (i.id === idp.id ? { ...i, ...idp, updatedAt: now } : i)))
    } else {
      setIdps((prev) => {
        const existing = prev.find((i) => i.userId === idp.userId)
        if (existing) return prev.map((i) => (i.userId === idp.userId ? { ...i, ...idp, updatedAt: now } : i))
        return [...prev, { ...idp, id: 'idp_' + uid(), updatedAt: now }]
      })
    }
  }, [setIdps])

  const reviewIdp = useCallback((userId: string, managerNote: string) => {
    const existing = idps.find((i) => i.userId === userId)
    if (!existing) return false
    const now = new Date().toISOString()
    setIdps((prev) =>
      prev.map((i) =>
        i.userId === userId
          ? { ...i, status: 'reviewed' as const, managerNote, reviewedAt: now, updatedAt: now }
          : i,
      ),
    )
    return true
  }, [idps, setIdps])

  const createFeedbackCycle = useCallback((c: Omit<FeedbackCycle, 'id'>) => {
    setFeedbackCycles((prev) => [
      ...prev.map((x) => (x.status === 'open' ? { ...x, status: 'closed' as const } : x)),
      { ...c, id: 'fc_' + uid() },
    ])
  }, [setFeedbackCycles])

  const updateFeedbackCycle = useCallback((id: string, patch: Partial<FeedbackCycle>) => {
    setFeedbackCycles((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [setFeedbackCycles])

  const submitFeedback = useCallback((e: Omit<FeedbackEntry, 'id' | 'submittedAt'>) => {
    setFeedbackEntries((prev) => {
      const idx = prev.findIndex(
        (x) =>
          x.cycleId === e.cycleId &&
          x.subjectUserId === e.subjectUserId &&
          x.reviewerId === e.reviewerId &&
          x.relationship === e.relationship,
      )
      const submittedAt = new Date().toISOString()
      if (idx >= 0) {
        return prev.map((x, i) => (i === idx ? { ...x, ...e, submittedAt } : x))
      }
      return [...prev, { ...e, id: 'fe_' + uid(), submittedAt }]
    })
  }, [setFeedbackEntries])

  const addFeedbackTemplate = useCallback((t: Omit<FeedbackTemplate, 'id'>) => {
    setFeedbackTemplates((prev) => [...prev, { ...t, id: 'ftpl_' + uid() }])
  }, [setFeedbackTemplates])

  const updateFeedbackTemplate = useCallback((id: string, patch: Partial<FeedbackTemplate>) => {
    setFeedbackTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [setFeedbackTemplates])

  const deleteFeedbackTemplate = useCallback((id: string) => {
    setFeedbackTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [setFeedbackTemplates])

  const addFeedbackAssignment = useCallback((a: Omit<FeedbackAssignment, 'id' | 'createdAt'>) => {
    setFeedbackAssignments((prev) => [
      ...prev,
      { ...a, id: 'fa_' + uid(), createdAt: new Date().toISOString() },
    ])
  }, [setFeedbackAssignments])

  const removeFeedbackAssignment = useCallback((id: string) => {
    setFeedbackAssignments((prev) => prev.filter((a) => a.id !== id))
  }, [setFeedbackAssignments])

  const openFeedbackCycleFromTemplate = useCallback(
    async (templateId: string, title?: string): Promise<string | null> => {
      const tpl = feedbackTemplates.find((t) => t.id === templateId)
      if (!tpl) return null
      const year = new Date().getFullYear()
      const half = new Date().getMonth() < 6 ? 'H1' : 'H2'
      const cycleId = 'fc_' + uid()
      setFeedbackCycles((prev) => [
        ...prev.map((x) => (x.status === 'open' ? { ...x, status: 'closed' as const } : x)),
        {
          id: cycleId,
          title: title ?? `${tpl.label} — ${year} ${half}`,
          year,
          half,
          status: 'open',
          questions: tpl.questions,
        },
      ])
      const activeUsers = users.filter((u) => u.active)
      const assignments: FeedbackAssignment[] = []
      for (const u of activeUsers) {
        assignments.push({
          id: 'fa_' + uid(),
          cycleId,
          subjectUserId: u.id,
          reviewerId: u.id,
          relationship: 'self',
          createdAt: new Date().toISOString(),
        })
        if (u.reportsToId) {
          assignments.push({
            id: 'fa_' + uid(),
            cycleId,
            subjectUserId: u.id,
            reviewerId: u.reportsToId,
            relationship: 'manager',
            createdAt: new Date().toISOString(),
          })
          assignments.push({
            id: 'fa_' + uid(),
            cycleId,
            subjectUserId: u.reportsToId,
            reviewerId: u.id,
            relationship: 'report',
            createdAt: new Date().toISOString(),
          })
        }
      }
      setFeedbackAssignments((prev) => [...prev, ...assignments])
      return cycleId
    },
    [feedbackTemplates, users, setFeedbackCycles, setFeedbackAssignments],
  )

  const addJobRequisition = useCallback((r: Omit<JobRequisition, 'id' | 'createdAt'>) => {
    setJobRequisitions((prev) => [...prev, { ...r, id: 'job_' + uid(), createdAt: new Date().toISOString() }])
  }, [setJobRequisitions])

  const updateJobRequisition = useCallback((id: string, patch: Partial<JobRequisition>) => {
    setJobRequisitions((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  }, [setJobRequisitions])

  const addJobCandidate = useCallback((c: Omit<JobCandidate, 'id' | 'updatedAt'>) => {
    setJobCandidates((prev) => [...prev, { ...c, id: 'cand_' + uid(), updatedAt: new Date().toISOString() }])
  }, [setJobCandidates])

  const updateJobCandidate = useCallback((id: string, patch: Partial<JobCandidate>) => {
    setJobCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)))
  }, [setJobCandidates])

  const addExitInterview = useCallback((e: Omit<HrContextValue['exitInterviews'][0], 'id' | 'createdAt'>) => {
    setExitInterviews((prev) => [...prev, { ...e, id: 'exit_' + uid(), createdAt: new Date().toISOString() }])
  }, [setExitInterviews])

  const submitGrievance = useCallback((g: Omit<Grievance, 'id' | 'status' | 'hrNote' | 'createdAt'>) => {
    setGrievances((prev) => [...prev, { ...g, id: 'grv_' + uid(), status: 'open', createdAt: new Date().toISOString() }])
  }, [setGrievances])

  const updateGrievance = useCallback((id: string, patch: Partial<Grievance>) => {
    setGrievances((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }, [setGrievances])

  const setMilestoneCompleted = useCallback((id: string, completed: boolean) => {
    setOnboardingMilestones((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, completed, completedAt: completed ? new Date().toISOString() : undefined } : m,
      ),
    )
  }, [setOnboardingMilestones])

  const seedOnboardingMilestones = useCallback((userId: string) => {
    setOnboardingMilestones((prev) => {
      if (prev.some((m) => m.userId === userId)) return prev
      return [...prev, ...DEFAULT_MILESTONES(userId)]
    })
  }, [setOnboardingMilestones])

  const addQuarterlyAward = useCallback((a: Omit<QuarterlyAward, 'id' | 'createdAt'>) => {
    setQuarterlyAwards((prev) => [...prev, { ...a, id: 'award_' + uid(), createdAt: new Date().toISOString() }])
  }, [setQuarterlyAwards])

  const getMetrics = useCallback(
    (options?: { teamScope?: boolean }): HrMetrics => {
      const memberIds =
        options?.teamScope && user ? managedReportIds(user, users, teams, departments) : undefined
      return computeHrMetrics(
        {
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
        },
        { memberIds },
      )
    },
    [
      user,
      pulseSurveys,
      pulseResponses,
      learningAssignments,
      learningSubmissions,
      oneOnOneLogs,
      grievances,
      users,
      teams,
      departments,
      leaveRequests,
      exitInterviews,
      jobCandidates,
      documents,
      documentAcknowledgments,
      okrs,
      feedbackEntries,
      recognition,
    ],
  )

  const value = useMemo<HrContextValue>(
    () => ({
      pulseSurveys,
      pulseResponses,
      submitPulseResponse,
      createPulseSurvey,
      updatePulseSurvey,
      sendPulseSurveyReminders,
      learningAssignments,
      learningSubmissions,
      addLearningAssignment,
      updateLearningAssignment,
      submitLearning,
      reviewLearningSubmission,
      documentAcknowledgments,
      acknowledgeDocument,
      okrs,
      saveOkr,
      deleteOkr,
      oneOnOneLogs,
      setOneOnOneCompleted,
      idps,
      saveIdp,
      reviewIdp,
      feedbackCycles,
      feedbackEntries,
      feedbackTemplates,
      addFeedbackTemplate,
      updateFeedbackTemplate,
      deleteFeedbackTemplate,
      feedbackAssignments,
      addFeedbackAssignment,
      removeFeedbackAssignment,
      openFeedbackCycleFromTemplate,
      createFeedbackCycle,
      updateFeedbackCycle,
      submitFeedback,
      jobRequisitions,
      jobCandidates,
      addJobRequisition,
      updateJobRequisition,
      addJobCandidate,
      updateJobCandidate,
      exitInterviews,
      addExitInterview,
      grievances,
      submitGrievance,
      updateGrievance,
      onboardingMilestones,
      setMilestoneCompleted,
      seedOnboardingMilestones,
      quarterlyAwards,
      addQuarterlyAward,
      getMetrics,
      hrStatus: 'ready',
      reloadHr: async () => {},
    }),
    [
      pulseSurveys, pulseResponses, submitPulseResponse, createPulseSurvey, updatePulseSurvey, sendPulseSurveyReminders,
      learningAssignments, learningSubmissions, addLearningAssignment, updateLearningAssignment, submitLearning, reviewLearningSubmission,
      documentAcknowledgments, acknowledgeDocument,
      okrs, saveOkr, deleteOkr, oneOnOneLogs, setOneOnOneCompleted, idps, saveIdp, reviewIdp,
      feedbackCycles, feedbackEntries, feedbackTemplates, addFeedbackTemplate, updateFeedbackTemplate, deleteFeedbackTemplate,
      feedbackAssignments, addFeedbackAssignment, removeFeedbackAssignment, openFeedbackCycleFromTemplate,
      createFeedbackCycle, updateFeedbackCycle, submitFeedback,
      jobRequisitions, jobCandidates, addJobRequisition, updateJobRequisition, addJobCandidate, updateJobCandidate,
      exitInterviews, addExitInterview, grievances, submitGrievance, updateGrievance,
      onboardingMilestones, setMilestoneCompleted, seedOnboardingMilestones, quarterlyAwards, addQuarterlyAward,
      getMetrics,
    ],
  )

  return <HrContext.Provider value={value}>{children}</HrContext.Provider>
}
