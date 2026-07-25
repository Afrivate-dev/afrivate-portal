import type { JobCandidate, JobRequisition } from '@/types/hr'
import {
  ATS_STANDARD_ROLES,
  detectAtsRoleProfile,
  type AtsRoleProfile,
} from '@/utils/atsScoring'

/** All open requisitions that belong to a standard ATS role tab (handles duplicate job rows). */
export function openJobsMatchingAtsProfile(
  jobs: JobRequisition[],
  profile: AtsRoleProfile,
): JobRequisition[] {
  const open = jobs.filter((j) => j.status === 'open')
  if (profile === 'general') {
    return open.filter(
      (j) => /unassigned|other/i.test(j.title) || detectAtsRoleProfile(j.title) === 'general',
    )
  }
  const standardTitle = ATS_STANDARD_ROLES.find((r) => r.profile === profile)?.title
  return open.filter(
    (j) => detectAtsRoleProfile(j.title) === profile || (standardTitle != null && j.title === standardTitle),
  )
}

/**
 * Prefer the requisition that already has the most candidates.
 * Fixes “Sync found 84 but Front-End shows 1” when a newer empty duplicate job was created.
 */
export function pickCanonicalAtsJob(
  jobs: JobRequisition[],
  candidates: JobCandidate[],
): JobRequisition | undefined {
  if (!jobs.length) return undefined
  return [...jobs].sort((a, b) => {
    const ca = candidates.filter((c) => c.requisitionId === a.id).length
    const cb = candidates.filter((c) => c.requisitionId === b.id).length
    if (cb !== ca) return cb - ca
    return String(a.createdAt).localeCompare(String(b.createdAt))
  })[0]
}

export function candidateIdsForAtsProfile(
  jobs: JobRequisition[],
  profile: AtsRoleProfile,
): Set<string> {
  return new Set(openJobsMatchingAtsProfile(jobs, profile).map((j) => j.id))
}
