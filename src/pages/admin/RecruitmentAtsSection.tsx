import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  ExternalLink,
  Filter,
  Github,
  Link2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trophy,
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
  GMAIL_ATS_LOOKBACK_DAYS,
  gmailThreadUrl,
  HR_MAILBOX,
  isGmailAtsConfigured,
  isGmailAtsReady,
  preloadGmailAts,
  requestGmailAccessTokenFromGesture,
} from '@/lib/gmailAtsSync'
import { notifyError, notifySuccess } from '@/lib/notify'
import type { CandidateSource, CandidateStage, JobCandidate } from '@/types/hr'
import {
  ATS_STANDARD_ROLES,
  defaultCriteriaForProfile,
  detectAtsRoleFromApplication,
  detectAtsRoleProfile,
  detectSourceFromEmail,
  explainCandidateRanking,
  isViableCandidate,
  labelForAtsRoleProfile,
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

type FilterMode = 'top10' | 'all' | 'viable' | 'strong' | 'weak' | 'reject'
type RoleTab = Exclude<AtsRoleProfile, 'general'> | 'general'

const UNASSIGNED_ROLE = {
  profile: 'general' as const,
  title: 'Unassigned / Other',
  department: 'Recruitment',
}

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

  const [selectedRole, setSelectedRole] = useState<RoleTab>('frontend')
  const [source, setSource] = useState<AtsSource>('gmail')
  const [paste, setPaste] = useState('')
  const [filter, setFilter] = useState<FilterMode>('top10')
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncLabel, setSyncLabel] = useState('')
  const [savingCriteria, setSavingCriteria] = useState(false)
  const [criteriaOpen, setCriteriaOpen] = useState(true)
  const [criteria, setCriteria] = useState<AtsCriteriaProfile>(() => defaultCriteriaForProfile('frontend'))
  const [criteriaDirty, setCriteriaDirty] = useState(false)

  const findOpenJobForProfile = (profile: AtsRoleProfile) => {
    if (profile === 'general') {
      return (
        openJobs.find((j) => /unassigned|other/i.test(j.title)) ??
        openJobs.find((j) => detectAtsRoleProfile(j.title) === 'general')
      )
    }
    const standard = ATS_STANDARD_ROLES.find((r) => r.profile === profile)
    return (
      openJobs.find((j) => detectAtsRoleProfile(j.title) === profile) ??
      openJobs.find((j) => j.title === standard?.title)
    )
  }

  const ensureJobForProfile = (profile: AtsRoleProfile): string => {
    const existing = findOpenJobForProfile(profile)
    if (existing) return existing.id
    if (profile === 'general') {
      return addJobRequisition({
        title: UNASSIGNED_ROLE.title,
        department: UNASSIGNED_ROLE.department,
        status: 'open',
      })
    }
    const def = ATS_STANDARD_ROLES.find((r) => r.profile === profile)!
    return addJobRequisition({
      title: def.title,
      department: def.department,
      status: 'open',
    })
  }

  const ensureStandardRoles = () => {
    for (const role of ATS_STANDARD_ROLES) {
      ensureJobForProfile(role.profile)
    }
  }

  const roleCounts = useMemo(() => {
    const counts: Record<RoleTab, number> = { frontend: 0, backend: 0, designer: 0, general: 0 }
    const jobs = jobRequisitions.filter((j) => j.status === 'open')
    const jobFor = (profile: RoleTab) => {
      if (profile === 'general') {
        return (
          jobs.find((j) => /unassigned|other/i.test(j.title)) ??
          jobs.find((j) => detectAtsRoleProfile(j.title) === 'general')
        )
      }
      const standard = ATS_STANDARD_ROLES.find((r) => r.profile === profile)
      return (
        jobs.find((j) => detectAtsRoleProfile(j.title) === profile) ??
        jobs.find((j) => j.title === standard?.title)
      )
    }
    for (const role of ['frontend', 'backend', 'designer', 'general'] as const) {
      const job = jobFor(role)
      if (!job) continue
      counts[role] = jobCandidates.filter((c) => c.requisitionId === job.id).length
    }
    return counts
  }, [jobCandidates, jobRequisitions])

  const resolvedJobId = useMemo(() => {
    const jobs = jobRequisitions.filter((j) => j.status === 'open')
    if (selectedRole === 'general') {
      return (
        jobs.find((j) => /unassigned|other/i.test(j.title)) ??
        jobs.find((j) => detectAtsRoleProfile(j.title) === 'general')
      )?.id ?? ''
    }
    const standard = ATS_STANDARD_ROLES.find((r) => r.profile === selectedRole)
    return (
      jobs.find((j) => detectAtsRoleProfile(j.title) === selectedRole) ??
      jobs.find((j) => j.title === standard?.title)
    )?.id ?? ''
  }, [jobRequisitions, selectedRole])

  const selectedJob = jobRequisitions.find((j) => j.id === resolvedJobId)
  const roleProfile: Exclude<AtsRoleProfile, 'general'> =
    selectedRole === 'general' ? 'frontend' : selectedRole

  useEffect(() => {
    ensureStandardRoles()
    // Create missing standard role sections when ATS opens / jobs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openJobs.length])

  useEffect(() => {
    void preloadGmailAts().catch(() => {
      // Non-fatal — Sync will ask the user to retry if GSI is still loading
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const loaded = await loadAtsCriteria(roleProfile)
      if (cancelled) return
      setCriteria(loaded)
      setCriteriaDirty(false)
    })()
    return () => {
      cancelled = true
    }
  }, [roleProfile])

  const candidatesForRole = useMemo(() => {
    if (!resolvedJobId) return []
    const rows = jobCandidates.filter((c) => c.requisitionId === resolvedJobId)
    return [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }, [jobCandidates, resolvedJobId])

  const visible = useMemo(() => {
    if (filter === 'top10') return candidatesForRole.slice(0, 10)
    return candidatesForRole.filter((c) => {
      if (filter === 'all') return true
      if (filter === 'viable') {
        if (c.recommendation === 'strong' || c.recommendation === 'viable') return true
        return (c.score ?? 0) >= criteria.viableMin
      }
      return c.recommendation === filter
    })
  }, [candidatesForRole, filter, criteria.viableMin])

  const topTen = useMemo(() => candidatesForRole.slice(0, 10), [candidatesForRole])

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
    patchCriteria(defaultCriteriaForProfile(roleProfile))
  }

  const importScreened = async (
    items: Array<{
      text: string
      source: AtsSource
      externalId?: string
      appliedAt?: string
      gmailThreadId?: string
      gmailMessageId?: string
      /** When set, skip auto-detect (e.g. manual paste into current role tab). */
      forceProfile?: AtsRoleProfile
    }>,
  ) => {
    ensureStandardRoles()

    let added = 0
    let skipped = 0
    const byRole: Partial<Record<AtsRoleProfile, number>> = {}

    const criteriaCache: Partial<Record<Exclude<AtsRoleProfile, 'general'>, AtsCriteriaProfile>> = {
      frontend: selectedRole === 'frontend' ? criteria : undefined,
      backend: selectedRole === 'backend' ? criteria : undefined,
      designer: selectedRole === 'designer' ? criteria : undefined,
    }

    for (const profile of ['frontend', 'backend', 'designer'] as const) {
      if (!criteriaCache[profile]) {
        criteriaCache[profile] = await loadAtsCriteria(profile)
      }
    }

    const existingAll = [...jobCandidates]

    for (const item of items) {
      const detected = item.forceProfile ?? detectAtsRoleFromApplication(item.text)
      const profile = detected === 'general' ? 'general' : detected
      const scoringProfile: Exclude<AtsRoleProfile, 'general'> =
        profile === 'general' ? 'frontend' : profile
      const jobId = ensureJobForProfile(profile)
      const roleCriteria = criteriaCache[scoringProfile] ?? defaultCriteriaForProfile(scoringProfile)

      const result = screenApplicationText(item.text, scoringProfile, roleCriteria)
      const emailKey = result.email?.toLowerCase()
      const duplicate = existingAll.some(
        (c) =>
          (item.externalId && c.externalId === item.externalId) ||
          (emailKey && c.email?.toLowerCase() === emailKey && c.requisitionId === jobId) ||
          (!emailKey &&
            !item.externalId &&
            c.requisitionId === jobId &&
            c.name.toLowerCase() === result.name.toLowerCase()),
      )
      if (duplicate) {
        skipped += 1
        continue
      }

      addJobCandidate({
        requisitionId: jobId,
        name: result.name,
        email: result.email,
        phone: result.phone,
        linkedinUrl: result.linkedinUrl,
        location: result.location,
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
        resumeSummary: `[${labelForAtsRoleProfile(profile)}] ${result.summary}`,
        notes: item.text.slice(0, 12000),
        externalId: item.externalId,
        gmailThreadId: item.gmailThreadId,
        gmailMessageId: item.gmailMessageId,
        appliedAt: item.appliedAt ?? new Date().toISOString(),
      })
      existingAll.push({
        id: `temp_${added}`,
        requisitionId: jobId,
        name: result.name,
        email: result.email,
        externalId: item.externalId,
        stage: 'screen',
        updatedAt: new Date().toISOString(),
      })
      added += 1
      byRole[profile] = (byRole[profile] ?? 0) + 1
    }

    return { added, skipped, byRole }
  }

  const screenAndSave = async () => {
    if (!paste.trim()) {
      notifyError('Paste one or more applications from Gmail or Indeed.')
      return
    }
    setBusy(true)
    const chunks = splitApplicationBatch(paste)
    const { added, skipped, byRole } = await importScreened(
      chunks.map((text) => ({
        text,
        source,
        // Paste into the active role tab unless the text clearly names another role
        forceProfile: detectAtsRoleFromApplication(text) === 'general' ? selectedRole : undefined,
      })),
    )
    setBusy(false)
    setPaste('')
    if (added) {
      const parts = Object.entries(byRole)
        .map(([k, n]) => `${n} → ${labelForAtsRoleProfile(k as AtsRoleProfile)}`)
        .join(', ')
      notifySuccess(`Screened ${added} application${added === 1 ? '' : 's'}${parts ? ` (${parts})` : ''}.`)
    }
    if (skipped) notifyError(`Skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}.`)
    if (!added && !skipped) notifyError('No usable applications found in the paste.')
  }

  const syncFromGmail = () => {
    if (!isGmailAtsConfigured()) {
      notifyError('Add VITE_GOOGLE_CLIENT_ID and enable Gmail API for afrivatehr@gmail.com.')
      return
    }
    if (!isGmailAtsReady()) {
      void preloadGmailAts()
      notifyError('Google sign-in is still loading. Wait 1–2 seconds, then click Sync again.')
      return
    }

    // CRITICAL: start OAuth synchronously from the click (no await before this).
    let tokenPromise: Promise<string>
    try {
      tokenPromise = requestGmailAccessTokenFromGesture()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Gmail authorization failed')
      return
    }

    setSyncing(true)
    setSyncLabel('Waiting for Google permission…')
    ensureStandardRoles()

    void (async () => {
      try {
        const token = await tokenPromise
        setSyncLabel('Connecting to Gmail…')
        const messages = await fetchGmailApplications({
          accessToken: token,
          onProgress: ({ label }) => setSyncLabel(label),
        })
        setSyncLabel('Sorting by role & ranking…')
        const { added, skipped, byRole } = await importScreened(
          messages.map((m) => {
            const parsed = m.date ? Date.parse(m.date) : NaN
            const resumeNote = m.resumeFilesScanned?.length
              ? `\n\n[ATS scanned CV: ${m.resumeFilesScanned.join(', ')}]`
              : ''
            return {
              text: `${m.bodyText}${resumeNote}`,
              source: detectSourceFromEmail(m.from, m.subject),
              externalId: `gmail:${m.id}`,
              gmailThreadId: m.threadId,
              gmailMessageId: m.id,
              appliedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined,
            }
          }),
        )
        if (added) {
          const withCv = messages.filter((m) => (m.resumeFilesScanned?.length ?? 0) > 0).length
          const parts = Object.entries(byRole)
            .map(([k, n]) => `${n} ${labelForAtsRoleProfile(k as AtsRoleProfile)}`)
            .join(', ')
          notifySuccess(
            `Synced ${added} email${added === 1 ? '' : 's'} into role sections` +
              (parts ? `: ${parts}` : '') +
              (withCv ? ` (${withCv} with CV scanned).` : '.'),
          )
          const preferred = (['frontend', 'backend', 'designer'] as const).find((p) => (byRole[p] ?? 0) > 0)
          if (preferred) setSelectedRole(preferred)
        } else if (skipped) notifySuccess(`Already up to date (${skipped} previously imported).`)
        else notifyError(`No inbox emails found in the last ${GMAIL_ATS_LOOKBACK_DAYS} days.`)
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Gmail sync failed')
      } finally {
        setSyncing(false)
        setSyncLabel('')
      }
    })()
  }

  const rescoreVisible = () => {
    if (!resolvedJobId) return
    let n = 0
    for (const c of candidatesForRole) {
      if (!c.notes?.trim()) continue
      const result = screenApplicationText(
        c.notes,
        roleProfile,
        criteria,
      )
      updateJobCandidate(c.id, {
        name: result.name !== 'Unknown candidate' ? result.name : c.name,
        email: result.email ?? c.email,
        phone: result.phone ?? c.phone,
        linkedinUrl: result.linkedinUrl ?? c.linkedinUrl,
        location: result.location ?? c.location,
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
            Applications are sorted into role sections (Front-End, Back-End, Graphic Designer). Sync from {HR_MAILBOX} auto-routes each email.
          </p>
        </div>
        <Badge tone="brand">{selectedJob?.title ?? labelForAtsRoleProfile(selectedRole)}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {ATS_STANDARD_ROLES.map((role) => (
          <button
            key={role.profile}
            type="button"
            onClick={() => setSelectedRole(role.profile)}
            className={`rounded-md border px-3 py-2 text-sm transition-colors ${
              selectedRole === role.profile
                ? 'border-accent bg-accent/10 text-fg font-medium'
                : 'border-border bg-surface text-muted hover:text-fg'
            }`}
          >
            {role.title}
            <span className="ml-2 text-xs text-muted">({roleCounts[role.profile]})</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedRole('general')}
          className={`rounded-md border px-3 py-2 text-sm transition-colors ${
            selectedRole === 'general'
              ? 'border-accent bg-accent/10 text-fg font-medium'
              : 'border-border bg-surface text-muted hover:text-fg'
          }`}
        >
          Unassigned / Other
          <span className="ml-2 text-xs text-muted">({roleCounts.general})</span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card padding="md"><p className="text-xs text-muted">In this role</p><p className="mt-1 text-2xl font-semibold text-fg">{stats.total}</p></Card>
        <Card padding="md"><p className="text-xs text-muted">Viable+</p><p className="mt-1 text-2xl font-semibold text-accent">{stats.viable}</p></Card>
        <Card padding="md"><p className="text-xs text-muted">Strong</p><p className="mt-1 text-2xl font-semibold text-fg">{stats.strong}</p></Card>
        <Card padding="md"><p className="text-xs text-muted">Reject</p><p className="mt-1 text-2xl font-semibold text-fg">{stats.reject}</p></Card>
      </div>

      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Ranking criteria · {labelForAtsRoleProfile(selectedRole === 'general' ? 'frontend' : selectedRole)}
            </h3>
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

        <Select
          label="Paste source (manual import)"
          value={source}
          onChange={(e) => setSource(e.target.value as AtsSource)}
          options={SOURCE_OPTIONS}
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={syncFromGmail} loading={syncing}>
            <Mail className="h-4 w-4" />
            Sync from {HR_MAILBOX}
          </Button>
          <p className="self-center text-xs text-muted">
            {syncLabel ||
              `Syncs the inbox, detects each application’s role (e.g. Front-End Developer), and files it into that section with CV scanning.`}
          </p>
        </div>

        <Textarea
          label={`Or paste into ${labelForAtsRoleProfile(selectedRole)}`}
          hint="Paste one application, or several separated by --- . Clear role signals in the text can still move an app to another section."
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={8}
          placeholder={`Example:\nFrom: Jane Doe <jane@email.com>\nSubject: APPLICATION FOR FRONT-END DEVELOPER — Jane Doe\n\nCover letter...\nReact, TypeScript...`}
        />

        <Button
          variant="secondary"
          onClick={() => void screenAndSave()}
          loading={busy}
          disabled={!paste.trim()}
        >
          <Upload className="h-4 w-4" />
          Score & save pasted
        </Button>
      </Card>

      {topTen.length > 0 ? (
        <Card padding="md" className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Top 10 · {selectedJob?.title ?? labelForAtsRoleProfile(selectedRole)}
            </h3>
            <Badge tone="brand">by score</Badge>
          </div>
          <ol className="space-y-2">
            {topTen.map((c, i) => {
              const rank = i + 1
              const reason = explainCandidateRanking(c, rank, topTen, criteria)
              return (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">
                    <span className="mr-2 text-muted">#{rank}</span>
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {[c.email, c.phone, c.location].filter(Boolean).join(' · ') || 'No contact details yet'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-fg/90">{reason}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={recommendationTone(c.recommendation)}>{c.recommendation ?? 'unscored'}</Badge>
                  <Badge tone="muted">{c.score ?? 0}/100</Badge>
                  {c.gmailThreadId ? (
                    <a
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      href={gmailThreadUrl(c.gmailThreadId)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open email
                    </a>
                  ) : null}
                </div>
              </li>
              )
            })}
          </ol>
        </Card>
      ) : null}

      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Ranked · {selectedJob?.title ?? labelForAtsRoleProfile(selectedRole)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterMode)}
            >
              <option value="top10">Top 10</option>
              <option value="viable">Viable & strong</option>
              <option value="strong">Strong only</option>
              <option value="all">All screened</option>
              <option value="weak">Weak</option>
              <option value="reject">Reject</option>
            </select>
          </div>
        </div>

        {!resolvedJobId ? (
          <EmptyState icon={Briefcase} title="No role section yet" description="Sync Gmail or paste an application — Front-End / Back-End / Designer sections are created automatically." />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={`No ${selectedJob?.title ?? 'candidates'} in this view`}
            description="Sync Gmail (apps auto-sort by role), paste into this tab, or switch the filter."
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((c, index) => (
              <CandidateRow
                key={c.id}
                rank={filter === 'top10' ? index + 1 : candidatesForRole.findIndex((x) => x.id === c.id) + 1}
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
                  ) : c.kind === 'resume_file' ? (
                    <span className="text-xs text-muted">Points when CV text is extracted from PDF/DOCX/JPG/PNG</span>
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
  rank,
  candidate,
  criteria,
  onUpdate,
}: {
  rank: number
  candidate: JobCandidate
  criteria: AtsCriteriaProfile
  onUpdate: (id: string, patch: Partial<JobCandidate>) => void
}) {
  const breakdownEntries = Object.entries(candidate.scoreBreakdown ?? {}).filter(
    ([key, pts]) => key !== 'red_flags' && pts > 0,
  )
  const labelFor = (id: string) => criteria.criteria.find((c) => c.id === id)?.label ?? id
  const mailUrl = candidate.gmailThreadId ? gmailThreadUrl(candidate.gmailThreadId) : null

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted">#{rank}</Badge>
            {mailUrl ? (
              <a
                className="font-semibold text-fg hover:text-accent hover:underline"
                href={mailUrl}
                target="_blank"
                rel="noreferrer"
                title="Open original application in Gmail"
              >
                {candidate.name}
              </a>
            ) : (
              <p className="font-semibold text-fg">{candidate.name}</p>
            )}
            <Badge tone={recommendationTone(candidate.recommendation)}>
              {candidate.recommendation ?? 'unscored'}
            </Badge>
            <Badge tone="muted">{candidate.score ?? 0}/100</Badge>
            {candidate.source ? <Badge tone="muted">{candidate.source}</Badge> : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            {candidate.email ? <span>{candidate.email}</span> : null}
            {candidate.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {candidate.phone}
              </span>
            ) : null}
            {candidate.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {candidate.location}
              </span>
            ) : null}
          </div>
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
            {mailUrl ? (
              <a className="inline-flex items-center gap-1 text-accent hover:underline" href={mailUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open in Gmail
              </a>
            ) : null}
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
            {candidate.linkedinUrl ? (
              <a className="inline-flex items-center gap-1 text-accent hover:underline" href={candidate.linkedinUrl} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            ) : null}
            {candidate.coverLetter ? <span className="text-muted">Cover letter detected</span> : <span className="text-muted">No cover letter signals</span>}
            {(candidate.scoreBreakdown?.resume_file ?? 0) > 0 || /---\s*Resume:/i.test(candidate.notes ?? '') ? (
              <span className="text-muted">CV text scanned</span>
            ) : null}
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
