/**
 * Supabase HR data — loads portal HR tables from migration 20260704_hr_operations.sql.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHrPortalRealtime } from '@/hooks/usePortalRealtime'
import { HrContext, type HrContextValue, type HrMetrics } from '@/context/hrContextShared'
import { fetchHrDataset } from '@/lib/supabase/hrDataset'
import { notifyError } from '@/lib/notify'
import { friendlyErrorMessage } from '@/lib/userMessages'
import { supabase } from '@/lib/supabase'
import { computeHrMetrics, directReportIds } from '@/utils/hrMetrics'
import { isHR, isLead } from '@/utils/helpers'
import { uid } from '@/utils/helpers'
import type {
  FeedbackCycle,
  FeedbackEntry,
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

function reportHrError(action: string, error: { message: string }): void {
  console.warn(`[hr] ${action}`, error.message)
  notifyError(friendlyErrorMessage(action, error.message))
}

const DEFAULT_MILESTONES = (userId: string): OnboardingMilestone[] => [
  { id: `ms_${uid()}`, userId, phase: 'day_30', label: 'Complete culture orientation & tools setup', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_30', label: 'Day 30 check-in with manager', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_60', label: 'First project milestone delivered', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_60', label: 'Day 60 manager review', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_90', label: 'Day 90 onboarding survey completed', completed: false },
  { id: `ms_${uid()}`, userId, phase: 'day_90', label: 'Fully integrated into team rhythm', completed: false },
]

export function SupabaseHrProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { users, leaveRequests } = useData()
  const client = supabase!

  const [hrStatus, setHrStatus] = useState<'ready' | 'loading'>('loading')
  const [pulseSurveys, setPulseSurveys] = useState<HrContextValue['pulseSurveys']>([])
  const [pulseResponses, setPulseResponses] = useState<HrContextValue['pulseResponses']>([])
  const [learningAssignments, setLearningAssignments] = useState<LearningAssignment[]>([])
  const [learningSubmissions, setLearningSubmissions] = useState<LearningSubmission[]>([])
  const [documentAcknowledgments, setDocumentAcknowledgments] = useState<HrContextValue['documentAcknowledgments']>([])
  const [okrs, setOkrs] = useState<Okr[]>([])
  const [oneOnOneLogs, setOneOnOneLogs] = useState<HrContextValue['oneOnOneLogs']>([])
  const [idps, setIdps] = useState<IndividualDevelopmentPlan[]>([])
  const [feedbackCycles, setFeedbackCycles] = useState<FeedbackCycle[]>([])
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([])
  const [jobRequisitions, setJobRequisitions] = useState<JobRequisition[]>([])
  const [jobCandidates, setJobCandidates] = useState<JobCandidate[]>([])
  const [exitInterviews, setExitInterviews] = useState<HrContextValue['exitInterviews']>([])
  const [grievances, setGrievances] = useState<Grievance[]>([])
  const [onboardingMilestones, setOnboardingMilestones] = useState<OnboardingMilestone[]>([])
  const [quarterlyAwards, setQuarterlyAwards] = useState<QuarterlyAward[]>([])
  const [teamPulseAggregates, setTeamPulseAggregates] = useState<{
    engagementScore: number | null
    enpsScore: number | null
  } | null>(null)

  const reloadHr = useCallback(async () => {
    if (!user) {
      setPulseSurveys([])
      setPulseResponses([])
      setLearningAssignments([])
      setLearningSubmissions([])
      setDocumentAcknowledgments([])
      setOkrs([])
      setOneOnOneLogs([])
      setIdps([])
      setFeedbackCycles([])
      setFeedbackEntries([])
      setJobRequisitions([])
      setJobCandidates([])
      setExitInterviews([])
      setGrievances([])
      setOnboardingMilestones([])
      setQuarterlyAwards([])
      setTeamPulseAggregates(null)
      setHrStatus('ready')
      return
    }
    setHrStatus('loading')
    try {
      const d = await fetchHrDataset(client)
      setPulseSurveys(d.pulseSurveys)
      setPulseResponses(d.pulseResponses)
      setLearningAssignments(d.learningAssignments)
      setLearningSubmissions(d.learningSubmissions)
      setDocumentAcknowledgments(d.documentAcknowledgments)
      setOkrs(d.okrs)
      setOneOnOneLogs(d.oneOnOneLogs)
      setIdps(d.idps)
      setFeedbackCycles(d.feedbackCycles)
      setFeedbackEntries(d.feedbackEntries)
      setJobRequisitions(d.jobRequisitions)
      setJobCandidates(d.jobCandidates)
      setExitInterviews(d.exitInterviews)
      setGrievances(d.grievances)
      setOnboardingMilestones(d.onboardingMilestones)
      setQuarterlyAwards(d.quarterlyAwards)
      if (user && isLead(user) && !isHR(user)) {
        const { data: agg, error: aggErr } = await client.rpc('hr_pulse_aggregates', {
          p_team_scope: true,
        })
        if (aggErr) {
          console.warn('[hr] team pulse aggregates', aggErr.message)
          setTeamPulseAggregates(null)
        } else {
          const row = agg as { engagement_score?: number | null; enps_score?: number | null } | null
          setTeamPulseAggregates({
            engagementScore: row?.engagement_score ?? null,
            enpsScore: row?.enps_score ?? null,
          })
        }
      } else {
        setTeamPulseAggregates(null)
      }
    } catch (e) {
      reportHrError('load HR data', e instanceof Error ? e : { message: String(e) })
    } finally {
      setHrStatus('ready')
    }
  }, [client, user])

  useEffect(() => {
    queueMicrotask(() => void reloadHr())
  }, [reloadHr])

  useHrPortalRealtime(user?.id, reloadHr, client)

  const submitPulseResponse = useCallback(
    (surveyId: string, userId: string, answers: Record<string, string | number>) => {
      const existing = pulseResponses.find((r) => r.surveyId === surveyId && r.userId === userId)
      const id = existing?.id ?? 'pr_' + uid()
      const submittedAt = new Date().toISOString()
      setPulseResponses((prev) => {
        if (existing) {
          return prev.map((r) => (r.id === existing.id ? { ...r, answers, submittedAt } : r))
        }
        return [...prev, { id, surveyId, userId, answers, submittedAt }]
      })
      void (async () => {
        const { error } = await client.from('portal_pulse_responses').upsert({
          id,
          survey_id: surveyId,
          user_id: userId,
          answers,
          submitted_at: submittedAt,
        })
        if (error) reportHrError('submit survey response', error)
        await reloadHr()
      })()
    },
    [client, pulseResponses, reloadHr],
  )

  const createPulseSurvey = useCallback(
    (s: Omit<PulseSurvey, 'id' | 'createdAt'>) => {
      const row = { ...s, id: 'survey_' + uid(), createdAt: new Date().toISOString(), createdById: user?.id }
      setPulseSurveys((prev) => [
        ...prev.map((x) => (x.active && x.surveyType === s.surveyType ? { ...x, active: false } : x)),
        row,
      ])
      void (async () => {
        const { error } = await client.rpc('portal_create_pulse_survey', {
          p_id: row.id,
          p_title: row.title,
          p_description: row.description ?? null,
          p_survey_type: row.surveyType,
          p_questions: row.questions,
          p_opens_at: row.opensAt ?? null,
          p_closes_at: row.closesAt ?? null,
        })
        if (error) reportHrError('create pulse survey', error)
        await reloadHr()
      })()
    },
    [client, reloadHr, user?.id],
  )

  const updatePulseSurvey = useCallback(
    (id: string, patch: Partial<PulseSurvey>) => {
      setPulseSurveys((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
      void (async () => {
        const cur = pulseSurveys.find((s) => s.id === id)
        if (!cur) return
        const next = { ...cur, ...patch }
        const { error } = await client
          .from('portal_pulse_surveys')
          .update({
            title: next.title,
            description: next.description ?? null,
            survey_type: next.surveyType,
            questions: next.questions,
            active: next.active,
            opens_at: next.opensAt ?? null,
            closes_at: next.closesAt ?? null,
          })
          .eq('id', id)
        if (error) reportHrError('update pulse survey', error)
        await reloadHr()
      })()
    },
    [client, pulseSurveys, reloadHr],
  )

  const addLearningAssignment = useCallback(
    (a: Omit<LearningAssignment, 'id' | 'createdAt'>) => {
      const row: LearningAssignment = { ...a, id: 'learn_' + uid(), createdAt: new Date().toISOString() }
      setLearningAssignments((prev) => [
        ...prev.map((x) => (x.active ? { ...x, active: false } : x)),
        row,
      ])
      void (async () => {
        const { error } = await client.rpc('portal_create_learning_assignment', {
          p_id: row.id,
          p_title: row.title,
          p_alison_url: row.alisonUrl,
          p_description: row.description ?? null,
          p_due_date: row.dueDate ?? null,
          p_month_label: row.monthLabel ?? null,
        })
        if (error) reportHrError('add learning assignment', error)
        await reloadHr()
      })()
    },
    [client, reloadHr],
  )

  const updateLearningAssignment = useCallback(
    (id: string, patch: Partial<LearningAssignment>) => {
      setLearningAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
      void (async () => {
        const cur = learningAssignments.find((a) => a.id === id)
        if (!cur) return
        const next = { ...cur, ...patch }
        const { error } = await client
          .from('portal_learning_assignments')
          .update({
            title: next.title,
            alison_url: next.alisonUrl,
            description: next.description ?? null,
            due_date: next.dueDate ?? null,
            month_label: next.monthLabel ?? null,
            active: next.active,
          })
          .eq('id', id)
        if (error) reportHrError('update learning assignment', error)
        await reloadHr()
      })()
    },
    [client, learningAssignments, reloadHr],
  )

  const submitLearning = useCallback(
    (s: Omit<LearningSubmission, 'id' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewedById' | 'reviewerNote'>) => {
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
        return [row, ...prev]
      })
      void (async () => {
        const { error } = await client.from('portal_learning_submissions').upsert({
          id: row.id,
          assignment_id: row.assignmentId,
          user_id: row.userId,
          course_name: row.courseName,
          completed_at: row.completedAt,
          certificate_path: row.certificatePath ?? null,
          status: row.status,
          submitted_at: row.submittedAt,
          reviewer_note: null,
          reviewed_by: null,
          reviewed_at: null,
        })
        if (error) reportHrError('submit learning', error)
        await reloadHr()
      })()
      return true
    },
    [client, learningSubmissions, reloadHr],
  )

  const reviewLearningSubmission = useCallback(
    (id: string, status: 'approved' | 'rejected', reviewerId: string, note?: string) => {
      const reviewedAt = new Date().toISOString()
      setLearningSubmissions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status, reviewedById: reviewerId, reviewerNote: note, reviewedAt } : s,
        ),
      )
      void (async () => {
        const { error } = await client
          .from('portal_learning_submissions')
          .update({
            status,
            reviewed_by: reviewerId,
            reviewer_note: note ?? null,
            reviewed_at: reviewedAt,
          })
          .eq('id', id)
        if (error) reportHrError('review learning submission', error)
        await reloadHr()
      })()
    },
    [client, reloadHr],
  )

  const acknowledgeDocument = useCallback(
    (documentId: string, userId: string) => {
      if (documentAcknowledgments.some((a) => a.documentId === documentId && a.userId === userId)) return
      const row = { id: 'ack_' + uid(), documentId, userId, acknowledgedAt: new Date().toISOString() }
      setDocumentAcknowledgments((prev) => [...prev, row])
      void (async () => {
        const { error } = await client.from('portal_document_acknowledgments').insert({
          id: row.id,
          document_id: documentId,
          user_id: userId,
          acknowledged_at: row.acknowledgedAt,
        })
        if (error) reportHrError('acknowledge document', error)
        await reloadHr()
      })()
    },
    [client, documentAcknowledgments, reloadHr],
  )

  const saveOkr = useCallback(
    (okr: Omit<Okr, 'id' | 'updatedAt'> & { id?: string }) => {
      const now = new Date().toISOString()
      const id = okr.id ?? 'okr_' + uid()
      const row = { ...okr, id, updatedAt: now } as Okr
      setOkrs((prev) => (okr.id ? prev.map((o) => (o.id === id ? row : o)) : [...prev, row]))
      void (async () => {
        const { error } = await client.from('portal_okrs').upsert({
          id,
          user_id: row.userId,
          year: row.year,
          quarter: row.quarter,
          objective: row.objective,
          key_results: row.keyResults,
          updated_at: now,
        })
        if (error) reportHrError('save OKR', error)
        await reloadHr()
      })()
    },
    [client, reloadHr],
  )

  const deleteOkr = useCallback(
    (id: string) => {
      setOkrs((prev) => prev.filter((o) => o.id !== id))
      void (async () => {
        const { error } = await client.from('portal_okrs').delete().eq('id', id)
        if (error) reportHrError('delete OKR', error)
        await reloadHr()
      })()
    },
    [client, reloadHr],
  )

  const setOneOnOneCompleted = useCallback(
    (employeeId: string, managerId: string, month: string, completed: boolean) => {
      const existing = oneOnOneLogs.find(
        (l) => l.employeeId === employeeId && l.managerId === managerId && l.month === month,
      )
      const id = existing?.id ?? 'o1_' + uid()
      const createdAt = existing?.createdAt ?? new Date().toISOString()
      setOneOnOneLogs((prev) => {
        if (existing) return prev.map((l) => (l.id === existing.id ? { ...l, completed } : l))
        return [...prev, { id, employeeId, managerId, month, completed, createdAt }]
      })
      void (async () => {
        const { error } = await client.from('portal_one_on_one_logs').upsert({
          id,
          employee_id: employeeId,
          manager_id: managerId,
          month,
          completed,
          created_at: createdAt,
        })
        if (error) reportHrError('update 1:1 log', error)
        await reloadHr()
      })()
    },
    [client, oneOnOneLogs, reloadHr],
  )

  const saveIdp = useCallback(
    (idp: Omit<IndividualDevelopmentPlan, 'id' | 'updatedAt' | 'reviewedAt'> & { id?: string }) => {
      const now = new Date().toISOString()
      const existing = idp.id ? idps.find((i) => i.id === idp.id) : idps.find((i) => i.userId === idp.userId)
      const id = idp.id ?? existing?.id ?? 'idp_' + uid()
      const row: IndividualDevelopmentPlan = {
        ...idp,
        id,
        updatedAt: now,
        reviewedAt: idp.status === 'reviewed' ? now : existing?.reviewedAt,
      }
      setIdps((prev) => {
        if (existing) return prev.map((i) => (i.id === id ? row : i))
        return [...prev, row]
      })
      void (async () => {
        const { error } = await client.from('portal_idps').upsert({
          id,
          user_id: row.userId,
          content: row.content,
          status: row.status,
          manager_note: row.managerNote ?? null,
          updated_at: now,
          reviewed_at: row.reviewedAt ?? null,
        })
        if (error) reportHrError('save IDP', error)
        await reloadHr()
      })()
    },
    [client, idps, reloadHr],
  )

  const reviewIdp = useCallback(
    (userId: string, managerNote: string) => {
      const now = new Date().toISOString()
      const existing = idps.find((i) => i.userId === userId)
      if (!existing) return false
      const row: IndividualDevelopmentPlan = {
        ...existing,
        status: 'reviewed',
        managerNote,
        reviewedAt: now,
        updatedAt: now,
      }
      setIdps((prev) => prev.map((i) => (i.userId === userId ? row : i)))
      void (async () => {
        const { error } = await client
          .from('portal_idps')
          .update({
            status: 'reviewed',
            manager_note: managerNote,
            reviewed_at: now,
            updated_at: now,
          })
          .eq('user_id', userId)
        if (error) reportHrError('review IDP', error)
        await reloadHr()
      })()
      return true
    },
    [client, idps, reloadHr],
  )

  const createFeedbackCycle = useCallback(
    (c: Omit<FeedbackCycle, 'id'>) => {
      const row = { ...c, id: 'fc_' + uid() }
      setFeedbackCycles((prev) => [
        ...prev.map((x) => (x.status === 'open' ? { ...x, status: 'closed' as const } : x)),
        row,
      ])
      void (async () => {
        await client.from('portal_feedback_cycles').update({ status: 'closed' }).eq('status', 'open')
        const { error } = await client.from('portal_feedback_cycles').insert({
          id: row.id,
          title: row.title,
          year: row.year,
          half: row.half,
          status: row.status,
          questions: row.questions,
          opens_at: row.opensAt ?? null,
          closes_at: row.closesAt ?? null,
        })
        if (error) reportHrError('create feedback cycle', error)
        await reloadHr()
      })()
    },
    [client, reloadHr],
  )

  const updateFeedbackCycle = useCallback(
    (id: string, patch: Partial<FeedbackCycle>) => {
      setFeedbackCycles((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
      void (async () => {
        const cur = feedbackCycles.find((c) => c.id === id)
        if (!cur) return
        const next = { ...cur, ...patch }
        const { error } = await client
          .from('portal_feedback_cycles')
          .update({
            title: next.title,
            year: next.year,
            half: next.half,
            status: next.status,
            questions: next.questions,
            opens_at: next.opensAt ?? null,
            closes_at: next.closesAt ?? null,
          })
          .eq('id', id)
        if (error) reportHrError('update feedback cycle', error)
        await reloadHr()
      })()
    },
    [client, feedbackCycles, reloadHr],
  )

  const submitFeedback = useCallback(
    (e: Omit<FeedbackEntry, 'id' | 'submittedAt'>) => {
      const existing = feedbackEntries.find(
        (x) =>
          x.cycleId === e.cycleId &&
          x.subjectUserId === e.subjectUserId &&
          x.reviewerId === e.reviewerId &&
          x.relationship === e.relationship,
      )
      const row = { ...e, id: existing?.id ?? 'fe_' + uid(), submittedAt: new Date().toISOString() }
      setFeedbackEntries((prev) => {
        if (existing) {
          return prev.map((x) => (x.id === existing.id ? row : x))
        }
        return [...prev, row]
      })
      void (async () => {
        const { error } = await client.from('portal_feedback_entries').upsert({
          id: row.id,
          cycle_id: row.cycleId,
          subject_user_id: row.subjectUserId,
          reviewer_id: row.reviewerId,
          relationship: row.relationship,
          answers: row.answers,
          submitted_at: row.submittedAt,
        })
        if (error) reportHrError('submit feedback', error)
        await reloadHr()
      })()
    },
    [client, feedbackEntries, reloadHr],
  )

  const addJobRequisition = useCallback(
    (r: Omit<JobRequisition, 'id' | 'createdAt'>) => {
      const row: JobRequisition = {
        ...r,
        id: 'job_' + uid(),
        createdAt: new Date().toISOString(),
        createdById: user?.id,
      }
      setJobRequisitions((prev) => [row, ...prev])
      void (async () => {
        const { error } = await client.from('portal_job_requisitions').insert({
          id: row.id,
          title: row.title,
          department: row.department,
          status: row.status,
          description: row.description ?? null,
          created_by: user?.id ?? null,
          created_at: row.createdAt,
        })
        if (error) reportHrError('add job requisition', error)
        await reloadHr()
      })()
    },
    [client, reloadHr, user?.id],
  )

  const updateJobRequisition = useCallback(
    (id: string, patch: Partial<JobRequisition>) => {
      setJobRequisitions((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
      void (async () => {
        const cur = jobRequisitions.find((j) => j.id === id)
        if (!cur) return
        const next = { ...cur, ...patch }
        const { error } = await client
          .from('portal_job_requisitions')
          .update({
            title: next.title,
            department: next.department,
            status: next.status,
            description: next.description ?? null,
          })
          .eq('id', id)
        if (error) reportHrError('update job requisition', error)
        await reloadHr()
      })()
    },
    [client, jobRequisitions, reloadHr],
  )

  const addJobCandidate = useCallback(
    (c: Omit<JobCandidate, 'id' | 'updatedAt'>) => {
      const row: JobCandidate = { ...c, id: 'cand_' + uid(), updatedAt: new Date().toISOString() }
      setJobCandidates((prev) => [row, ...prev])
      void (async () => {
        const { error } = await client.from('portal_job_candidates').insert({
          id: row.id,
          requisition_id: row.requisitionId,
          name: row.name,
          email: row.email ?? null,
          stage: row.stage,
          notes: row.notes ?? null,
          score: row.score ?? null,
          updated_at: row.updatedAt,
        })
        if (error) reportHrError('add candidate', error)
        await reloadHr()
      })()
    },
    [client, reloadHr],
  )

  const updateJobCandidate = useCallback(
    (id: string, patch: Partial<JobCandidate>) => {
      const updatedAt = new Date().toISOString()
      setJobCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt } : c)),
      )
      void (async () => {
        const cur = jobCandidates.find((c) => c.id === id)
        if (!cur) return
        const next = { ...cur, ...patch, updatedAt }
        const { error } = await client
          .from('portal_job_candidates')
          .update({
            requisition_id: next.requisitionId,
            name: next.name,
            email: next.email ?? null,
            stage: next.stage,
            notes: next.notes ?? null,
            score: next.score ?? null,
            updated_at: updatedAt,
          })
          .eq('id', id)
        if (error) reportHrError('update candidate', error)
        await reloadHr()
      })()
    },
    [client, jobCandidates, reloadHr],
  )

  const addExitInterview = useCallback(
    (e: Omit<HrContextValue['exitInterviews'][0], 'id' | 'createdAt'>) => {
      const row = { ...e, id: 'exit_' + uid(), createdAt: new Date().toISOString() }
      setExitInterviews((prev) => [row, ...prev])
      void (async () => {
        const { error } = await client.from('portal_exit_interviews').insert({
          id: row.id,
          user_id: row.userId ?? null,
          departing_name: row.departingName,
          last_day: row.lastDay ?? null,
          reasons: row.reasons,
          notes: row.notes ?? null,
          conducted_by: row.conductedById ?? user?.id ?? null,
          created_at: row.createdAt,
        })
        if (error) reportHrError('add exit interview', error)
        await reloadHr()
      })()
    },
    [client, reloadHr, user?.id],
  )

  const submitGrievance = useCallback(
    (g: Omit<Grievance, 'id' | 'status' | 'hrNote' | 'createdAt'>) => {
      const row: Grievance = {
        ...g,
        id: 'grv_' + uid(),
        status: 'open',
        createdAt: new Date().toISOString(),
      }
      setGrievances((prev) => [row, ...prev])
      void (async () => {
        const { error } = await client.from('portal_grievances').insert({
          id: row.id,
          user_id: row.userId,
          category: row.category,
          body: row.body,
          status: row.status,
          confidential: row.confidential,
          created_at: row.createdAt,
        })
        if (error) reportHrError('submit grievance', error)
        await reloadHr()
      })()
    },
    [client, reloadHr],
  )

  const updateGrievance = useCallback(
    (id: string, patch: Partial<Grievance>) => {
      setGrievances((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
      void (async () => {
        const cur = grievances.find((g) => g.id === id)
        if (!cur) return
        const next = { ...cur, ...patch }
        const { error } = await client
          .from('portal_grievances')
          .update({ status: next.status, hr_note: next.hrNote ?? null })
          .eq('id', id)
        if (error) reportHrError('update grievance', error)
        await reloadHr()
      })()
    },
    [client, grievances, reloadHr],
  )

  const setMilestoneCompleted = useCallback(
    (id: string, completed: boolean) => {
      const completedAt = completed ? new Date().toISOString() : undefined
      setOnboardingMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...m, completed, completedAt } : m)),
      )
      void (async () => {
        const { error } = await client
          .from('portal_onboarding_milestones')
          .update({ completed, completed_at: completedAt ?? null })
          .eq('id', id)
        if (error) reportHrError('update milestone', error)
        await reloadHr()
      })()
    },
    [client, reloadHr],
  )

  const seedOnboardingMilestones = useCallback(
    (userId: string) => {
      if (onboardingMilestones.some((m) => m.userId === userId)) return
      const rows = DEFAULT_MILESTONES(userId)
      setOnboardingMilestones((prev) => [...prev, ...rows])
      void (async () => {
        const { error } = await client.from('portal_onboarding_milestones').insert(
          rows.map((m) => ({
            id: m.id,
            user_id: m.userId,
            phase: m.phase,
            label: m.label,
            completed: m.completed,
            completed_at: m.completedAt ?? null,
            due_date: m.dueDate ?? null,
          })),
        )
        if (error) reportHrError('seed onboarding milestones', error)
        await reloadHr()
      })()
    },
    [client, onboardingMilestones, reloadHr],
  )

  const addQuarterlyAward = useCallback(
    (a: Omit<QuarterlyAward, 'id' | 'createdAt'>) => {
      const row: QuarterlyAward = { ...a, id: 'award_' + uid(), createdAt: new Date().toISOString() }
      setQuarterlyAwards((prev) => [row, ...prev])
      void (async () => {
        const { error } = await client.from('portal_quarterly_awards').insert({
          id: row.id,
          year: row.year,
          quarter: row.quarter,
          category: row.category,
          winner_id: row.winnerId,
          nominated_by: row.nominatedById ?? user?.id ?? null,
          note: row.note ?? null,
          created_at: row.createdAt,
        })
        if (error) reportHrError('add quarterly award', error)
        await reloadHr()
      })()
    },
    [client, reloadHr, user?.id],
  )

  const getMetrics = useCallback(
    (options?: { teamScope?: boolean }): HrMetrics => {
      const memberIds =
        options?.teamScope && user ? directReportIds(users, user.id) : undefined
      const pulseOverrides =
        memberIds && teamPulseAggregates
          ? {
              engagementScore: teamPulseAggregates.engagementScore,
              enpsScore: teamPulseAggregates.enpsScore,
            }
          : undefined
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
        },
        { memberIds, pulseOverrides },
      )
    },
    [
      user,
      teamPulseAggregates,
      pulseSurveys,
      pulseResponses,
      learningAssignments,
      learningSubmissions,
      oneOnOneLogs,
      grievances,
      users,
      leaveRequests,
    ],
  )

  const value = useMemo<HrContextValue>(
    () => ({
      pulseSurveys,
      pulseResponses,
      submitPulseResponse,
      createPulseSurvey,
      updatePulseSurvey,
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
      hrStatus,
      reloadHr,
    }),
    [
      pulseSurveys,
      pulseResponses,
      submitPulseResponse,
      createPulseSurvey,
      updatePulseSurvey,
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
      hrStatus,
      reloadHr,
    ],
  )

  return <HrContext.Provider value={value}>{children}</HrContext.Provider>
}
