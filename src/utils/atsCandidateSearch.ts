import type { JobCandidate } from '@/types/hr'

export type AtsListFilterMode = 'top10' | 'all' | 'viable' | 'strong' | 'weak' | 'reject'

/** Case-insensitive match across contact fields, links, summary, notes, and filenames. */
export function candidateMatchesSearch(candidate: JobCandidate, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    candidate.name,
    candidate.email,
    candidate.phone,
    candidate.location,
    candidate.linkedinUrl,
    candidate.githubUrl,
    candidate.portfolioUrl,
    candidate.resumeSummary,
    candidate.notes,
    candidate.source,
    ...(candidate.attachments ?? []).map((a) => a.filename),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
  return haystack.includes(q)
}

export function passesRecommendationFilter(
  candidate: JobCandidate,
  mode: AtsListFilterMode,
  viableMin: number,
): boolean {
  if (mode === 'all' || mode === 'top10') return true
  if (mode === 'viable') {
    if (candidate.recommendation === 'strong' || candidate.recommendation === 'viable') return true
    return (candidate.score ?? 0) >= viableMin
  }
  return candidate.recommendation === mode
}

/**
 * Ranked-list rows for the current role.
 * While searching: EVERYONE in the role (Top 10 + rest); recommendation filter is ignored.
 */
export function filterVisibleCandidates(
  candidatesForRole: JobCandidate[],
  options: {
    search: string
    filter: AtsListFilterMode
    viableMin: number
  },
): JobCandidate[] {
  const query = options.search.trim()
  if (query) {
    return candidatesForRole.filter((c) => candidateMatchesSearch(c, query))
  }
  if (options.filter === 'top10') return candidatesForRole.slice(0, 10)
  return candidatesForRole.filter((c) =>
    passesRecommendationFilter(c, options.filter, options.viableMin),
  )
}

/**
 * Top 10 card rows. Without search: true top scorers.
 * With search: only matching people among the true top 10.
 */
export function filterTopTenCandidates(
  candidatesForRole: JobCandidate[],
  search: string,
): JobCandidate[] {
  const top = candidatesForRole.slice(0, 10)
  const query = search.trim()
  if (!query) return top
  return top.filter((c) => candidateMatchesSearch(c, query))
}
