import { useCallback, useMemo, useRef } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  beginPeopleOpsWrite,
  endPeopleOpsWrite,
  pauseHrRealtime,
  resumeHrRealtime,
} from '@/lib/supabase/peopleOpsDataset'
import {
  appraisalBandFromOverall,
  computeAppraisalOverall,
  computeProfileCompleteness,
  DEFAULT_PIP_TEMPLATES,
  defaultPipDurationDays,
  emptyEmployeeProfile,
} from '@/lib/hrPeopleOps'
import { uid } from '@/utils/helpers'
import type {
  DisciplineCase,
  EmployeePersonalFields,
  EmployeeProfile,
  FormalAppraisal,
  HrAuditEntry,
  ManagerPeopleScorecard,
  OffboardingChecklist,
  PerformanceImprovementPlan,
  PipGoal,
  PipReview,
  PipTemplate,
} from '@/types/hr'
import type { Task } from '@/types'
import type { Okr, OneOnOneLog } from '@/types/hr'

export type PeopleOpsPersist = {
  employeeProfile?: (row: EmployeeProfile) => void
  disciplineCase?: (row: DisciplineCase) => void
  pip?: (row: PerformanceImprovementPlan) => void
  appraisal?: (row: FormalAppraisal) => void
  audit?: (row: HrAuditEntry) => void
  offboarding?: (row: OffboardingChecklist) => void
}

export type PeopleOpsHydrate = {
  employeeProfiles?: EmployeeProfile[]
  disciplineCases?: DisciplineCase[]
  performanceImprovementPlans?: PerformanceImprovementPlan[]
  formalAppraisals?: FormalAppraisal[]
  hrAuditLog?: HrAuditEntry[]
  offboardingChecklists?: OffboardingChecklist[]
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const DEFAULT_OFFBOARDING_ITEMS = (volunteer: boolean): OffboardingChecklist['items'] => {
  const base = [
    { id: `obi_${uid()}`, label: 'Complete or reassign outstanding Portal tasks', status: 'pending' as const },
    { id: `obi_${uid()}`, label: 'Final weekly check-in submitted', status: 'pending' as const },
    { id: `obi_${uid()}`, label: 'Knowledge transfer documented in Portal', status: 'pending' as const },
    { id: `obi_${uid()}`, label: 'Revoke system access (email, Slack, Portal)', status: 'pending' as const },
    { id: `obi_${uid()}`, label: 'Collect company assets / credentials', status: 'pending' as const },
    { id: `obi_${uid()}`, label: 'Exit interview / status-end note recorded', status: 'pending' as const },
  ]
  if (volunteer) {
    base.unshift({
      id: `obi_${uid()}`,
      label: 'Two-week bridge notice acknowledged (Volunteer CoC)',
      status: 'pending',
    })
  }
  return base
}

export function useLocalPeopleOpsHr(deps: {
  tasks: Task[]
  okrs: Okr[]
  oneOnOneLogs: OneOnOneLog[]
  users: Array<{ id: string; role: string }>
  teams: Array<{ leadUserId?: string; asstLeadUserId?: string; memberIds: string[] }>
  persist?: PeopleOpsPersist
}) {
  const [employeeProfiles, setEmployeeProfiles] = useLocalStorage<EmployeeProfile[]>(
    'av-hr-employee-profiles',
    [],
  )
  const [disciplineCases, setDisciplineCases] = useLocalStorage<DisciplineCase[]>(
    'av-hr-discipline-cases',
    [],
  )
  const [performanceImprovementPlans, setPips] = useLocalStorage<PerformanceImprovementPlan[]>(
    'av-hr-pips',
    [],
  )
  const [pipTemplates] = useLocalStorage<PipTemplate[]>(
    'av-hr-pip-templates',
    DEFAULT_PIP_TEMPLATES,
  )
  const [formalAppraisals, setFormalAppraisals] = useLocalStorage<FormalAppraisal[]>(
    'av-hr-appraisals',
    [],
  )
  const [hrAuditLog, setHrAuditLog] = useLocalStorage<HrAuditEntry[]>('av-hr-audit-log', [])
  const [offboardingChecklists, setOffboarding] = useLocalStorage<OffboardingChecklist[]>(
    'av-hr-offboarding',
    [],
  )

  const persist = deps.persist
  const persistRef = useRef(persist)
  persistRef.current = persist
  const disciplineCasesRef = useRef(disciplineCases)
  disciplineCasesRef.current = disciplineCases
  const pipsRef = useRef(performanceImprovementPlans)
  pipsRef.current = performanceImprovementPlans
  const persistQueueRef = useRef(Promise.resolve())
  const persistResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistPausedRef = useRef(false)

  const enqueuePersist = (task: () => void | Promise<void>) => {
    persistQueueRef.current = persistQueueRef.current
      .then(async () => {
        if (!persistPausedRef.current) {
          beginPeopleOpsWrite()
          pauseHrRealtime()
          persistPausedRef.current = true
        }
        if (persistResumeTimer.current) clearTimeout(persistResumeTimer.current)
        try {
          await Promise.resolve(task())
        } finally {
          persistResumeTimer.current = setTimeout(() => {
            if (!persistPausedRef.current) return
            persistPausedRef.current = false
            endPeopleOpsWrite()
            resumeHrRealtime()
          }, 700)
        }
      })
      .catch((err) => {
        console.warn('[hr] people ops persist', err)
      })
  }

  const persistRow = <K extends keyof PeopleOpsPersist>(
    key: K,
    row: Parameters<NonNullable<PeopleOpsPersist[K]>>[0],
  ) => {
    if (!persistRef.current?.[key]) return
    enqueuePersist(() => persistRef.current?.[key]?.(row as never))
  }

  const appendHrAudit = useCallback(
    (entry: Omit<HrAuditEntry, 'id' | 'createdAt'>) => {
      const row: HrAuditEntry = {
        ...entry,
        id: `aud_${uid()}`,
        createdAt: new Date().toISOString(),
      }
      setHrAuditLog((prev) => [row, ...prev])
      persistRow('audit', row)
    },
    [setHrAuditLog],
  )

  const ensureEmployeeProfile = useCallback(
    (userId: string) => {
      const existing = employeeProfiles.find((p) => p.userId === userId && !p.archived)
      if (existing) return existing
      return {
        ...emptyEmployeeProfile(userId),
        id: `epr_${userId}`,
        profileCompleteness: 0,
        createdAt: '',
        updatedAt: '',
      }
    },
    [employeeProfiles],
  )

  const saveEmployeePersonalFields = useCallback(
    (userId: string, fields: EmployeePersonalFields) => {
      const now = new Date().toISOString()
      setEmployeeProfiles((prev) => {
        const existing = prev.find((p) => p.userId === userId)
        const row: EmployeeProfile = existing
          ? {
              ...existing,
              ...fields,
              lastEmployeeUpdateAt: now,
              updatedAt: now,
              hrRequestsUpdate: false,
              profileCompleteness: 0,
            }
          : {
              ...emptyEmployeeProfile(userId),
              ...fields,
              id: `epr_${userId}`,
              lastEmployeeUpdateAt: now,
              createdAt: now,
              updatedAt: now,
              profileCompleteness: 0,
            }
        row.profileCompleteness = computeProfileCompleteness(row)
        persistRow('employeeProfile', row)
        if (existing) return prev.map((p) => (p.userId === userId ? row : p))
        return [...prev, row]
      })
      appendHrAudit({
        actorId: userId,
        entityType: 'employee_profile',
        entityId: userId,
        action: 'personal_update',
        summary: 'Employee updated personal information',
      })
    },
    [appendHrAudit, setEmployeeProfiles],
  )

  const saveEmployeeProfileHr = useCallback(
    (
      profile: Omit<EmployeeProfile, 'id' | 'createdAt' | 'updatedAt' | 'profileCompleteness'> & {
        id?: string
      },
    ) => {
      const now = new Date().toISOString()
      setEmployeeProfiles((prev) => {
        const existing =
          (profile.id ? prev.find((p) => p.id === profile.id) : undefined) ??
          prev.find((p) => p.userId === profile.userId)
        const id = (profile.id && profile.id.length > 0 ? profile.id : undefined) ?? existing?.id ?? `epr_${profile.userId}`
        const row: EmployeeProfile = {
          ...(existing ?? emptyEmployeeProfile(profile.userId)),
          ...profile,
          id,
          lastHrUpdateAt: now,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
          profileCompleteness: 0,
        }
        row.profileCompleteness = computeProfileCompleteness(row)
        persistRow('employeeProfile', row)
        if (existing) return prev.map((p) => (p.id === existing.id || p.userId === profile.userId ? row : p))
        return [...prev, row]
      })
      appendHrAudit({
        actorId: profile.userId,
        entityType: 'employee_profile',
        entityId: profile.userId,
        action: 'hr_save',
        summary: 'HR saved employee profile',
      })
    },
    [appendHrAudit, setEmployeeProfiles],
  )

  const archiveEmployeeProfile = useCallback(
    (userId: string, archived = true) => {
      const now = new Date().toISOString()
      setEmployeeProfiles((prev) =>
        prev.map((p) => {
          if (p.userId !== userId) return p
          const row: EmployeeProfile = {
            ...p,
            archived,
            employmentStatus: archived ? 'archived' : p.employmentStatus,
            updatedAt: now,
            lastHrUpdateAt: now,
          }
          persistRow('employeeProfile', row)
          return row
        }),
      )
      appendHrAudit({
        actorId: userId,
        entityType: 'employee_profile',
        entityId: userId,
        action: archived ? 'archive' : 'unarchive',
        summary: archived ? 'Profile archived' : 'Profile restored',
      })
    },
    [appendHrAudit, setEmployeeProfiles],
  )

  const recommendDisciplineCase = useCallback(
    (
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
    ) => {
      const now = new Date().toISOString()
      const id = `dsc_${uid()}`
      const row: DisciplineCase = {
        ...c,
        id,
        status: 'pending_hr',
        recommendedById: c.recommendedById ?? c.issuedById,
        createdAt: now,
        updatedAt: now,
      }
      disciplineCasesRef.current = [row, ...disciplineCasesRef.current.filter((x) => x.id !== id)]
      setDisciplineCases(disciplineCasesRef.current)
      persistRow('disciplineCase', row)
      appendHrAudit({
        actorId: c.issuedById,
        entityType: 'discipline_case',
        entityId: id,
        action: 'recommend',
        summary: `Recommended ${c.step} for subject`,
      })
      return id
    },
    [appendHrAudit, setDisciplineCases],
  )

  const saveDisciplineCase = useCallback(
    (c: Omit<DisciplineCase, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const now = new Date().toISOString()
      const id = c.id ?? `dsc_${uid()}`
      const existing = disciplineCasesRef.current.find((x) => x.id === id)
      const row: DisciplineCase = {
        ...c,
        id,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      disciplineCasesRef.current = existing
        ? disciplineCasesRef.current.map((x) => (x.id === id ? row : x))
        : [row, ...disciplineCasesRef.current]
      setDisciplineCases(disciplineCasesRef.current)
      persistRow('disciplineCase', row)
      return id
    },
    [setDisciplineCases],
  )

  const createPipForCase = useCallback(
    (
      caseId: string,
      opts?: { templateKey?: string; durationDays?: number; startDate?: string },
    ) => {
      const dc = disciplineCasesRef.current.find((c) => c.id === caseId)
      if (!dc) return null
      const tpl =
        pipTemplates.find((t) => t.key === opts?.templateKey) ??
        pipTemplates.find((t) => t.employeeLevel === dc.employeeLevel) ??
        pipTemplates[0]
      const start = opts?.startDate ?? new Date().toISOString().slice(0, 10)
      const duration =
        opts?.durationDays ??
        tpl?.defaultDurationDays ??
        defaultPipDurationDays(dc.severity, dc.employeeLevel)
      const end = addDays(start, duration)
      const goals: PipGoal[] = (tpl?.goalTemplates ?? []).map((g) => ({
        id: `pg_${uid()}`,
        description: g.description,
        successMetric: g.successMetric,
        dueDate: end,
        status: 'not_started',
      }))
      const cadence = tpl?.reviewCadenceDays ?? [7, 14, 30]
      const reviews: PipReview[] = cadence.map((day) => ({
        id: `prv_${uid()}`,
        scheduledAt: addDays(start, Math.min(day, duration)),
        reviewerId: dc.issuedById,
      }))
      const pipId = `pip_${uid()}`
      const now = new Date().toISOString()
      const pip: PerformanceImprovementPlan = {
        id: pipId,
        caseId,
        subjectUserId: dc.subjectUserId,
        goals,
        startDate: start,
        endDate: end,
        durationDays: duration,
        reviews,
        templateKey: tpl?.key,
        createdAt: now,
        updatedAt: now,
      }
      pipsRef.current = [pip, ...pipsRef.current.filter((p) => p.id !== pipId)]
      setPips(pipsRef.current)
      persistRow('disciplineCase', dc)
      persistRow('pip', pip)
      const nextCase: DisciplineCase = { ...dc, pipId, step: 'pip', updatedAt: now }
      disciplineCasesRef.current = disciplineCasesRef.current.map((c) =>
        c.id === caseId ? nextCase : c,
      )
      setDisciplineCases(disciplineCasesRef.current)
      persistRow('disciplineCase', nextCase)
      appendHrAudit({
        actorId: dc.issuedById,
        entityType: 'pip',
        entityId: pipId,
        action: 'create',
        summary: 'PIP created from discipline case',
      })
      return pipId
    },
    [appendHrAudit, pipTemplates, setDisciplineCases, setPips],
  )

  const approveDisciplineCase = useCallback(
    (id: string, approvedById: string) => {
      const dc = disciplineCasesRef.current.find((c) => c.id === id)
      if (!dc) return false
      const now = new Date().toISOString()
      const next: DisciplineCase = {
        ...dc,
        status: 'active',
        approvedById,
        deliveredAt: dc.deliveredAt ?? now,
        updatedAt: now,
      }
      disciplineCasesRef.current = disciplineCasesRef.current.map((c) => (c.id === id ? next : c))
      setDisciplineCases(disciplineCasesRef.current)
      persistRow('disciplineCase', next)
      if (next.step === 'pip' && !next.pipId) {
        createPipForCase(id)
      }
      appendHrAudit({
        actorId: approvedById,
        entityType: 'discipline_case',
        entityId: id,
        action: 'approve',
        summary: 'HR approved discipline case',
      })
      return true
    },
    [appendHrAudit, createPipForCase, setDisciplineCases],
  )

  const acknowledgeDisciplineCase = useCallback(
    (id: string) => {
      const now = new Date().toISOString()
      const dc = disciplineCasesRef.current.find((c) => c.id === id)
      if (!dc) return false
      const next: DisciplineCase = { ...dc, acknowledgedAt: now, updatedAt: now }
      disciplineCasesRef.current = disciplineCasesRef.current.map((c) => (c.id === id ? next : c))
      setDisciplineCases(disciplineCasesRef.current)
      persistRow('disciplineCase', next)
      return true
    },
    [setDisciplineCases],
  )

  const savePip = useCallback(
    (pip: Omit<PerformanceImprovementPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const now = new Date().toISOString()
      const id = pip.id ?? `pip_${uid()}`
      const existing = pipsRef.current.find((p) => p.id === id)
      const row: PerformanceImprovementPlan = {
        ...pip,
        id,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      pipsRef.current = existing
        ? pipsRef.current.map((p) => (p.id === id ? row : p))
        : [row, ...pipsRef.current]
      setPips(pipsRef.current)
      persistRow('pip', row)
    },
    [setPips],
  )

  const completePipReview = useCallback(
    (
      pipId: string,
      reviewId: string,
      patch: {
        rating: NonNullable<PipReview['rating']>
        notes?: string
        nextActions?: string
        reviewerId: string
      },
    ) => {
      const now = new Date().toISOString()
      const pip = pipsRef.current.find((p) => p.id === pipId)
      if (!pip) return false
      const row: PerformanceImprovementPlan = {
        ...pip,
        updatedAt: now,
        reviews: pip.reviews.map((r) =>
          r.id === reviewId
            ? { ...r, ...patch, completedAt: now, reviewerId: patch.reviewerId }
            : r,
        ),
      }
      pipsRef.current = pipsRef.current.map((p) => (p.id === pipId ? row : p))
      setPips(pipsRef.current)
      persistRow('pip', row)
      return true
    },
    [setPips],
  )

  const closePip = useCallback(
    (
      pipId: string,
      outcome: NonNullable<PerformanceImprovementPlan['outcome']>,
      outcomeById: string,
      note?: string,
    ) => {
      const now = new Date().toISOString()
      const pip = pipsRef.current.find((p) => p.id === pipId)
      if (!pip) return false
      const row: PerformanceImprovementPlan = {
        ...pip,
        outcome,
        outcomeNote: note,
        outcomeAt: now,
        outcomeById,
        updatedAt: now,
      }
      pipsRef.current = pipsRef.current.map((p) => (p.id === pipId ? row : p))
      setPips(pipsRef.current)
      persistRow('pip', row)
      const dc = disciplineCasesRef.current.find((c) => c.id === pip.caseId)
      if (dc) {
        const nextCase: DisciplineCase = {
          ...dc,
          status:
            outcome === 'escalated' || outcome === 'terminated_recommendation'
              ? 'escalated'
              : 'completed',
          updatedAt: now,
        }
        disciplineCasesRef.current = disciplineCasesRef.current.map((c) =>
          c.id === pip.caseId ? nextCase : c,
        )
        setDisciplineCases(disciplineCasesRef.current)
        persistRow('disciplineCase', nextCase)
      }
      appendHrAudit({
        actorId: outcomeById,
        entityType: 'pip',
        entityId: pipId,
        action: 'close',
        summary: `PIP closed: ${outcome}`,
      })
      return true
    },
    [appendHrAudit, setDisciplineCases, setPips],
  )

  const saveFormalAppraisal = useCallback(
    (
      a: Omit<FormalAppraisal, 'id' | 'createdAt' | 'updatedAt' | 'overallScore' | 'band'> & {
        id?: string
      },
    ) => {
      const now = new Date().toISOString()
      const id = a.id ?? `apr_${uid()}`
      const overallScore = computeAppraisalOverall(a.scores)
      const band = appraisalBandFromOverall(overallScore)
      let row: FormalAppraisal | null = null
      setFormalAppraisals((prev) => {
        const existing = prev.find((x) => x.id === id)
        row = {
          ...a,
          id,
          overallScore,
          band,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        if (existing) return prev.map((x) => (x.id === id ? row! : x))
        return [row, ...prev]
      })
      if (row) persistRow('appraisal', row)
      return id
    },
    [setFormalAppraisals],
  )

  const finalizeAppraisal = useCallback(
    (id: string) => {
      const now = new Date().toISOString()
      let next: FormalAppraisal | undefined
      setFormalAppraisals((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a
          next = { ...a, status: 'finalized', finalizedAt: now, updatedAt: now }
          return next
        }),
      )
      if (next) persistRow('appraisal', next)
      appendHrAudit({
        actorId: next?.reviewerId ?? id,
        entityType: 'appraisal',
        entityId: id,
        action: 'finalize',
        summary: 'Appraisal finalized',
      })
      return true
    },
    [appendHrAudit, setFormalAppraisals],
  )

  const createOffboardingChecklist = useCallback(
    (
      c: Omit<OffboardingChecklist, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'items'> & {
        items?: OffboardingChecklist['items']
      },
    ) => {
      const now = new Date().toISOString()
      const id = `off_${uid()}`
      const row: OffboardingChecklist = {
        ...c,
        id,
        status: 'open',
        items: c.items ?? DEFAULT_OFFBOARDING_ITEMS(c.volunteerBridgeNotice),
        createdAt: now,
        updatedAt: now,
      }
      setOffboarding((prev) => [row, ...prev])
      persistRow('offboarding', row)
      setEmployeeProfiles((prev) =>
        prev.map((p) => {
          if (p.userId !== c.userId) return p
          const updated: EmployeeProfile = {
            ...p,
            employmentStatus: 'exiting',
            updatedAt: now,
            lastHrUpdateAt: now,
          }
          persistRow('employeeProfile', updated)
          return updated
        }),
      )
      appendHrAudit({
        actorId: c.createdById,
        entityType: 'offboarding',
        entityId: id,
        action: 'create',
        summary: 'Offboarding checklist opened',
      })
      return id
    },
    [appendHrAudit, setEmployeeProfiles, setOffboarding],
  )

  const updateOffboardingChecklist = useCallback(
    (id: string, patch: Partial<OffboardingChecklist>) => {
      const now = new Date().toISOString()
      setOffboarding((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o
          const row: OffboardingChecklist = { ...o, ...patch, updatedAt: now }
          persistRow('offboarding', row)
          return row
        }),
      )
    },
    [setOffboarding],
  )

  const hydratePeopleOps = useCallback(
    (data: PeopleOpsHydrate) => {
      if (data.employeeProfiles) setEmployeeProfiles(data.employeeProfiles)
      if (data.disciplineCases) {
        disciplineCasesRef.current = data.disciplineCases
        setDisciplineCases(data.disciplineCases)
      }
      if (data.performanceImprovementPlans) {
        pipsRef.current = data.performanceImprovementPlans
        setPips(data.performanceImprovementPlans)
      }
      if (data.formalAppraisals) setFormalAppraisals(data.formalAppraisals)
      if (data.hrAuditLog) setHrAuditLog(data.hrAuditLog)
      if (data.offboardingChecklists) setOffboarding(data.offboardingChecklists)
    },
    [setDisciplineCases, setEmployeeProfiles, setFormalAppraisals, setHrAuditLog, setOffboarding, setPips],
  )

  const getManagerPeopleScorecard = useCallback(
    (managerId: string, periodLabel = new Date().toISOString().slice(0, 7)): ManagerPeopleScorecard => {
      const leadTeams = deps.teams.filter(
        (t) => t.leadUserId === managerId || t.asstLeadUserId === managerId,
      )
      const memberIds = new Set(leadTeams.flatMap((t) => t.memberIds))
      const teamTasks = deps.tasks.filter(
        (t) =>
          memberIds.has(t.ownerId) ||
          (t.assigneeIds ?? []).some((id) => memberIds.has(id)),
      )
      const done = teamTasks.filter((t) => t.status === 'done').length
      const deliveryConsistency =
        teamTasks.length === 0 ? 0 : Math.round((done / teamTasks.length) * 100)
      const teamOkrs = deps.okrs.filter((o) => memberIds.has(o.userId))
      const krAll = teamOkrs.flatMap((o) => o.keyResults)
      const kpiCompletion =
        krAll.length === 0
          ? 0
          : Math.round(krAll.reduce((s, kr) => s + Math.min(100, kr.progress), 0) / krAll.length)
      const month = periodLabel
      const ones = deps.oneOnOneLogs.filter(
        (l) => l.managerId === managerId && l.month === month,
      )
      const communicationDiscipline =
        ones.length === 0
          ? 50
          : Math.round((ones.filter((o) => o.completed).length / ones.length) * 100)
      const openBlocked = teamTasks.filter((t) => t.status === 'blocked').length
      const escalationQuality =
        teamTasks.length === 0
          ? 70
          : Math.max(0, 100 - Math.round((openBlocked / teamTasks.length) * 100))
      return {
        managerId,
        periodLabel,
        deliveryConsistency,
        kpiCompletion,
        communicationDiscipline,
        escalationQuality,
      }
    },
    [deps],
  )

  return useMemo(
    () => ({
      employeeProfiles,
      ensureEmployeeProfile,
      saveEmployeePersonalFields,
      saveEmployeeProfileHr,
      archiveEmployeeProfile,
      disciplineCases,
      recommendDisciplineCase,
      saveDisciplineCase,
      approveDisciplineCase,
      acknowledgeDisciplineCase,
      performanceImprovementPlans,
      pipTemplates,
      createPipForCase,
      savePip,
      completePipReview,
      closePip,
      formalAppraisals,
      saveFormalAppraisal,
      finalizeAppraisal,
      hrAuditLog,
      appendHrAudit,
      offboardingChecklists,
      createOffboardingChecklist,
      updateOffboardingChecklist,
      getManagerPeopleScorecard,
      hydratePeopleOps,
    }),
    [
      employeeProfiles,
      ensureEmployeeProfile,
      saveEmployeePersonalFields,
      saveEmployeeProfileHr,
      archiveEmployeeProfile,
      disciplineCases,
      recommendDisciplineCase,
      saveDisciplineCase,
      approveDisciplineCase,
      acknowledgeDisciplineCase,
      performanceImprovementPlans,
      pipTemplates,
      createPipForCase,
      savePip,
      completePipReview,
      closePip,
      formalAppraisals,
      saveFormalAppraisal,
      finalizeAppraisal,
      hrAuditLog,
      appendHrAudit,
      offboardingChecklists,
      createOffboardingChecklist,
      updateOffboardingChecklist,
      getManagerPeopleScorecard,
      hydratePeopleOps,
    ],
  )
}
