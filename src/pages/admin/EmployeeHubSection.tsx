import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ClipboardList,
  FileText,
  Printer,
  Search,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { EmployeeProfilePrintView } from '@/components/hr/EmployeeProfilePrintView'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { TabBar } from '@/components/ui/TabBar'
import { Textarea } from '@/components/ui/Textarea'
import {
  appraisalBandLabel,
  DISCIPLINE_STEP_LABELS,
  DISCIPLINE_TRIGGER_LABELS,
  emptyEmployeeProfile,
} from '@/lib/hrPeopleOps'
import { notifySuccess, notifyError } from '@/lib/notify'
import { isAdmin, isHR, isLead } from '@/utils/helpers'
import { managedReportIds } from '@/utils/hrMetrics'
import {
  DUTY_STATUS_LABELS,
  DUTY_STATUS_OPTIONS,
  dutyStatusConfirmCopy,
  dutyStatusOf,
  effectiveDutyStatus,
} from '@/lib/dutyStatus'
import { DutyStatusBadge } from '@/components/shared/DutyStatusBadge'
import { useConfirm } from '@/context/useConfirm'
import type { DutyStatus, User } from '@/types'
import type {
  DisciplineCase,
  DisciplineStep,
  DisciplineTrigger,
  EmployeeProfile,
  EngagementType,
  EmploymentStatus,
} from '@/types/hr'

type HubTab =
  | 'directory'
  | 'discipline'
  | 'appraisals'
  | 'probation'
  | 'scorecards'
  | 'offboarding'
  | 'audit'

const TRIGGER_OPTIONS: DisciplineTrigger[] = [
  'missed_deadlines',
  'inaccurate_reporting',
  'poor_communication',
  'unauthorised_absence',
  'misconduct',
  'underperformance',
  'security',
  'systems_non_use',
  'leave_pattern',
]

export function EmployeeHubSection() {
  const { user } = useAuth()
  const { users } = useData()
  const hr = useHr()
  const [tab, setTab] = useState<HubTab>('directory')
  const [q, setQ] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [includeDisciplinePdf, setIncludeDisciplinePdf] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)

  if (!user || !isHR(user)) {
    return <p className="text-sm text-[var(--color-muted)]">HR or Admin access required.</p>
  }

  const profilesByUser = useMemo(() => {
    const map = new Map<string, EmployeeProfile>()
    for (const p of hr.employeeProfiles) map.set(p.userId, p)
    return map
  }, [hr.employeeProfiles])

  const rows = useMemo(() => {
    return users
      .filter((u) => u.active)
      .map((u) => {
        const p = profilesByUser.get(u.id) ?? {
          ...emptyEmployeeProfile(u.id),
          id: '',
          createdAt: '',
          updatedAt: '',
          profileCompleteness: 0,
        }
        return { user: u, profile: p }
      })
      .filter(({ user: u, profile: p }) => {
        if (p.archived) return false
        const hay = `${u.name} ${u.email} ${u.department} ${u.jobTitle} ${p.engagementType}`.toLowerCase()
        return !q || hay.includes(q.toLowerCase())
      })
      .sort((a, b) => a.user.name.localeCompare(b.user.name))
  }, [users, profilesByUser, q])

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const selectedProfile = selectedUserId
    ? hr.ensureEmployeeProfile(selectedUserId)
    : null

  const openDossier = (userId: string) => {
    hr.ensureEmployeeProfile(userId)
    setSelectedUserId(userId)
  }

  return (
    <div className="av-contain space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Employee information hub</h2>
          <p className="text-sm text-[var(--color-muted)]">
            HR/Admin system of record for profiles, PIP / suspension, discipline, appraisals, and
            offboarding.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge>{hr.getMetrics().pendingDiscipline} pending discipline</Badge>
          <Badge>{hr.getMetrics().activePips} active PIPs</Badge>
          <Badge>{hr.getMetrics().upcomingProbations} probation due</Badge>
        </div>
      </div>

      <TabBar
        tabs={[
          { id: 'directory', label: 'Directory' },
          { id: 'discipline', label: 'Discipline & PIP' },
          { id: 'appraisals', label: 'Appraisals' },
          { id: 'probation', label: 'Probation' },
          { id: 'scorecards', label: 'Lead scorecards' },
          { id: 'offboarding', label: 'Offboarding' },
          { id: 'audit', label: 'Audit' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as HubTab)}
        variant="pill"
      />

      {tab === 'directory' ? (
        <Card className="min-w-0 space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-0 w-full flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <Input
                className="pl-9"
                placeholder="Search people…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <ul className="space-y-3 lg:hidden">
            {rows.map(({ user: u, profile: p }) => (
              <li
                key={u.id}
                className="rounded-lg border border-[var(--color-line)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--color-ink)]">{u.name}</div>
                    <div className="truncate text-xs text-[var(--color-muted)]">{u.email}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted)]">
                      {u.jobTitle || u.role} · {p.engagementType} · {p.employmentStatus}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <DutyStatusBadge
                        viewer={user}
                        subject={u}
                        hasActivePip={hr.performanceImprovementPlans.some(
                          (pip) => pip.subjectUserId === u.id && !pip.outcome,
                        )}
                      />
                      <span className="text-xs text-[var(--color-muted)]">
                        {p.profileCompleteness}% complete
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => openDossier(u.id)}
                  >
                    Dossier
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden av-scroll-x lg:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-[var(--color-muted)]">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Engagement</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Duty</th>
                  <th className="py-2 pr-3 font-medium">Complete</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ user: u, profile: p }) => (
                  <tr key={u.id} className="border-b border-[var(--color-line)]/60">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-[var(--color-muted)]">{u.email}</div>
                    </td>
                    <td className="py-2 pr-3">{u.jobTitle || u.role}</td>
                    <td className="py-2 pr-3">{p.engagementType}</td>
                    <td className="py-2 pr-3">{p.employmentStatus}</td>
                    <td className="py-2 pr-3">
                      <DutyStatusBadge
                        viewer={user}
                        subject={u}
                        hasActivePip={hr.performanceImprovementPlans.some(
                          (pip) => pip.subjectUserId === u.id && !pip.outcome,
                        )}
                      />
                    </td>
                    <td className="py-2 pr-3">{p.profileCompleteness}%</td>
                    <td className="py-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => openDossier(u.id)}>
                        Open dossier
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'discipline' ? (
        <DisciplineQueue
          onOpenUser={openDossier}
          currentUserId={user.id}
          canTerminate={isAdmin(user) || isHR(user)}
        />
      ) : null}

      {tab === 'appraisals' ? <AppraisalsPanel currentUserId={user.id} onOpenUser={openDossier} /> : null}

      {tab === 'probation' ? (
        <ProbationPanel onOpenUser={openDossier} currentUserId={user.id} />
      ) : null}

      {tab === 'scorecards' ? <ScorecardsPanel /> : null}

      {tab === 'offboarding' ? (
        <OffboardingPanel currentUserId={user.id} onOpenUser={openDossier} />
      ) : null}

      {tab === 'audit' ? (
        <Card className="space-y-2 p-4">
          {hr.hrAuditLog.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No audit entries yet.</p>
          ) : (
            hr.hrAuditLog.slice(0, 80).map((e) => (
              <div key={e.id} className="border-b border-[var(--color-line)]/50 py-2 text-sm">
                <div className="font-medium">
                  {e.action} · {e.entityType}
                </div>
                <div className="text-[var(--color-muted)]">{e.summary}</div>
                <div className="text-xs text-[var(--color-muted)]">
                  {new Date(e.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </Card>
      ) : null}

      {selectedUser && selectedProfile ? (
        <DossierModal
          userId={selectedUser.id}
          onClose={() => setSelectedUserId(null)}
          onPrint={() => setPrintOpen(true)}
          includeDisciplinePdf={includeDisciplinePdf}
          setIncludeDisciplinePdf={setIncludeDisciplinePdf}
          actorId={user.id}
        />
      ) : null}

      {printOpen && selectedUser && selectedProfile ? (
        <Modal open title="Export employee PDF" onClose={() => setPrintOpen(false)} size="xl">
          <div className="no-print mb-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeDisciplinePdf}
                onChange={(e) => setIncludeDisciplinePdf(e.target.checked)}
              />
              Include discipline summary
            </label>
            <Button type="button" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
          <EmployeeProfilePrintView
            user={selectedUser}
            profile={selectedProfile}
            disciplineCases={hr.disciplineCases.filter((c) => c.subjectUserId === selectedUser.id)}
            pips={hr.performanceImprovementPlans.filter((p) => p.subjectUserId === selectedUser.id)}
            appraisals={hr.formalAppraisals.filter((a) => a.subjectUserId === selectedUser.id)}
            includeDiscipline={includeDisciplinePdf}
          />
        </Modal>
      ) : null}

      {isLead(user) && !isHR(user) ? null : <ManagerRecommendHint />}
    </div>
  )
}

function ManagerRecommendHint() {
  return null
}

function useDutyStatusActions() {
  const { user } = useAuth()
  const { users, updateUser } = useData()
  const hr = useHr()
  const confirm = useConfirm()

  const setDutyStatus = async (subject: User, next: DutyStatus) => {
    if (next === dutyStatusOf(subject)) return false
    if (user?.id === subject.id && next === 'suspended') {
      notifyError('You cannot suspend your own account while signed in.')
      return false
    }
    const copy = dutyStatusConfirmCopy(subject.name, next)
    const ok = await confirm({
      title: copy.title,
      message: copy.message,
      confirmLabel: copy.confirmLabel,
      destructive: copy.destructive,
    })
    if (!ok) return false
    updateUser(subject.id, { dutyStatus: next })
    notifySuccess(`${subject.name}: ${copy.confirmLabel}`)
    return true
  }

  const markOnPip = (subjectUserId: string) => {
    const subject = users.find((u) => u.id === subjectUserId)
    if (!subject) return
    if (dutyStatusOf(subject) === 'suspended' || dutyStatusOf(subject) === 'pip') return
    updateUser(subjectUserId, { dutyStatus: 'pip' })
  }

  const clearPipFlag = (subjectUserId: string, closingPipId: string) => {
    const subject = users.find((u) => u.id === subjectUserId)
    if (!subject || dutyStatusOf(subject) !== 'pip') return
    const otherActive = hr.performanceImprovementPlans.some(
      (p) => p.id !== closingPipId && p.subjectUserId === subjectUserId && !p.outcome,
    )
    if (!otherActive) updateUser(subjectUserId, { dutyStatus: 'none' })
  }

  return { setDutyStatus, markOnPip, clearPipFlag }
}

function DossierModal({
  userId,
  onClose,
  onPrint,
  includeDisciplinePdf,
  setIncludeDisciplinePdf,
  actorId,
}: {
  userId: string
  onClose: () => void
  onPrint: () => void
  includeDisciplinePdf: boolean
  setIncludeDisciplinePdf: (v: boolean) => void
  actorId: string
}) {
  const { users } = useData()
  const { user: viewer } = useAuth()
  const hr = useHr()
  const { setDutyStatus } = useDutyStatusActions()
  const u = users.find((x) => x.id === userId)
  const profile = hr.ensureEmployeeProfile(userId)
  const [draft, setDraft] = useState({ ...profile })

  useEffect(() => {
    setDraft({ ...profile })
  }, [profile.id, profile.updatedAt, profile.userId, profile.engagementType, profile.employmentStatus, profile.startDate, profile.probationEndDate, profile.confirmationDate, profile.payrollSetupComplete, profile.hrRequestsUpdate, profile.contractTermsSummary, profile.hrPrivateNotes])

  if (!u) return null

  const save = () => {
    hr.saveEmployeeProfileHr({ ...draft, userId })
    notifySuccess('Employee profile saved')
  }

  const hasActivePip = hr.performanceImprovementPlans.some(
    (p) => p.subjectUserId === userId && !p.outcome,
  )
  const shownDuty = effectiveDutyStatus(u, hasActivePip)
  const openCases = hr.disciplineCases.filter(
    (c) =>
      c.subjectUserId === userId &&
      (c.status === 'active' || c.status === 'pending_hr' || c.status === 'escalated'),
  )
  const latestOpen = openCases[0]

  return (
    <Modal
      open
      title={`Dossier — ${u.name}`}
      onClose={onClose}
      size="xl"
      closeOnBackdrop={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={save}>
            Save HR fields
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {shownDuty !== 'none' || latestOpen ? (
          <div
            className={
              shownDuty === 'suspended'
                ? 'rounded-lg border border-danger/40 bg-danger/10 p-3'
                : 'rounded-lg border border-warning/40 bg-warning/10 p-3'
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {shownDuty !== 'none'
                    ? DUTY_STATUS_LABELS[shownDuty]
                    : latestOpen
                      ? `${DISCIPLINE_STEP_LABELS[latestOpen.step]} · ${latestOpen.status}`
                      : 'Discipline on file'}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {shownDuty === 'suspended'
                    ? 'This person can sign in and read Updates and Resources only.'
                    : shownDuty === 'pip'
                      ? 'Formal PIP is visible to team leads, HR, and admin.'
                      : 'This case stays on the dossier until it is closed.'}
                </p>
              </div>
              <DutyStatusBadge viewer={viewer} subject={u} hasActivePip={hasActivePip} />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onPrint}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              hr.archiveEmployeeProfile(userId, true)
              notifySuccess('Profile archived')
              onClose()
            }}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </Button>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDisciplinePdf}
              onChange={(e) => setIncludeDisciplinePdf(e.target.checked)}
            />
            PDF includes discipline
          </label>
        </div>

        <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">PIP / suspension</p>
              <p className="text-xs text-[var(--color-muted)]">
                Visible to team leads, HR, and admin. Suspension lets them sign in and read Updates
                and Resources only.
              </p>
            </div>
            <DutyStatusBadge viewer={viewer} subject={u} hasActivePip={hasActivePip} />
          </div>
          <Select
            label="Duty status"
            value={shownDuty === 'pip' && dutyStatusOf(u) === 'none' ? 'pip' : dutyStatusOf(u)}
            onChange={(e) => void setDutyStatus(u, e.target.value as DutyStatus)}
            options={DUTY_STATUS_OPTIONS}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Engagement type"
            value={draft.engagementType}
            onChange={(e) =>
              setDraft((d) => ({ ...d, engagementType: e.target.value as EngagementType }))
            }
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'volunteer', label: 'Volunteer' },
              { value: 'contractor', label: 'Contractor' },
            ]}
          />
          <Select
            label="Employment status"
            value={draft.employmentStatus}
            onChange={(e) =>
              setDraft((d) => ({ ...d, employmentStatus: e.target.value as EmploymentStatus }))
            }
            options={[
              { value: 'active', label: 'Active' },
              { value: 'probation', label: 'Probation' },
              { value: 'leave', label: 'On leave' },
              { value: 'exiting', label: 'Exiting' },
              { value: 'terminated', label: 'Terminated' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
          <Input
            label="Start date"
            type="date"
            value={draft.startDate ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
          />
          <Input
            label="Probation end"
            type="date"
            value={draft.probationEndDate ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, probationEndDate: e.target.value }))}
          />
          <Input
            label="Confirmation date"
            type="date"
            value={draft.confirmationDate ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, confirmationDate: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm sm:mt-7">
            <input
              type="checkbox"
              checked={draft.payrollSetupComplete}
              onChange={(e) => setDraft((d) => ({ ...d, payrollSetupComplete: e.target.checked }))}
            />
            Payroll setup complete
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.hrRequestsUpdate}
              onChange={(e) => setDraft((d) => ({ ...d, hrRequestsUpdate: e.target.checked }))}
            />
            Request employee to update My Info
          </label>
        </div>
        <Textarea
          label="Contract / volunteer terms summary"
          value={draft.contractTermsSummary ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, contractTermsSummary: e.target.value }))}
          rows={2}
        />
        <Textarea
          label="HR private notes (not on default PDF)"
          value={draft.hrPrivateNotes ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, hrPrivateNotes: e.target.value }))}
          rows={3}
        />

        <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-soft)]/40 p-3 text-sm">
          <div className="mb-2 font-medium">Employee-submitted personal fields</div>
          <p>Phone: {profile.phone || '—'} · Personal email: {profile.personalEmail || '—'}</p>
          <p>
            Emergency: {profile.emergencyContact?.name || '—'} ({profile.emergencyContact?.phone || '—'})
          </p>
          <p>Completeness: {profile.profileCompleteness}%</p>
        </div>

        <PersonDisciplineBlock
          subjectUserId={userId}
          actorId={actorId}
          onBeforeActivate={() => hr.saveEmployeeProfileHr({ ...draft, userId })}
        />
      </div>
    </Modal>
  )
}

function PersonDisciplineBlock({
  subjectUserId,
  actorId,
  onBeforeActivate,
}: {
  subjectUserId: string
  actorId: string
  onBeforeActivate?: () => void
}) {
  const hr = useHr()
  const cases = hr.disciplineCases.filter((c) => c.subjectUserId === subjectUserId)
  const pips = hr.performanceImprovementPlans.filter((p) => p.subjectUserId === subjectUserId)

  return (
    <div className="space-y-2 rounded-lg border border-[var(--color-line)] p-3">
      <div className="flex items-center gap-2 font-medium">
        <ShieldAlert className="h-4 w-4" /> Discipline history
      </div>
      {cases.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No cases yet.</p>
      ) : (
        cases.map((c) => (
          <div key={c.id} className="rounded-md border border-[var(--color-line)]/70 p-2 text-sm">
            <div className="font-medium">
              {DISCIPLINE_STEP_LABELS[c.step]} · {c.status} · {c.severity}
            </div>
            {c.reason ? (
              <p className="mt-1 text-[var(--color-muted)]">{c.reason}</p>
            ) : null}
            {c.pipId ? (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {pips.find((p) => p.id === c.pipId)?.outcome
                  ? `PIP closed (${pips.find((p) => p.id === c.pipId)?.outcome})`
                  : 'Linked PIP is active'}
              </p>
            ) : null}
          </div>
        ))
      )}
      <NewDisciplineForm
        subjectUserId={subjectUserId}
        actorId={actorId}
        onBeforeActivate={onBeforeActivate}
      />
    </div>
  )
}

function NewDisciplineForm({
  subjectUserId,
  actorId,
  onBeforeActivate,
}: {
  subjectUserId: string
  actorId: string
  onBeforeActivate?: () => void
}) {
  const { users } = useData()
  const hr = useHr()
  const { markOnPip } = useDutyStatusActions()
  const subject = users.find((u) => u.id === subjectUserId)
  const [step, setStep] = useState<DisciplineStep>('coaching_verbal')
  const [severity, setSeverity] = useState<DisciplineCase['severity']>('medium')
  const [reason, setReason] = useState('')
  const [triggers, setTriggers] = useState<DisciplineTrigger[]>(['underperformance'])
  const [deliveryMode, setDeliveryMode] = useState<DisciplineCase['deliveryMode']>('meeting')

  const level =
    subject?.role === 'team_lead'
      ? 'team_lead'
      : subject?.role === 'assistant_lead'
        ? 'assistant_lead'
        : 'staff'

  const submit = (asRecommend: boolean) => {
    if (!reason.trim()) {
      notifyError('Add a reason before activating a discipline case.')
      return
    }
    onBeforeActivate?.()
    if (asRecommend) {
      const id = hr.recommendDisciplineCase({
        subjectUserId,
        step,
        severity,
        employeeLevel: level,
        triggers,
        reason: reason.trim(),
        evidence: [],
        deliveryMode,
        issuedById: actorId,
        recommendedById: actorId,
        acknowledgementRequired: true,
      })
      if (step === 'pip') {
        hr.createPipForCase(id)
        markOnPip(subjectUserId)
      }
      notifySuccess('Discipline case submitted for HR')
    } else {
      const id = hr.saveDisciplineCase({
        subjectUserId,
        step,
        severity,
        employeeLevel: level,
        triggers,
        reason: reason.trim(),
        evidence: [],
        status: 'active',
        deliveryMode,
        issuedById: actorId,
        approvedById: actorId,
        acknowledgementRequired: true,
        deliveredAt: new Date().toISOString(),
      })
      if (step === 'pip') {
        const pipId = hr.createPipForCase(id)
        if (!pipId) {
          notifyError('Case saved, but the PIP could not be created. Open Discipline & PIP and retry.')
        } else {
          markOnPip(subjectUserId)
        }
      }
      const approved = hr.approveDisciplineCase(id, actorId)
      if (!approved) {
        notifyError('Case saved, but approval did not complete. Check Discipline & PIP.')
      } else {
        notifySuccess(
          step === 'pip'
            ? 'PIP activated — it stays on this dossier and in Discipline & PIP'
            : 'Discipline case activated — it stays on this dossier',
        )
      }
    }
    setReason('')
  }

  return (
    <div className="mt-3 space-y-2 border-t border-[var(--color-line)] pt-3">
      <div className="text-sm font-medium">New case</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          label="Step"
          value={step}
          onChange={(e) => setStep(e.target.value as DisciplineStep)}
          options={Object.entries(DISCIPLINE_STEP_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as DisciplineCase['severity'])}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
          ]}
        />
        <Select
          label="Delivery mode"
          value={deliveryMode}
          onChange={(e) => setDeliveryMode(e.target.value as DisciplineCase['deliveryMode'])}
          options={[
            { value: 'portal_notice', label: 'Portal notice' },
            { value: 'meeting', label: 'Meeting' },
            { value: 'email_formal', label: 'Formal email' },
            { value: 'written_letter', label: 'Written letter' },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {TRIGGER_OPTIONS.map((t) => (
          <label key={t} className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={triggers.includes(t)}
              onChange={(e) =>
                setTriggers((prev) =>
                  e.target.checked ? [...prev, t] : prev.filter((x) => x !== t),
                )
              }
            />
            {DISCIPLINE_TRIGGER_LABELS[t]}
          </label>
        ))}
      </div>
      <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" disabled={!reason.trim()} onClick={() => submit(false)}>
          Activate (HR)
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!reason.trim()}
          onClick={() => submit(true)}
        >
          Save as pending recommendation
        </Button>
      </div>
    </div>
  )
}

function DisciplineQueue({
  onOpenUser,
  currentUserId,
  canTerminate,
}: {
  onOpenUser: (id: string) => void
  currentUserId: string
  canTerminate: boolean
}) {
  const hr = useHr()
  const { users } = useData()
  const { markOnPip, clearPipFlag } = useDutyStatusActions()
  const pending = hr.disciplineCases.filter((c) => c.status === 'pending_hr')
  const activePips = hr.performanceImprovementPlans.filter((p) => !p.outcome)

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-medium">Pending HR approval</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No pending recommendations.</p>
        ) : (
          pending.map((c) => {
            const subject = users.find((u) => u.id === c.subjectUserId)
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)]/50 py-2"
              >
                <div className="text-sm">
                  <div className="font-medium">
                    {subject?.name ?? c.subjectUserId} — {DISCIPLINE_STEP_LABELS[c.step]}
                  </div>
                  <div className="text-[var(--color-muted)]">{c.reason}</div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button type="button" size="sm" variant="secondary" onClick={() => onOpenUser(c.subjectUserId)}>
                    Dossier
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={c.step === 'termination_case' && !canTerminate}
                    onClick={() => {
                      hr.approveDisciplineCase(c.id, currentUserId)
                      if (c.step === 'pip' && !c.pipId) hr.createPipForCase(c.id)
                      if (c.step === 'pip') markOnPip(c.subjectUserId)
                      notifySuccess('Case approved')
                    }}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="font-medium">Active PIPs</h3>
        {activePips.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No active PIPs.</p>
        ) : (
          activePips.map((pip) => {
            const subject = users.find((u) => u.id === pip.subjectUserId)
            return (
              <div key={pip.id} className="space-y-2 border-b border-[var(--color-line)]/50 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{subject?.name}</div>
                    <div className="text-sm text-[var(--color-muted)]">
                      {pip.startDate} → {pip.endDate} ({pip.durationDays} days)
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={() => onOpenUser(pip.subjectUserId)}>
                    Dossier
                  </Button>
                </div>
                <ul className="text-sm">
                  {pip.goals.map((g) => (
                    <li key={g.id}>
                      • {g.description} — <em>{g.successMetric}</em>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  {pip.reviews.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span>Review {r.scheduledAt}</span>
                      {r.completedAt ? (
                        <Badge>
                          {r.rating} · done
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            hr.completePipReview(pip.id, r.id, {
                              rating: 'on_track',
                              notes: 'Review completed',
                              reviewerId: currentUserId,
                            })
                            notifySuccess('PIP review recorded')
                          }}
                        >
                          Mark on track
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['passed', 'extended', 'escalated', 'terminated_recommendation'] as const).map(
                    (outcome) => (
                      <Button
                        key={outcome}
                        type="button"
                        size="sm"
                        variant={outcome === 'terminated_recommendation' ? 'danger' : 'secondary'}
                        disabled={outcome === 'terminated_recommendation' && !canTerminate}
                        onClick={() => {
                          hr.closePip(pip.id, outcome, currentUserId)
                          clearPipFlag(pip.subjectUserId, pip.id)
                          notifySuccess(`PIP closed: ${outcome}`)
                        }}
                      >
                        Close: {outcome}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            )
          })
        )}
      </Card>

      <LeadRecommendPanel currentUserId={currentUserId} />
    </div>
  )
}

function LeadRecommendPanel({ currentUserId }: { currentUserId: string }) {
  const { user } = useAuth()
  const { users, teams, departments } = useData()
  const hr = useHr()
  if (!user || (!isLead(user) && !isHR(user))) return null
  const reports = managedReportIds(user, users, teams, departments)
  const reportUsers = users.filter((u) => reports.has(u.id))
  const [subjectUserId, setSubjectUserId] = useState(reportUsers[0]?.id ?? '')
  const [reason, setReason] = useState('')

  if (reportUsers.length === 0) return null

  return (
    <Card className="space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-medium">
        <UserPlus className="h-4 w-4" /> Recommend warning / PIP (managed reports)
      </h3>
      <Select
        label="Team member"
        value={subjectUserId}
        onChange={(e) => setSubjectUserId(e.target.value)}
        options={reportUsers.map((u) => ({ value: u.id, label: u.name }))}
      />
      <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      <Button
        type="button"
        disabled={!subjectUserId || !reason.trim()}
        onClick={() => {
          hr.recommendDisciplineCase({
            subjectUserId,
            step: 'written_warning',
            severity: 'medium',
            employeeLevel: 'staff',
            triggers: ['underperformance'],
            reason,
            evidence: [],
            deliveryMode: 'meeting',
            issuedById: currentUserId,
            recommendedById: currentUserId,
            acknowledgementRequired: true,
          })
          notifySuccess('Recommendation sent to HR')
          setReason('')
        }}
      >
        Recommend written warning
      </Button>
    </Card>
  )
}

function AppraisalsPanel({
  currentUserId,
  onOpenUser,
}: {
  currentUserId: string
  onOpenUser: (id: string) => void
}) {
  const { users } = useData()
  const hr = useHr()
  const [subjectUserId, setSubjectUserId] = useState(users.find((u) => u.active)?.id ?? '')
  const [periodLabel, setPeriodLabel] = useState('2026-Q3')
  const [outputScore, setOutputScore] = useState(70)
  const [softSkillsScore, setSoftSkillsScore] = useState(70)
  const activePip = hr.performanceImprovementPlans.some(
    (p) => p.subjectUserId === subjectUserId && !p.outcome,
  )

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-medium">New appraisal (60% output / 40% soft skills)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Employee"
            value={subjectUserId}
            onChange={(e) => setSubjectUserId(e.target.value)}
            options={users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))}
          />
          <Input
            label="Period label"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
          />
          <Input
            label="Output score (0–100)"
            type="number"
            value={outputScore}
            onChange={(e) => setOutputScore(Number(e.target.value))}
          />
          <Input
            label="Soft skills score (0–100)"
            type="number"
            value={softSkillsScore}
            onChange={(e) => setSoftSkillsScore(Number(e.target.value))}
          />
        </div>
        <Button
          type="button"
          onClick={() => {
            const id = hr.saveFormalAppraisal({
              subjectUserId,
              reviewerId: currentUserId,
              periodLabel,
              cadence: activePip ? 'monthly' : 'quarterly',
              status: 'submitted',
              scores: { outputScore, softSkillsScore },
              evidenceLinks: [],
              onActivePip: activePip,
            })
            hr.finalizeAppraisal(id)
            notifySuccess('Appraisal saved and finalized')
          }}
        >
          Save & finalize
        </Button>
      </Card>
      <Card className="space-y-2 p-4">
        {hr.formalAppraisals.map((a) => {
          const subject = users.find((u) => u.id === a.subjectUserId)
          return (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)]/40 py-2 text-sm">
              <div>
                <div className="font-medium">
                  {subject?.name} — {a.periodLabel}
                </div>
                <div className="text-[var(--color-muted)]">
                  Overall {a.overallScore}% · {appraisalBandLabel(a.band)} · {a.cadence}
                </div>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={() => onOpenUser(a.subjectUserId)}>
                Dossier
              </Button>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

function ProbationPanel({
  onOpenUser,
  currentUserId,
}: {
  onOpenUser: (id: string) => void
  currentUserId: string
}) {
  const { users } = useData()
  const hr = useHr()
  const upcoming = hr.employeeProfiles.filter((p) => {
    if (!p.probationEndDate || p.archived) return false
    const end = new Date(p.probationEndDate).getTime()
    return end >= Date.now() - 7 * 86400000
  })

  return (
    <Card className="space-y-3 p-4">
      <h3 className="font-medium">Probation & confirmation</h3>
      {upcoming.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No upcoming probation ends.</p>
      ) : (
        upcoming.map((p) => {
          const u = users.find((x) => x.id === p.userId)
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
              <div>
                <div className="font-medium">{u?.name}</div>
                <div className="text-[var(--color-muted)]">Ends {p.probationEndDate}</div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => onOpenUser(p.userId)}>
                  Dossier
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    hr.saveEmployeeProfileHr({
                      ...p,
                      employmentStatus: 'active',
                      confirmationDate: new Date().toISOString().slice(0, 10),
                      confirmedAt: new Date().toISOString(),
                      confirmedById: currentUserId,
                    })
                    notifySuccess('Employee confirmed')
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          )
        })
      )}
    </Card>
  )
}

function ScorecardsPanel() {
  const { users, teams } = useData()
  const hr = useHr()
  const leads = users.filter(
    (u) =>
      u.active &&
      (u.role === 'team_lead' ||
        teams.some((t) => t.leadUserId === u.id || t.asstLeadUserId === u.id)),
  )

  return (
    <Card className="space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-medium">
        <Users className="h-4 w-4" /> Team Lead people scorecards
      </h3>
      {leads.map((lead) => {
        const sc = hr.getManagerPeopleScorecard(lead.id)
        return (
          <div key={lead.id} className="border-b border-[var(--color-line)]/50 py-3 text-sm">
            <div className="font-medium">{lead.name}</div>
            <div className="mt-1 grid gap-1 sm:grid-cols-4">
              <span>Delivery {sc.deliveryConsistency}%</span>
              <span>KPI {sc.kpiCompletion}%</span>
              <span>Comm {sc.communicationDiscipline}%</span>
              <span>Escalation {sc.escalationQuality}%</span>
            </div>
          </div>
        )
      })}
    </Card>
  )
}

function OffboardingPanel({
  currentUserId,
  onOpenUser,
}: {
  currentUserId: string
  onOpenUser: (id: string) => void
}) {
  const { users } = useData()
  const hr = useHr()
  const [userId, setUserId] = useState(users.find((u) => u.active)?.id ?? '')
  const [reason, setReason] = useState('')
  const profile = hr.employeeProfiles.find((p) => p.userId === userId)

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="flex items-center gap-2 font-medium">
          <ClipboardList className="h-4 w-4" /> Start offboarding
        </h3>
        <Select
          label="Person"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          options={users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))}
        />
        <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        <Button
          type="button"
          disabled={!userId || !reason.trim()}
          onClick={() => {
            hr.createOffboardingChecklist({
              userId,
              reason,
              createdById: currentUserId,
              volunteerBridgeNotice: profile?.engagementType === 'volunteer',
              lastDay: new Date().toISOString().slice(0, 10),
            })
            notifySuccess('Offboarding checklist created')
            setReason('')
          }}
        >
          Create checklist
        </Button>
      </Card>
      <Card className="space-y-3 p-4">
        {hr.offboardingChecklists.map((o) => {
          const u = users.find((x) => x.id === o.userId)
          return (
            <div key={o.id} className="border-b border-[var(--color-line)]/50 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {u?.name} — {o.status}
                  </div>
                  <div className="text-sm text-[var(--color-muted)]">{o.reason}</div>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => onOpenUser(o.userId)}>
                  Dossier
                </Button>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {o.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.status === 'done'}
                      onChange={(e) => {
                        const items = o.items.map((it) =>
                          it.id === item.id
                            ? {
                                ...it,
                                status: e.target.checked ? ('done' as const) : ('pending' as const),
                                completedAt: e.target.checked ? new Date().toISOString() : undefined,
                                completedById: e.target.checked ? currentUserId : undefined,
                              }
                            : it,
                        )
                        const done = items.every((it) => it.status === 'done' || it.status === 'skipped')
                        hr.updateOffboardingChecklist(o.id, {
                          items,
                          status: done ? 'completed' : 'open',
                        })
                      }}
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
