import { useCallback, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
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

  const appendHrAudit = useCallback(
    (entry: Omit<HrAuditEntry, 'id' | 'createdAt'>) => {
      setHrAuditLog((prev) => [
        { ...entry, id: `aud_${uid()}`, createdAt: new Date().toISOString() },
        ...prev,
      ])
    },
    [setHrAuditLog],
  )

  const ensureEmployeeProfile = useCallback(
    (userId: string) => {
      const existing = employeeProfiles.find((p) => p.userId === userId && !p.archived)
      if (existing) return existing
      const now = new Date().toISOString()
      const row: EmployeeProfile = {
        ...emptyEmployeeProfile(userId),
        id: `epr_${uid()}`,
        profileCompleteness: 0,
        createdAt: now,
        updatedAt: now,
      }
      setEmployeeProfiles((prev) => [...prev, row])
      return row
    },
    [employeeProfiles, setEmployeeProfiles],
  )

  const saveEmployeePersonalFields = useCallback(
    (userId: string, fields: EmployeePersonalFields) => {
      const now = new Date().toISOString()
      setEmployeeProfiles((prev) => {
        const existing = prev.find((p) => p.userId === userId)
        if (existing) {
          const next = {
            ...existing,
            ...fields,
            lastEmployeeUpdateAt: now,
            updatedAt: now,
            hrRequestsUpdate: false,
          }
          next.profileCompleteness = computeProfileCompleteness(next)
          return prev.map((p) => (p.userId === userId ? next : p))
        }
        const row: EmployeeProfile = {
          ...emptyEmployeeProfile(userId),
          ...fields,
          id: `epr_${uid()}`,
          lastEmployeeUpdateAt: now,
          createdAt: now,
          updatedAt: now,
          profileCompleteness: 0,
        }
        row.profileCompleteness = computeProfileCompleteness(row)
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
        const id = profile.id ?? existing?.id ?? `epr_${uid()}`
        const row: EmployeeProfile = {
          ...(existing ?? emptyEmployeeProfile(profile.userId)),
          ...profile,
          id,
          lastHrUpdateAt: now,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          profileCompleteness: 0,
        }
        row.profileCompleteness = computeProfileCompleteness(row)
        if (existing) return prev.map((p) => (p.id === id ? row : p))
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
        prev.map((p) =>
          p.userId === userId
            ? {
                ...p,
                archived,
                employmentStatus: archived ? 'archived' : p.employmentStatus,
                updatedAt: now,
                lastHrUpdateAt: now,
              }
            : p,
        ),
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
      setDisciplineCases((prev) => [row, ...prev])
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
      setDisciplineCases((prev) => {
        const existing = prev.find((x) => x.id === id)
        const row: DisciplineCase = {
          ...c,
          id,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        if (existing) return prev.map((x) => (x.id === id ? row : x))
        return [row, ...prev]
      })
      return id
    },
    [setDisciplineCases],
  )

  const createPipForCase = useCallback(
    (
      caseId: string,
      opts?: { templateKey?: string; durationDays?: number; startDate?: string },
    ) => {
      const dc = disciplineCases.find((c) => c.id === caseId)
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
      setPips((prev) => [pip, ...prev])
      setDisciplineCases((prev) =>
        prev.map((c) =>
          c.id === caseId ? { ...c, pipId, step: 'pip', updatedAt: now } : c,
        ),
      )
      appendHrAudit({
        actorId: dc.issuedById,
        entityType: 'pip',
        entityId: pipId,
        action: 'create',
        summary: 'PIP created from discipline case',
      })
      return pipId
    },
    [appendHrAudit, disciplineCases, pipTemplates, setDisciplineCases, setPips],
  )

  const approveDisciplineCase = useCallback(
    (id: string, approvedById: string) => {
      const dc = disciplineCases.find((c) => c.id === id)
      if (!dc) return false
      if (dc.step === 'termination_case') {
        // HR-only gate enforced in UI; still allow here
      }
      const now = new Date().toISOString()
      setDisciplineCases((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: 'active',
                approvedById,
                deliveredAt: c.deliveredAt ?? now,
                updatedAt: now,
              }
            : c,
        ),
      )
      if (dc.step === 'pip' && !dc.pipId) {
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
    [appendHrAudit, createPipForCase, disciplineCases, setDisciplineCases],
  )

  const acknowledgeDisciplineCase = useCallback(
    (id: string) => {
      const now = new Date().toISOString()
      setDisciplineCases((prev) =>
        prev.map((c) => (c.id === id ? { ...c, acknowledgedAt: now, updatedAt: now } : c)),
      )
      return true
    },
    [setDisciplineCases],
  )

  const savePip = useCallback(
    (pip: Omit<PerformanceImprovementPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const now = new Date().toISOString()
      const id = pip.id ?? `pip_${uid()}`
      setPips((prev) => {
        const existing = prev.find((p) => p.id === id)
        const row: PerformanceImprovementPlan = {
          ...pip,
          id,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        if (existing) return prev.map((p) => (p.id === id ? row : p))
        return [row, ...prev]
      })
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
      setPips((prev) =>
        prev.map((p) => {
          if (p.id !== pipId) return p
          return {
            ...p,
            updatedAt: now,
            reviews: p.reviews.map((r) =>
              r.id === reviewId
                ? {
                    ...r,
                    ...patch,
                    completedAt: now,
                    reviewerId: patch.reviewerId,
                  }
                : r,
            ),
          }
        }),
      )
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
      setPips((prev) =>
        prev.map((p) =>
          p.id === pipId
            ? {
                ...p,
                outcome,
                outcomeNote: note,
                outcomeAt: now,
                outcomeById,
                updatedAt: now,
              }
            : p,
        ),
      )
      const pip = performanceImprovementPlans.find((p) => p.id === pipId)
      if (pip) {
        setDisciplineCases((prev) =>
          prev.map((c) =>
            c.id === pip.caseId
              ? {
                  ...c,
                  status:
                    outcome === 'escalated' || outcome === 'terminated_recommendation'
                      ? 'escalated'
                      : 'completed',
                  updatedAt: now,
                }
              : c,
          ),
        )
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
    [appendHrAudit, performanceImprovementPlans, setDisciplineCases, setPips],
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
      setFormalAppraisals((prev) => {
        const existing = prev.find((x) => x.id === id)
        const row: FormalAppraisal = {
          ...a,
          id,
          overallScore,
          band,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        if (existing) return prev.map((x) => (x.id === id ? row : x))
        return [row, ...prev]
      })
      return id
    },
    [setFormalAppraisals],
  )

  const finalizeAppraisal = useCallback(
    (id: string) => {
      const now = new Date().toISOString()
      setFormalAppraisals((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: 'finalized', finalizedAt: now, updatedAt: now } : a,
        ),
      )
      appendHrAudit({
        actorId: formalAppraisals.find((a) => a.id === id)?.reviewerId ?? id,
        entityType: 'appraisal',
        entityId: id,
        action: 'finalize',
        summary: 'Appraisal finalized',
      })
      return true
    },
    [appendHrAudit, formalAppraisals, setFormalAppraisals],
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
      setEmployeeProfiles((prev) =>
        prev.map((p) =>
          p.userId === c.userId
            ? { ...p, employmentStatus: 'exiting', updatedAt: now, lastHrUpdateAt: now }
            : p,
        ),
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
      setOffboarding((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: now } : o)))
    },
    [setOffboarding],
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
    ],
  )
}
