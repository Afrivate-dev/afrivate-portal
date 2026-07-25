import { useEffect, useMemo, useRef, useState } from 'react'
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
import { AtsEmailReadingPane } from '@/components/shared/AtsEmailReadingPane'
import { AtsRichText, parseLegacySummaryToRich } from '@/components/shared/AtsRichText'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useHr } from '@/context/HrContext'
import { useAuth } from '@/context/AuthContext'
import { pauseHrRealtime, resumeHrRealtime } from '@/hooks/usePortalRealtime'
import { joinApplicationNotes, stripResumeExtractBlocks } from '@/lib/atsEmailHtml'
import { loadAtsCriteria, saveAtsCriteria } from '@/lib/atsCriteriaStore'
import { candidateIsObviousJunk } from '@/utils/atsApplicationGate'
import {
  openJobsMatchingAtsProfile,
  pickCanonicalAtsJob,
} from '@/utils/atsJobRoles'
import { uploadAtsAttachmentBytes, probeAtsStorageAccess } from '@/lib/supabase/fileStorage'
import {
  candidateGmailUrl,
  encodeGmailExternalId,
  fetchGmailApplications,
  GMAIL_ATS_LOOKBACK_DAYS,
  gmailOAuthRedirectUri,
  HR_MAILBOX,
  isGmailAtsConfigured,
  preloadGmailAts,
  requestGmailAccessTokenFromGesture,
  type GmailSyncedAttachment,
} from '@/lib/gmailAtsSync'
import { notifyError, notifySuccess } from '@/lib/notify'
import { supabase } from '@/lib/supabase'
import type { CandidateAttachment, CandidateSource, CandidateStage, JobCandidate } from '@/types/hr'
import {
  ATS_STANDARD_ROLES,
  defaultCriteriaForProfile,
  detectAtsRoleFromApplication,
  detectSourceFromEmail,
  explainCandidateRankingRich,
  isPlausiblePersonName,
  isViableCandidate,
  labelForAtsRoleProfile,
  recommendationLabel,
  recommendationTone,
  screenApplicationText,
  splitApplicationBatch,
  type AtsCriteriaProfile,
  type AtsCriterion,
  type AtsRoleProfile,
  type AtsSource,
} from '@/utils/atsScoring'
import { fmtDate, uid } from '@/utils/helpers'

function criterionKindHint(kind: AtsCriterion['kind']): string {
  if (kind === 'keywords') return 'Looks for these words in the application'
  if (kind === 'github') return 'Checks for a GitHub link'
  if (kind === 'portfolio') return 'Checks for a portfolio or live project link'
  if (kind === 'cover_letter') return 'Checks for a cover letter'
  if (kind === 'resume_file') return 'Checks that a CV was scanned'
  if (kind === 'min_length') return 'Minimum application length'
  return kind
}

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
  const { user } = useAuth()
  const {
    jobRequisitions,
    jobCandidates,
    addJobRequisition,
    addJobCandidatesBatch,
    updateJobCandidate,
    removeJobCandidates,
    reloadHr,
  } = useHr()

  const jobIdCacheRef = useRef<Partial<Record<AtsRoleProfile, string>>>({})

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
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  const selectedCandidate = useMemo(
    () => (selectedCandidateId ? jobCandidates.find((c) => c.id === selectedCandidateId) ?? null : null),
    [jobCandidates, selectedCandidateId],
  )

  const findOpenJobForProfile = (profile: AtsRoleProfile) => {
    const matches = openJobsMatchingAtsProfile(openJobs, profile)
    return pickCanonicalAtsJob(matches, jobCandidates)
  }

  const ensureJobForProfile = async (profile: AtsRoleProfile): Promise<string> => {
    const cached = jobIdCacheRef.current[profile]
    if (cached) {
      // Cache can point at an empty duplicate — re-check against live jobs
      const stillOpen = openJobs.some((j) => j.id === cached)
      if (stillOpen) {
        const canonical = findOpenJobForProfile(profile)
        if (canonical && canonical.id !== cached) {
          jobIdCacheRef.current[profile] = canonical.id
          return canonical.id
        }
        return cached
      }
    }
    const existing = findOpenJobForProfile(profile)
    if (existing) {
      jobIdCacheRef.current[profile] = existing.id
      return existing.id
    }
    if (profile === 'general') {
      const id = await addJobRequisition(
        {
          title: UNASSIGNED_ROLE.title,
          department: UNASSIGNED_ROLE.department,
          status: 'open',
        },
        { reload: false },
      )
      jobIdCacheRef.current[profile] = id
      return id
    }
    const def = ATS_STANDARD_ROLES.find((r) => r.profile === profile)!
    const id = await addJobRequisition(
      {
        title: def.title,
        department: def.department,
        status: 'open',
      },
      { reload: false },
    )
    jobIdCacheRef.current[profile] = id
    return id
  }

  const ensureStandardRoles = async () => {
    for (const role of ATS_STANDARD_ROLES) {
      await ensureJobForProfile(role.profile)
    }
  }

  const roleCounts = useMemo(() => {
    const counts: Record<RoleTab, number> = {
      frontend: 0,
      backend: 0,
      fullstack: 0,
      designer: 0,
      general: 0,
    }
    for (const role of ['frontend', 'backend', 'fullstack', 'designer', 'general'] as const) {
      const ids = new Set(openJobsMatchingAtsProfile(jobRequisitions, role).map((j) => j.id))
      counts[role] = jobCandidates.filter((c) => ids.has(c.requisitionId)).length
    }
    return counts
  }, [jobCandidates, jobRequisitions])

  const resolvedJobIds = useMemo(() => {
    return new Set(openJobsMatchingAtsProfile(jobRequisitions, selectedRole).map((j) => j.id))
  }, [jobRequisitions, selectedRole])

  const resolvedJobId = useMemo(() => {
    const matches = openJobsMatchingAtsProfile(jobRequisitions, selectedRole)
    return pickCanonicalAtsJob(matches, jobCandidates)?.id ?? ''
  }, [jobRequisitions, jobCandidates, selectedRole])

  const selectedJob = jobRequisitions.find((j) => j.id === resolvedJobId)
  const roleProfile: Exclude<AtsRoleProfile, 'general'> =
    selectedRole === 'general' ? 'frontend' : selectedRole

  useEffect(() => {
    void ensureStandardRoles().catch((err) => {
      console.warn('[ats] ensure roles', err instanceof Error ? err.message : err)
    })
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
    if (!resolvedJobIds.size) return []
    const rows = jobCandidates.filter((c) => resolvedJobIds.has(c.requisitionId))
    return [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }, [jobCandidates, resolvedJobIds])

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
    notifySuccess('Scoring rules saved.')
  }

  const resetCriteria = () => {
    patchCriteria(defaultCriteriaForProfile(roleProfile))
  }

  const importScreened = async (
    items: Array<{
      text: string
      html?: string
      attachmentFiles?: GmailSyncedAttachment[]
      source: AtsSource
      externalId?: string
      appliedAt?: string
      gmailThreadId?: string
      gmailMessageId?: string
      /** When set, skip auto-detect (e.g. manual paste into current role tab). */
      forceProfile?: AtsRoleProfile
    }>,
  ) => {
    pauseHrRealtime()
    let skipped = 0
    const byRole: Partial<Record<AtsRoleProfile, number>> = {}
    const toInsert: Array<Omit<JobCandidate, 'id' | 'updatedAt'>> = []

    try {
      await ensureStandardRoles()

      const criteriaCache: Partial<Record<Exclude<AtsRoleProfile, 'general'>, AtsCriteriaProfile>> = {
        frontend: selectedRole === 'frontend' ? criteria : undefined,
        backend: selectedRole === 'backend' ? criteria : undefined,
        fullstack: selectedRole === 'fullstack' ? criteria : undefined,
        designer: selectedRole === 'designer' ? criteria : undefined,
      }

      for (const profile of ['frontend', 'backend', 'fullstack', 'designer'] as const) {
        if (!criteriaCache[profile]) {
          criteriaCache[profile] = await loadAtsCriteria(profile)
        }
      }

      const existingAll = [...jobCandidates]
      let refreshedAttachments = 0
      const uploadFailures: string[] = []

      const uploadItemAttachments = async (
        item: (typeof items)[number],
      ): Promise<CandidateAttachment[]> => {
        const stored: CandidateAttachment[] = []
        if (!supabase || !user?.id || !item.attachmentFiles?.length) return stored
        const key = item.gmailMessageId || item.externalId || `manual_${Date.now()}`
        for (const file of item.attachmentFiles) {
          const uploaded = await uploadAtsAttachmentBytes(
            supabase,
            user.id,
            key,
            file.filename,
            file.bytes,
            file.mimeType,
          )
          if ('error' in uploaded) {
            console.warn('[ats] attachment upload failed', file.filename, uploaded.error)
            uploadFailures.push(`${file.filename}: ${uploaded.error}`)
            continue
          }
          stored.push({
            id: `att_${uid()}`,
            filename: file.filename,
            mimeType: file.mimeType,
            storagePath: uploaded.path,
            kind: file.kind,
            size: uploaded.size,
          })
        }
        return stored
      }

      for (const item of items) {
        const detected = item.forceProfile ?? detectAtsRoleFromApplication(item.text)
        const profile = detected === 'general' ? 'general' : detected
        const scoringProfile: Exclude<AtsRoleProfile, 'general'> =
          profile === 'general' ? 'frontend' : profile
        const jobId = await ensureJobForProfile(profile)
        const roleCriteria = criteriaCache[scoringProfile] ?? defaultCriteriaForProfile(scoringProfile)

        const result = screenApplicationText(item.text, scoringProfile, roleCriteria)
        const emailKey = result.email?.toLowerCase()
        // Prefer Gmail message identity across roles so CV backfill still runs after rematch
        const existing = existingAll.find(
          (c) =>
            (item.externalId && c.externalId === item.externalId) ||
            (item.gmailMessageId && c.gmailMessageId === item.gmailMessageId) ||
            (emailKey && c.email?.toLowerCase() === emailKey && c.requisitionId === jobId) ||
            (!emailKey &&
              !item.externalId &&
              c.requisitionId === jobId &&
              c.name.toLowerCase() === result.name.toLowerCase()),
        )
        if (existing) {
          // Always re-upload CV files on sync when Gmail still has them (fixes empty storagePath / broken paths)
          const hasFiles = (item.attachmentFiles?.length ?? 0) > 0
          const needsMove = existing.requisitionId !== jobId
          if ((hasFiles || needsMove) && existing.id && !existing.id.startsWith('temp_')) {
            const storedAttachments = hasFiles ? await uploadItemAttachments(item) : []
            if (hasFiles && !storedAttachments.length && item.attachmentFiles?.length) {
              // uploadItemAttachments already recorded uploadFailures
            } else {
              const save = await updateJobCandidate(
                existing.id,
                {
                  ...(storedAttachments.length ? { attachments: storedAttachments } : {}),
                  ...(needsMove ? { requisitionId: jobId } : {}),
                  // Persist the letter only — CV extract stays out of the reading pane
                  notes: joinApplicationNotes(
                    stripResumeExtractBlocks(item.text).slice(0, 80000),
                    item.html?.slice(0, 200000),
                  ),
                  gmailThreadId: item.gmailThreadId ?? existing.gmailThreadId,
                  gmailMessageId: item.gmailMessageId ?? existing.gmailMessageId,
                },
                { reload: false },
              )
              if (save && typeof save === 'object' && save.error) {
                uploadFailures.push(`Could not save ${existing.name}: ${save.error.message}`)
              } else {
                if (storedAttachments.length) {
                  existing.attachments = storedAttachments
                  refreshedAttachments += 1
                }
                if (needsMove) existing.requisitionId = jobId
              }
            }
          }
          skipped += 1
          continue
        }

        const storedAttachments = await uploadItemAttachments(item)

        // Ensure resume criterion can pass when a DOCX/PDF was stored even if text extract was thin
        let scoringText = item.text
        if (
          (item.attachmentFiles?.length || storedAttachments.length) &&
          !/---\s*resume:/i.test(scoringText)
        ) {
          const names = [
            ...(item.attachmentFiles ?? []).map((f) => f.filename),
            ...storedAttachments.map((f) => f.filename),
          ]
            .filter(Boolean)
            .join(', ')
          scoringText += `\n\n--- Resume: ${names || 'attachment'} ---`
        }
        const scored =
          scoringText === item.text
            ? result
            : screenApplicationText(scoringText, scoringProfile, roleCriteria)

        const row: Omit<JobCandidate, 'id' | 'updatedAt'> = {
          requisitionId: jobId,
          name: scored.name,
          email: scored.email,
          phone: scored.phone,
          linkedinUrl: scored.linkedinUrl,
          location: scored.location,
          stage:
            scored.recommendation === 'reject'
              ? 'rejected'
              : scored.recommendation === 'weak'
                ? 'applied'
                : 'screen',
          source: item.source as CandidateSource,
          githubUrl: scored.githubUrl,
          portfolioUrl: scored.portfolioUrl,
          coverLetter: scored.coverLetter || storedAttachments.some((a) => a.kind === 'cover_letter'),
          score: scored.score,
          recommendation: scored.recommendation,
          scoreBreakdown: scored.breakdown as Record<string, number>,
          resumeSummary: `[${labelForAtsRoleProfile(profile)}] ${scored.summary}`,
          notes: joinApplicationNotes(
            stripResumeExtractBlocks(scoringText).slice(0, 80000),
            item.html?.slice(0, 200000),
          ),
          attachments: storedAttachments.length ? storedAttachments : undefined,
          externalId: item.externalId,
          gmailThreadId: item.gmailThreadId,
          gmailMessageId: item.gmailMessageId,
          appliedAt: item.appliedAt ?? new Date().toISOString(),
        }
        toInsert.push(row)
        existingAll.push({
          id: `temp_${toInsert.length}`,
          requisitionId: jobId,
          name: scored.name,
          email: scored.email,
          externalId: item.externalId,
          stage: 'screen',
          updatedAt: new Date().toISOString(),
        })
        byRole[profile] = (byRole[profile] ?? 0) + 1
      }

      const { added, failed } = await addJobCandidatesBatch(toInsert)
      if (failed && !added) {
        // Batch already reported; keep skipped count accurate
      }
      // Batch insert reloads when there are rows; attachment-only refresh must reload too
      if (refreshedAttachments > 0 && toInsert.length === 0) {
        await reloadHr()
      }
      return { added, skipped, byRole, failed, refreshedAttachments, uploadFailures }
    } finally {
      resumeHrRealtime()
    }
  }

  const screenAndSave = async () => {
    if (!paste.trim()) {
      notifyError('Paste at least one application first.')
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
      notifySuccess(`Added ${added} application${added === 1 ? '' : 's'}${parts ? ` (${parts})` : ''}.`)
    }
    if (skipped) notifyError(`Skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}.`)
    if (!added && !skipped) notifyError('Could not find a usable application in what you pasted.')
  }

  const syncFromGmail = () => {
    if (!isGmailAtsConfigured()) {
      notifyError(`Gmail sync is not set up yet. Ask an admin to add the Google Client ID for ${HR_MAILBOX}.`)
      return
    }

    // CRITICAL: open the OAuth pop-up synchronously from this click (no await before this).
    let tokenPromise: Promise<string>
    try {
      tokenPromise = requestGmailAccessTokenFromGesture()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Gmail authorization failed')
      return
    }

    setSyncing(true)
    setSyncLabel('Waiting for Google permission…')
    void ensureStandardRoles().catch(() => undefined)

    void (async () => {
      try {
        const token = await tokenPromise

        setSyncLabel('Removing obvious non-applications…')
        const junkIds = jobCandidates.filter((c) => candidateIsObviousJunk(c)).map((c) => c.id)
        const { removed: purged } = await removeJobCandidates(junkIds)

        if (supabase && user?.id) {
          setSyncLabel('Checking file storage…')
          const probe = await probeAtsStorageAccess(supabase, user.id)
          if ('error' in probe) {
            notifyError(probe.error)
            return
          }
        }

        setSyncLabel('Connecting to Gmail…')
        const { messages, skippedNonApplications, listed } = await fetchGmailApplications({
          accessToken: token,
          onProgress: ({ label }) => setSyncLabel(label),
        })
        setSyncLabel(`Sorting ${messages.length} applications by role & ranking…`)
        const { added, skipped, byRole, failed, refreshedAttachments, uploadFailures } =
          await importScreened(
          messages.map((m) => {
            const parsed = m.date ? Date.parse(m.date) : NaN
            const resumeNote = m.resumeFilesScanned?.length
              ? `\n\n[ATS scanned CV: ${m.resumeFilesScanned.join(', ')}]`
              : ''
            return {
              text: `${m.bodyText}${resumeNote}`,
              html: m.bodyHtml,
              attachmentFiles: m.attachmentFiles,
              source: detectSourceFromEmail(m.from, m.subject),
              externalId: encodeGmailExternalId(m.threadId, m.id),
              gmailThreadId: m.threadId,
              gmailMessageId: m.id,
              appliedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined,
            }
          }),
        )
        const purgeNote = purged
          ? ` · removed ${purged} junk email${purged === 1 ? '' : 's'}`
          : ''
        const refreshNote = refreshedAttachments
          ? ` · refreshed files on ${refreshedAttachments} existing candidate${refreshedAttachments === 1 ? '' : 's'}`
          : ''
        const roleParts = Object.entries(byRole)
          .map(([k, n]) => `${n} ${labelForAtsRoleProfile(k as AtsRoleProfile)}`)
          .join(', ')
        if (uploadFailures.length) {
          notifyError(
            `CV upload issue (${uploadFailures.length}): ${uploadFailures[0]}${uploadFailures.length > 1 ? '…' : ''}`,
          )
        }
        if (added) {
          const withCv = messages.filter((m) => (m.resumeFilesScanned?.length ?? 0) > 0).length
          notifySuccess(
            `Inbox listed ${listed} · imported ${added} application${added === 1 ? '' : 's'}` +
              (roleParts ? `: ${roleParts}` : '') +
              (withCv ? ` (${withCv} with CV scanned)` : '') +
              (failed ? ` · ${failed} failed to save` : '') +
              (skipped ? ` · ${skipped} already in ATS` : '') +
              (skippedNonApplications
                ? ` · skipped ${skippedNonApplications} non-application${skippedNonApplications === 1 ? '' : 's'}`
                : '') +
              purgeNote +
              refreshNote +
              '.',
          )
          const preferred = (['frontend', 'backend', 'fullstack', 'designer'] as const).find(
            (p) => (byRole[p] ?? 0) > 0,
          )
          if (preferred) setSelectedRole(preferred)
        } else if (skipped || skippedNonApplications || purged || refreshedAttachments) {
          notifySuccess(
            `Inbox listed ${listed} · ${messages.length} application${messages.length === 1 ? '' : 's'} found` +
              (skipped ? ` · ${skipped} already in ATS` : '') +
              (roleParts ? ` · previous imports by role still visible in tabs` : '') +
              (skippedNonApplications
                ? ` · skipped ${skippedNonApplications} non-application${skippedNonApplications === 1 ? '' : 's'}`
                : '') +
              purgeNote +
              refreshNote +
              '.',
          )
        } else notifyError(`No application emails found in the last ${GMAIL_ATS_LOOKBACK_DAYS} days (listed ${listed}).`)
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not sync from Gmail')
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
      const nextName =
        result.name !== 'Unknown candidate'
          ? result.name
          : isPlausiblePersonName(c.name)
            ? c.name
            : 'Unknown candidate'
      // Only score/identity fields — never rewrite Gmail ids (avoids missing-column DB errors).
      updateJobCandidate(c.id, {
        name: nextName,
        email: result.email ?? c.email,
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
    notifySuccess(
      n
        ? `Updated scores and names for ${n} candidate${n === 1 ? '' : 's'}.`
        : 'No saved application text to refresh.',
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-clip sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-fg">Recruitment</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Shared for all HR and Admin accounts. Sync from {HR_MAILBOX}, rank candidates, and open
            resumes / cover letters with Preview, Open, or Download on any device.
          </p>
          <details className="mt-2 max-w-2xl rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted">
            <summary className="cursor-pointer font-medium text-fg">
              Google OAuth setup (tap to expand)
            </summary>
            <div className="mt-2">
              Google Cloud → Credentials → your OAuth client must include:
              <br />
              <span className="font-medium text-fg">Authorized JavaScript origins:</span> https://portal.afrivate.org
              <br />
              <span className="font-medium text-fg">Authorized redirect URIs</span> (exact match, copy this):
              <br />
              <button
                type="button"
                className="mt-1 max-w-full break-all rounded border border-border bg-surface px-2 py-1 font-mono text-[11px] text-fg hover:border-accent"
                onClick={() => {
                  const uri = gmailOAuthRedirectUri()
                  void navigator.clipboard?.writeText(uri)
                  notifySuccess('Redirect URI copied. Paste it under Authorized redirect URIs (not JavaScript origins).')
                }}
              >
                {typeof window !== 'undefined' ? gmailOAuthRedirectUri() : 'https://portal.afrivate.org/oauth/gmail-callback'}
              </button>
              <br />
              Allow pop-ups, then Sync and sign in as {HR_MAILBOX}.
            </div>
          </details>
        </div>
        <Badge tone="brand" className="self-start">
          {selectedJob?.title ?? labelForAtsRoleProfile(selectedRole)}
        </Badge>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin">
        {ATS_STANDARD_ROLES.map((role) => (
          <button
            key={role.profile}
            type="button"
            onClick={() => setSelectedRole(role.profile)}
            className={`shrink-0 rounded-md border px-3 py-2 text-sm transition-colors ${
              selectedRole === role.profile
                ? 'border-accent bg-accent/10 text-fg font-medium'
                : 'border-border bg-surface text-muted hover:text-fg'
            }`}
          >
            <span className="sm:hidden">
              {role.profile === 'frontend'
                ? 'Front-End'
                : role.profile === 'backend'
                  ? 'Back-End'
                  : role.profile === 'fullstack'
                    ? 'Full-Stack'
                    : 'Designer'}
            </span>
            <span className="hidden sm:inline">{role.title}</span>
            <span className="ml-2 text-xs text-muted">({roleCounts[role.profile]})</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedRole('general')}
          className={`shrink-0 rounded-md border px-3 py-2 text-sm transition-colors ${
            selectedRole === 'general'
              ? 'border-accent bg-accent/10 text-fg font-medium'
              : 'border-border bg-surface text-muted hover:text-fg'
          }`}
        >
          Other
          <span className="ml-2 text-xs text-muted">({roleCounts.general})</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Card padding="md">
          <p className="text-xs text-muted">Candidates</p>
          <p className="mt-1 text-xl font-semibold text-fg sm:text-2xl">{stats.total}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-muted">Worth reviewing</p>
          <p className="mt-1 text-xl font-semibold text-accent sm:text-2xl">{stats.viable}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-muted">Strong fit</p>
          <p className="mt-1 text-xl font-semibold text-fg sm:text-2xl">{stats.strong}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-muted">Not a fit</p>
          <p className="mt-1 text-xl font-semibold text-fg sm:text-2xl">{stats.reject}</p>
        </Card>
      </div>

      <Card padding="md" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Settings2 className="h-4 w-4 shrink-0 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Scoring rules · {labelForAtsRoleProfile(selectedRole === 'general' ? 'frontend' : selectedRole)}
            </h3>
            {criteriaDirty ? <Badge tone="warning">Unsaved changes</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCriteriaOpen((o) => !o)}>
              {criteriaOpen ? 'Hide' : 'Show'}
            </Button>
            <Button variant="secondary" size="sm" onClick={resetCriteria}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button size="sm" loading={savingCriteria} onClick={() => void persistCriteria()} disabled={!criteriaDirty}>
              <Save className="h-3.5 w-3.5" />
              Save rules
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
            Strong fit from {criteria.strongMin}+ · Good fit from {criteria.viableMin}+ · Not a fit below{' '}
            {criteria.rejectBelow} · {criteria.criteria.filter((c) => c.enabled !== false).length} active checks
          </p>
        )}
      </Card>

      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Bring in applications</h3>
        </div>

        <Select
          label="Where did this paste come from?"
          value={source}
          onChange={(e) => setSource(e.target.value as AtsSource)}
          options={SOURCE_OPTIONS}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button onClick={syncFromGmail} loading={syncing} className="w-full sm:w-auto">
            <Mail className="h-4 w-4" />
            Sync Gmail ({HR_MAILBOX})
          </Button>
          <p className="text-xs text-muted sm:self-center">
            {syncLabel ||
              'Scans inbox, labels, and spam for job applications — skips everything else, then scores and files by role.'}
          </p>
        </div>

        <Textarea
          label={`Or paste into ${labelForAtsRoleProfile(selectedRole)}`}
          hint="Paste one application, or several separated by --- . If the text clearly names another role, it will move there."
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={8}
          placeholder={`Example:\nFrom: Ada Lovelace <ada@email.com>\nSubject: APPLICATION FOR FRONT-END DEVELOPER — Ada Lovelace\n\nDear team,\nI am applying for the Front-End role...\n\nYours sincerely,\nAda Lovelace`}
        />

        <Button
          variant="secondary"
          onClick={() => void screenAndSave()}
          loading={busy}
          disabled={!paste.trim()}
        >
          <Upload className="h-4 w-4" />
          Score & add pasted applications
        </Button>
      </Card>

      {topTen.length > 0 ? (
        <Card padding="md" className="min-w-0 space-y-3 overflow-hidden">
          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Trophy className="h-4 w-4 shrink-0 text-accent" />
              <h3 className="min-w-0 break-words text-sm font-semibold text-fg">
                Top 10 · {selectedJob?.title ?? labelForAtsRoleProfile(selectedRole)}
              </h3>
              <Badge tone="brand">Highest scores</Badge>
            </div>
            <p className="text-xs text-muted sm:ml-auto">Tap a name for details &amp; Gmail</p>
          </div>
          <ol className="min-w-0 space-y-2">
            {topTen.map((c, i) => {
              const rank = i + 1
              const reason = explainCandidateRankingRich(c, rank, topTen, criteria)
              const mailUrl = candidateGmailUrl(c)
              const contact = [c.email, c.phone, c.location].filter(Boolean).join(' · ')
              return (
                <li key={c.id} className="min-w-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCandidateId(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedCandidateId(c.id)
                      }
                    }}
                    className="flex min-w-0 w-full max-w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-accent/50 hover:bg-surface-2 sm:px-3.5"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-muted">
                        #{rank}
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="break-words font-medium leading-snug text-fg">{c.name}</p>
                        <p className="mt-0.5 break-all text-xs text-muted">
                          {contact || 'Contact details will appear here after sync'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone="muted" className="whitespace-nowrap">
                          {c.score ?? 0}/100
                        </Badge>
                        <Badge tone={recommendationTone(c.recommendation)} className="max-w-[7.5rem] truncate">
                          {recommendationLabel(c.recommendation)}
                        </Badge>
                      </div>
                    </div>
                    <AtsRichText
                      block={reason}
                      className="min-w-0 space-y-1.5 overflow-hidden text-xs leading-relaxed text-fg/90"
                    />
                    {mailUrl ? (
                      <a
                        className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-border bg-surface px-2.5 py-2 text-xs font-medium text-accent hover:bg-surface-2 sm:w-auto sm:justify-start sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:hover:bg-transparent sm:hover:underline"
                        href={mailUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Gmail
                      </a>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>
      ) : null}

      <Card padding="md" className="min-w-0 space-y-4 overflow-hidden">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0 text-accent" />
            <h3 className="min-w-0 break-words text-sm font-semibold text-fg">
              Ranked candidates · {selectedJob?.title ?? labelForAtsRoleProfile(selectedRole)}
            </h3>
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
            <Filter className="h-4 w-4 shrink-0 text-muted" />
            <select
              className="min-w-0 w-full flex-1 rounded-md border border-border bg-surface px-2 py-2 text-sm sm:w-auto sm:flex-none sm:py-1.5"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterMode)}
            >
              <option value="top10">Top 10</option>
              <option value="viable">Worth reviewing</option>
              <option value="strong">Strong fit only</option>
              <option value="all">Everyone</option>
              <option value="weak">Weak fit</option>
              <option value="reject">Not a fit</option>
            </select>
          </div>
        </div>

        {!resolvedJobIds.size ? (
          <EmptyState
            icon={Briefcase}
            title="No role set up yet"
            description="Sync Gmail or paste an application. Role sections are created automatically."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No candidates in this view"
            description="Sync Gmail, paste an application into this role, or change the filter above."
          />
        ) : (
          <ul className="min-w-0 space-y-3">
            {visible.map((c, index) => (
              <CandidateRow
                key={c.id}
                rank={filter === 'top10' ? index + 1 : candidatesForRole.findIndex((x) => x.id === c.id) + 1}
                candidate={c}
                criteria={criteria}
                onOpen={() => setSelectedCandidateId(c.id)}
                onUpdate={updateJobCandidate}
              />
            ))}
          </ul>
        )}
      </Card>

      <CandidateDetailModal
        candidate={selectedCandidate}
        criteria={criteria}
        rank={
          selectedCandidate
            ? candidatesForRole.findIndex((x) => x.id === selectedCandidate.id) + 1
            : 0
        }
        peers={candidatesForRole}
        onClose={() => setSelectedCandidateId(null)}
        onUpdate={updateJobCandidate}
      />
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
          label: 'New check',
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
      <p className="text-xs text-muted">
        Set score thresholds and what each application is checked for. After editing, save rules then refresh
        scores. <strong className="font-medium text-fg">Required</strong> only blocks Strong fit — it never
        forces Not a fit. Not a fit is score-only (below the threshold). If rankings look wrong, use Reset to
        defaults then Refresh scores &amp; names.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Strong fit from (score)"
          type="number"
          value={String(profile.strongMin)}
          onChange={(e) => onChange({ ...profile, strongMin: Number(e.target.value) || 0 })}
        />
        <Input
          label="Good fit from (score)"
          type="number"
          value={String(profile.viableMin)}
          onChange={(e) => onChange({ ...profile, viableMin: Number(e.target.value) || 0 })}
        />
        <Input
          label="Not a fit below (score)"
          type="number"
          value={String(profile.rejectBelow)}
          onChange={(e) => onChange({ ...profile, rejectBelow: Number(e.target.value) || 0 })}
          hint="Only scores strictly below this become Not a fit"
        />
      </div>

      <div className="-mx-1 overflow-x-auto rounded-md border border-border sm:mx-0">
        <table className="min-w-[40rem] w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              <th className="px-2 py-2 font-medium sm:px-3">On</th>
              <th className="px-2 py-2 font-medium sm:px-3">What we check</th>
              <th className="px-2 py-2 font-medium sm:px-3">Points</th>
              <th className="px-2 py-2 font-medium sm:px-3">Required</th>
              <th className="px-2 py-2 font-medium sm:px-3">Details</th>
              <th className="px-2 py-2 font-medium sm:px-3" />
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
                  <p className="mt-1 text-[11px] text-muted">{criterionKindHint(c.kind)}</p>
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
                    title="Required for Strong fit only — missing does not mark Not a fit"
                  />
                </td>
                <td className="px-3 py-2">
                  {c.kind === 'keywords' ? (
                    <input
                    className="w-full min-w-[8rem] rounded border border-border bg-surface px-2 py-1 sm:min-w-[12rem]"
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
                    <span className="text-xs text-muted">Points when CV text is read from PDF, Word, or image</span>
                  ) : (
                    <span className="text-xs text-muted">Detected automatically from the application</span>
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
          Add check
        </Button>
        <Button variant="ghost" size="sm" onClick={onRescore}>
          Refresh scores & names
        </Button>
      </div>
    </div>
  )
}

function CandidateRow({
  rank,
  candidate,
  criteria,
  onOpen,
  onUpdate,
}: {
  rank: number
  candidate: JobCandidate
  criteria: AtsCriteriaProfile
  onOpen: () => void
  onUpdate: (id: string, patch: Partial<JobCandidate>) => void
}) {
  const breakdownEntries = Object.entries(candidate.scoreBreakdown ?? {}).filter(
    ([key, pts]) => key !== 'red_flags' && pts > 0,
  )
  const labelFor = (id: string) => criteria.criteria.find((c) => c.id === id)?.label ?? id
  const mailUrl = candidateGmailUrl(candidate)

  return (
    <li className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border p-3 transition-colors hover:border-accent/40 sm:p-4">
      <div className="flex min-w-0 flex-col gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 w-full max-w-full overflow-hidden text-left">
          <div className="flex min-w-0 items-start gap-2">
            <Badge tone="muted" className="mt-0.5 shrink-0">
              #{rank}
            </Badge>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="break-words font-semibold leading-snug text-fg hover:text-accent">{candidate.name}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone={recommendationTone(candidate.recommendation)} className="max-w-full">
                  <span className="truncate">{recommendationLabel(candidate.recommendation)}</span>
                </Badge>
                <Badge tone="muted" className="shrink-0 whitespace-nowrap">
                  {candidate.score ?? 0}/100
                </Badge>
                {candidate.source ? (
                  <Badge tone="muted" className="max-w-[8rem] truncate">
                    {candidate.source}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-2 flex min-w-0 flex-col gap-1 text-sm text-muted">
            {candidate.email ? (
              <span className="break-all">{candidate.email}</span>
            ) : (
              <span>No email found yet</span>
            )}
            {candidate.phone ? (
              <span className="inline-flex min-w-0 items-center gap-1 break-all">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {candidate.phone}
              </span>
            ) : null}
            {candidate.location ? (
              <span className="inline-flex min-w-0 items-center gap-1 break-words">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {candidate.location}
              </span>
            ) : null}
          </div>

          {candidate.resumeSummary ? (
            <AtsRichText
              block={
                parseLegacySummaryToRich(candidate.resumeSummary) ?? {
                  paragraphs: [candidate.resumeSummary],
                }
              }
              className="mt-2 min-w-0 space-y-1.5 overflow-hidden text-sm text-fg"
            />
          ) : null}

          {breakdownEntries.length > 0 ? (
            <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
              {breakdownEntries.slice(0, 6).map(([id, pts]) => (
                <Badge key={id} tone="muted" className="max-w-full">
                  <span className="truncate">
                    {labelFor(id)} +{pts}
                  </span>
                </Badge>
              ))}
              {breakdownEntries.length > 6 ? (
                <Badge tone="muted">+{breakdownEntries.length - 6} more</Badge>
              ) : null}
            </div>
          ) : null}
          <p className="mt-2 text-xs text-accent">View details →</p>
        </button>

        <div className="flex min-w-0 flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-center">
          {mailUrl ? (
            <a
              className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-border px-2.5 py-2 text-sm text-accent hover:bg-surface-2 sm:w-auto sm:justify-start"
              href={mailUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Gmail
            </a>
          ) : null}
          <select
            className="min-w-0 w-full rounded-md border border-border bg-surface px-2 py-2 text-sm sm:ml-auto sm:w-auto sm:py-1.5"
            value={candidate.stage}
            onChange={(e) => onUpdate(candidate.id, { stage: e.target.value as CandidateStage })}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="applied">Applied</option>
            <option value="screen">Screening</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
    </li>
  )
}

function CandidateDetailModal({
  candidate,
  criteria,
  rank,
  peers,
  onClose,
  onUpdate,
}: {
  candidate: JobCandidate | null
  criteria: AtsCriteriaProfile
  rank: number
  peers: JobCandidate[]
  onClose: () => void
  onUpdate: (id: string, patch: Partial<JobCandidate>) => void
}) {
  if (!candidate) return null

  const mailUrl = candidateGmailUrl(candidate)
  const reason =
    rank > 0 ? explainCandidateRankingRich(candidate, rank, peers.slice(0, 10), criteria) : undefined
  const breakdownEntries = Object.entries(candidate.scoreBreakdown ?? {}).filter(
    ([key, pts]) => key !== 'red_flags' && pts > 0,
  )
  const labelFor = (id: string) => criteria.criteria.find((c) => c.id === id)?.label ?? id
  const summaryBlock =
    parseLegacySummaryToRich(candidate.resumeSummary) ??
    (candidate.resumeSummary ? { paragraphs: [candidate.resumeSummary] } : null)

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={candidate.name}
      description={
        rank > 0
          ? `Rank #${rank} · ${recommendationLabel(candidate.recommendation)} · ${candidate.score ?? 0}/100`
          : `${recommendationLabel(candidate.recommendation)} · ${candidate.score ?? 0}/100`
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {mailUrl ? (
            <Button
              onClick={() => {
                window.open(mailUrl, '_blank', 'noopener,noreferrer')
              }}
            >
              <ExternalLink className="h-4 w-4" />
              Open in Gmail
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Email</p>
            <p className="mt-0.5 break-all text-sm text-fg">{candidate.email || 'Not found in application'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Phone</p>
            <p className="mt-0.5 text-sm text-fg">{candidate.phone || 'Not found'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Location</p>
            <p className="mt-0.5 text-sm text-fg">{candidate.location || 'Not found'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Applied</p>
            <p className="mt-0.5 text-sm text-fg">
              {candidate.appliedAt ? fmtDate(candidate.appliedAt) : 'Unknown date'}
            </p>
          </div>
        </div>

        {reason ? (
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs font-medium text-muted">Why this ranking</p>
            <AtsRichText
              block={reason}
              className="mt-1 min-w-0 space-y-2 overflow-hidden text-sm leading-relaxed text-fg"
            />
          </div>
        ) : null}

        {summaryBlock ? (
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs font-medium text-muted">Summary</p>
            <AtsRichText
              block={summaryBlock}
              className="mt-1 min-w-0 space-y-2 overflow-hidden text-sm leading-relaxed text-fg"
            />
          </div>
        ) : null}

        {breakdownEntries.length > 0 ? (
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Score breakdown</p>
            <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
              {breakdownEntries.map(([id, pts]) => (
                <Badge key={id} tone="muted" className="max-w-full">
                  <span className="truncate">
                    {labelFor(id)} +{pts}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 text-sm">
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
          {candidate.coverLetter ? (
            <span className="text-muted">Cover letter detected</span>
          ) : (
            <span className="text-muted">No clear cover letter</span>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-muted">Hiring stage</p>
          <select
            className="mt-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={candidate.stage}
            onChange={(e) => onUpdate(candidate.id, { stage: e.target.value as CandidateStage })}
          >
            <option value="applied">Applied</option>
            <option value="screen">Screening</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Application email</p>
          <AtsEmailReadingPane candidate={candidate} />
        </div>
      </div>
    </Modal>
  )
}
