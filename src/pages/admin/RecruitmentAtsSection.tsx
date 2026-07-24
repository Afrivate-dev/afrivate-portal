import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  Filter,
  Github,
  Link2,
  Mail,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Upload,
  UserCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useHr } from '@/context/HrContext'
import { loadAtsCriteria, saveAtsCriteria } from '@/lib/atsCriteriaStore'
import {
  fetchGmailApplications,
  HR_MAILBOX,
  isGmailAtsConfigured,
} from '@/lib/gmailAtsSync'
import { notifyError, notifySuccess } from '@/lib/notify'
import type { CandidateSource, CandidateStage, JobCandidate } from '@/types/hr'
import {
  defaultCriteriaForProfile,
  detectAtsRoleProfile,
  detectSourceFromEmail,
  isViableCandidate,
  recommendationTone,
  screenApplicationText,
  splitApplicationBatch,
  type AtsCriteriaProfile,
  type AtsCriterion,
  type AtsRoleProfile,
  type AtsSource,
} from '@/utils/atsScoring'
import { fmtDate } from '@/utils/helpers'

const SOURCE_OPTIONS: { value: AtsSource; label: string }[] = [
  { value: 'gmail', label: 'Gmail' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'bebee', label: 'BeBee' },
  { value: 'jobberman', label: 'Jobberman' },
  { value: 'manual', label: 'Manual' },
  { value: 'other', label: 'Other' },
]

type FilterMode = 'all' | 'viable' | 'strong' | 'weak' | 'reject'

function newCriterionId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function RecruitmentAtsSection() {
  const {
    jobRequisitions,
    jobCandidates,
    addJobRequisition,
    addJobCandidate,
    updateJobCandidate,
  } = useHr()

  const openJobs = useMemo(
    () => jobRequisitions.filter((j) => j.status === 'open'),
    [jobRequisitions],
  )

  const [selectedJobId, setSelectedJobId] = useState(
    () => openJobs.find((j) => /front/i.test(j.title))?.id ?? openJobs[0]?.id ?? '',
  )
  const [source, setSource] = useState<AtsSource>('gmail')
  const [paste, setPaste] = useState('')
  const [filter, setFilter] = useState<FilterMode>('viable')
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [savingCriteria, setSavingCriteria] = useState(false)
  const [criteriaOpen, setCriteriaOpen] = useState(true)
  const [criteria, setCriteria] = useState<AtsCriteriaProfile>(() => defaultCriteriaForProfile('frontend'))
  const [criteriaDirty, setCriteriaDirty] = useState(false)
  const [newRoleTitle, setNewRoleTitle] = useState('Front-End Developer')
  const [newRoleDept, setNewRoleDept] = useState('Technology & Product')

  useEffect(() => {
    if (selectedJobId && openJobs.some((j) => j.id === selectedJobId)) return
    const preferred =
      openJobs.find((j) => /front/i.test(j.title)) ??
      openJobs.find((j) => j.title === newRoleTitle.trim()) ??
      openJobs[0]
    setSelectedJobId(preferred?.id ?? '')
  }, [openJobs, selectedJobId, newRoleTitle])

  const selectedJob = jobRequisitions.find((j) => j.id === selectedJobId)
  const roleProfile = detectAtsRoleProfile(selectedJob?.title ?? newRoleTitle)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const loaded = await loadAtsCriteria(roleProfile === 'general' ? 'frontend' : roleProfile)
      if (cancelled) return
      setCriteria(loaded)
      setCriteriaDirty(false)
    })()
    return () => {
      cancelled = true
    }
  }, [roleProfile])

  const candidatesForRole = useMemo(() => {
    const rows = jobCandidates.filter((c) => c.requisitionId === selectedJobId)
    return [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }, [jobCandidates, selectedJobId])

  const visible = useMemo(() => {
    return candidatesForRole.filter((c) => {
      if (filter === 'all') return true
      if (filter === 'viable') {
        if (c.recommendation === 'strong' || c.recommendation === 'viable') return true
        return (c.score ?? 0) >= criteria.viableMin
      }
      return c.recommendation === filter
    })
  }, [candidatesForRole, filter, criteria.viableMin])

  const stats = useMemo(() => {
    const total = candidatesForRole.length
    const strong = candidatesForRole.filter((c) => c.recommendation === 'strong').length
    const viable = candidatesForRole.filter((c) => isViableCandidate(c) || (c.score ?? 0) >= criteria.viableMin).length
    const reject = candidatesForRole.filter((c) => c.recommendation === 'reject').length
    return { total, strong, viable, reject }
  }, [candidatesForRole, criteria.viableMin])

  const patchCriteria = (next: AtsCriteriaProfile) => {
    setCriteria(next)
    setCriteriaDirty(true)
  }

  const persistCriteria = async () => {
    setSavingCriteria(true)
    const result = await saveAtsCriteria(criteria)
    setSavingCriteria(false)
    if (!result.ok) {
      notifyError(result.error ?? 'Could not save criteria')
      return
    }
    setCriteriaDirty(false)
    notifySuccess('Ranking criteria saved.')
  }

  const resetCriteria = () => {
    const profile = roleProfile === 'general' ? 'frontend' : roleProfile
    patchCriteria(defaultCriteriaForProfile(profile))
  }

  const importScreened = (
    items: Array<{
      text: string
      source: AtsSource
      externalId?: string
      appliedAt?: string
    }>,
  ) => {
    if (!selectedJobId) {
      notifyError('Create or select a job requisition first.')
      return { added: 0, skipped: 0 }
    }

    let added = 0
    let skipped = 0
    const existing = jobCandidates.filter((c) => c.requisitionId === selectedJobId)
    const scoringProfile = roleProfile === 'general' ? 'frontend' : roleProfile

    for (const item of items) {
      const result = screenApplicationText(item.text, scoringProfile as AtsRoleProfile, criteria)
      const emailKey = result.email?.toLowerCase()
      const duplicate = existing.some(
        (c) =>
          (item.externalId && c.externalId === item.externalId) ||
          (emailKey && c.email?.toLowerCase() === emailKey) ||
          (!emailKey && !item.externalId && c.name.toLowerCase() === result.name.toLowerCase()),
      )
      if (duplicate) {
        skipped += 1
        continue
      }

      addJobCandidate({
        requisitionId: selectedJobId,
        name: result.name,
        email: result.email,
        stage:
          result.recommendation === 'reject'
            ? 'rejected'
            : result.recommendation === 'weak'
              ? 'applied'
              : 'screen',
        source: item.source as CandidateSource,
        githubUrl: result.githubUrl,
        portfolioUrl: result.portfolioUrl,
        coverLetter: result.coverLetter,
        score: result.score,
        recommendation: result.recommendation,
        scoreBreakdown: result.breakdown as Record<string, number>,
        resumeSummary: result.summary,
        notes: item.text.slice(0, 4000),
        externalId: item.externalId,
        appliedAt: item.appliedAt ?? new Date().toISOString(),
      })
      added += 1
    }

    return { added, skipped }
  }

  const screenAndSave = () => {
    if (!paste.trim()) {
      notifyError('Paste one or more applications from Gmail or Indeed.')
      return
    }
    setBusy(true)
    const chunks = splitApplicationBatch(paste)
    const { added, skipped } = importScreened(
      chunks.map((text) => ({ text, source })),
    )
    setBusy(false)
    setPaste('')
    if (added) notifySuccess(`Screened ${added} application${added === 1 ? '' : 's'}.`)
    if (skipped) notifyError(`Skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}.`)
    if (!added && !skipped) notifyError('No usable applications found in the paste.')
  }

  const syncFromGmail = async () => {
    if (!selectedJobId) {
      notifyError('Create or select a job requisition first.')
      return
    }
    if (!isGmailAtsConfigured()) {
      notifyError('Add VITE_GOOGLE_CLIENT_ID and enable Gmail API for afrivatehr@gmail.com.')
      return
    }

    setSyncing(true)
    try {
      const messages = await fetchGmailApplications()
      const { added, skipped } = importScreened(
        messages.map((m) => {
          const parsed = m.date ? Date.parse(m.date) : NaN
          return {
            text: m.bodyText,
            source: detectSourceFromEmail(m.from, m.subject),
            externalId: `gmail:${m.id}`,
            appliedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined,
          }
        }),
      )
      if (added) notifySuccess(`Synced ${added} new application${added === 1 ? '' : 's'} from ${HR_MAILBOX}.`)
      else if (skipped) notifySuccess(`Already up to date (${skipped} previously imported).`)
      else notifyError('No matching application emails found in the last 45 days.')
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Gmail sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const rescoreVisible = () => {
    if (!selectedJobId) return
    let n = 0
    for (const c of candidatesForRole) {
      if (!c.notes?.trim()) continue
      const result = screenApplicationText(
        c.notes,
        roleProfile === 'general' ? 'frontend' : roleProfile,
        criteria,
      )
      updateJobCandidate(c.id, {
        score: result.score,
        recommendation: result.recommendation,
        scoreBreakdown: result.breakdown as Record<string, number>,
        resumeSummary: result.summary,
        githubUrl: result.githubUrl ?? c.githubUrl,
        portfolioUrl: result.portfolioUrl ?? c.portfolioUrl,
        coverLetter: result.coverLetter,
        stage:
          result.recommendation === 'reject'
            ? 'rejected'
            : c.stage === 'rejected'
              ? 'screen'
              : c.stage,
      })
      n += 1
    }
    notifySuccess(n ? `Re-scored ${n} candidate${n === 1 ? '' : 's'} with current criteria.` : 'No stored application text to re-score.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">Recruitment ATS</h2>
          <p className="mt-1 text-sm text-muted">
            Sync applications from {HR_MAILBOX}, score them with editable ranking criteria, and shortlist viable candidates.
          </p>
        </div>
        <Badge tone="brand">{criteria.label} · {roleProfile}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card padding="md"><p className="text-xs text-muted">Total screened</p><p className="mt-1 text-2xl font-semibold text-fg">{stats.total}</p></Card>
        <Card padding="md"><p className="text-xs text-muted">Viable+</p><p className="mt-1 text-2xl font-semibold text-accent">{stats.viable}</p></Card>
        <Card padding="md"><p className="text-xs text-muted">Strong</p><p className="mt-1 text-2xl font-semibold text-fg">{stats.strong}</p></Card>
        <Card padding="md"><p className="text-xs text-muted">Reject</p><p className="mt-1 text-2xl font-semibold text-fg">{stats.reject}</p></Card>
      </div>

      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">Ranking criteria</h3>
            {criteriaDirty ? <Badge tone="warning">Unsaved</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCriteriaOpen((o) => !o)}>
              {criteriaOpen ? 'Hide' : 'Show'}
            </Button>
            <Button variant="secondary" size="sm" onClick={resetCriteria}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset defaults
            </Button>
            <Button size="sm" loading={savingCriteria} onClick={() => void persistCriteria()} disabled={!criteriaDirty}>
              <Save className="h-3.5 w-3.5" />
              Save criteria
            </Button>
          </div>
        </div>

        {criteriaOpen ? (
          <CriteriaEditor
            profile={criteria}
            onChange={patchCriteria}
            onRescore={rescoreVisible}
          />
        ) : (
          <p className="text-xs text-muted">
            Strong ≥ {criteria.strongMin} · Viable ≥ {criteria.viableMin} · Reject &lt; {criteria.rejectBelow} ·{' '}
            {criteria.criteria.filter((c) => c.enabled !== false).length} active signals
          </p>
        )}
      </Card>

      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Import applications</h3>
        </div>

        {openJobs.length === 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label="Create role title" value={newRoleTitle} onChange={(e) => setNewRoleTitle(e.target.value)} />
            <Input label="Department" value={newRoleDept} onChange={(e) => setNewRoleDept(e.target.value)} />
            <Button
              className="sm:col-span-2"
              onClick={() => {
                addJobRequisition({
                  title: newRoleTitle.trim(),
                  department: newRoleDept.trim(),
                  status: 'open',
                })
                notifySuccess('Requisition created. It will appear in the role list.')
              }}
            >
              Create requisition
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Role"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              options={[
                { value: '', label: 'Select role…' },
                ...openJobs.map((j) => ({ value: j.id, label: `${j.title} (${j.department})` })),
              ]}
            />
            <Select
              label="Paste source (manual import)"
              value={source}
              onChange={(e) => setSource(e.target.value as AtsSource)}
              options={SOURCE_OPTIONS}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void syncFromGmail()}
            loading={syncing}
            disabled={!selectedJobId}
          >
            <Mail className="h-4 w-4" />
            Sync from {HR_MAILBOX}
          </Button>
          <p className="self-center text-xs text-muted">
            Sign in as {HR_MAILBOX} when Google asks. Imports application subjects + Indeed/LinkedIn forwards, then ranks with your criteria.
          </p>
        </div>

        <Textarea
          label="Or paste applications"
          hint="Paste one application, or several separated by a line with --- ."
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={8}
          placeholder={`Example:\nFrom: Jane Doe <jane@email.com>\nSubject: APPLICATION FOR FRONT-END DEVELOPER — Jane Doe\n\nCover letter...\nReact, TypeScript, GitHub: https://github.com/jane\nPortfolio: https://jane.vercel.app`}
        />

        <Button
          variant="secondary"
          onClick={screenAndSave}
          loading={busy}
          disabled={!paste.trim() || !selectedJobId}
        >
          <Upload className="h-4 w-4" />
          Score & save pasted
        </Button>
      </Card>

      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">Ranked candidates</h3>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterMode)}
            >
              <option value="viable">Viable & strong</option>
              <option value="strong">Strong only</option>
              <option value="all">All screened</option>
              <option value="weak">Weak</option>
              <option value="reject">Reject</option>
            </select>
          </div>
        </div>

        {!selectedJobId ? (
          <EmptyState icon={Briefcase} title="Select a role" description="Choose a requisition to view ranked applicants." />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No candidates in this view"
            description="Sync Gmail or paste applications above, or switch the filter."
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((c) => (
              <CandidateRow
                key={c.id}
                candidate={c}
                criteria={criteria}
                onUpdate={updateJobCandidate}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function CriteriaEditor({
  profile,
  onChange,
  onRescore,
}: {
  profile: AtsCriteriaProfile
  onChange: (next: AtsCriteriaProfile) => void
  onRescore: () => void
}) {
  const updateCriterion = (id: string, patch: Partial<AtsCriterion>) => {
    onChange({
      ...profile,
      criteria: profile.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }

  const removeCriterion = (id: string) => {
    onChange({
      ...profile,
      criteria: profile.criteria.filter((c) => c.id !== id),
    })
  }

  const addCriterion = () => {
    onChange({
      ...profile,
      criteria: [
        ...profile.criteria,
        {
          id: newCriterionId(),
          label: 'New criterion',
          kind: 'keywords',
          weight: 8,
          keywords: [],
          enabled: true,
        },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Strong minimum"
          type="number"
          value={String(profile.strongMin)}
          onChange={(e) => onChange({ ...profile, strongMin: Number(e.target.value) || 0 })}
        />
        <Input
          label="Viable minimum"
          type="number"
          value={String(profile.viableMin)}
          onChange={(e) => onChange({ ...profile, viableMin: Number(e.target.value) || 0 })}
        />
        <Input
          label="Reject below"
          type="number"
          value={String(profile.rejectBelow)}
          onChange={(e) => onChange({ ...profile, rejectBelow: Number(e.target.value) || 0 })}
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">On</th>
              <th className="px-3 py-2 font-medium">Criterion</th>
              <th className="px-3 py-2 font-medium">Weight</th>
              <th className="px-3 py-2 font-medium">Must-have</th>
              <th className="px-3 py-2 font-medium">Keywords</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {profile.criteria.map((c) => (
              <tr key={c.id} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={c.enabled !== false}
                    onChange={(e) => updateCriterion(c.id, { enabled: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full min-w-[9rem] rounded border border-border bg-surface px-2 py-1"
                    value={c.label}
                    onChange={(e) => updateCriterion(c.id, { label: e.target.value })}
                  />
                  <p className="mt-1 text-[11px] text-muted">{c.kind}</p>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="w-16 rounded border border-border bg-surface px-2 py-1"
                    value={c.weight}
                    onChange={(e) => updateCriterion(c.id, { weight: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!c.mustHave}
                    onChange={(e) => updateCriterion(c.id, { mustHave: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-2">
                  {c.kind === 'keywords' ? (
                    <input
                      className="w-full min-w-[12rem] rounded border border-border bg-surface px-2 py-1"
                      value={(c.keywords ?? []).join(', ')}
                      onChange={(e) =>
                        updateCriterion(c.id, {
                          keywords: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="react, next.js"
                    />
                  ) : c.kind === 'min_length' ? (
                    <input
                      type="number"
                      className="w-24 rounded border border-border bg-surface px-2 py-1"
                      value={c.minLength ?? 180}
                      onChange={(e) => updateCriterion(c.id, { minLength: Number(e.target.value) || 0 })}
                    />
                  ) : (
                    <span className="text-xs text-muted">Auto-detected from application text</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-danger"
                    onClick={() => removeCriterion(c.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={addCriterion}>
          Add criterion
        </Button>
        <Button variant="ghost" size="sm" onClick={onRescore}>
          Re-score existing with these criteria
        </Button>
      </div>
    </div>
  )
}

function CandidateRow({
  candidate,
  criteria,
  onUpdate,
}: {
  candidate: JobCandidate
  criteria: AtsCriteriaProfile
  onUpdate: (id: string, patch: Partial<JobCandidate>) => void
}) {
  const breakdownEntries = Object.entries(candidate.scoreBreakdown ?? {}).filter(
    ([key, pts]) => key !== 'red_flags' && pts > 0,
  )
  const labelFor = (id: string) => criteria.criteria.find((c) => c.id === id)?.label ?? id

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-fg">{candidate.name}</p>
            <Badge tone={recommendationTone(candidate.recommendation)}>
              {candidate.recommendation ?? 'unscored'}
            </Badge>
            <Badge tone="muted">{candidate.score ?? 0}/100</Badge>
            {candidate.source ? <Badge tone="muted">{candidate.source}</Badge> : null}
          </div>
          {candidate.email ? <p className="mt-1 text-sm text-muted">{candidate.email}</p> : null}
          {candidate.resumeSummary ? (
            <p className="mt-2 text-sm text-fg">{candidate.resumeSummary}</p>
          ) : null}
          {breakdownEntries.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {breakdownEntries.map(([id, pts]) => (
                <Badge key={id} tone="muted">
                  {labelFor(id)} +{pts}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {candidate.githubUrl ? (
              <a className="inline-flex items-center gap-1 text-accent hover:underline" href={candidate.githubUrl} target="_blank" rel="noreferrer">
                <Github className="h-3.5 w-3.5" /> GitHub
              </a>
            ) : null}
            {candidate.portfolioUrl ? (
              <a className="inline-flex items-center gap-1 text-accent hover:underline" href={candidate.portfolioUrl} target="_blank" rel="noreferrer">
                <Link2 className="h-3.5 w-3.5" /> Portfolio
              </a>
            ) : null}
            {candidate.coverLetter ? <span className="text-muted">Cover letter detected</span> : <span className="text-muted">No cover letter signals</span>}
            {candidate.appliedAt ? <span className="text-muted">Applied {fmtDate(candidate.appliedAt)}</span> : null}
          </div>
        </div>
        <select
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={candidate.stage}
          onChange={(e) => onUpdate(candidate.id, { stage: e.target.value as CandidateStage })}
        >
          <option value="applied">Applied</option>
          <option value="screen">Screen</option>
          <option value="interview">Interview</option>
          <option value="offer">Offer</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </li>
  )
}
