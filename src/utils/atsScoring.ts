import type { JobCandidate } from '@/types/hr'

export type AtsSource = 'gmail' | 'indeed' | 'bebee' | 'jobberman' | 'linkedin' | 'manual' | 'other'
export type AtsRecommendation = 'strong' | 'viable' | 'weak' | 'reject'
export type AtsRoleProfile = 'frontend' | 'backend' | 'designer' | 'general'

export type AtsCriterionKind =
  | 'keywords'
  | 'github'
  | 'portfolio'
  | 'cover_letter'
  | 'min_length'

export interface AtsCriterion {
  id: string
  label: string
  kind: AtsCriterionKind
  /** Max points awarded when this criterion is met. */
  weight: number
  /** For keywords: match any of these (case-insensitive). */
  keywords?: string[]
  /** Treat as required; missing ones lower the recommendation. */
  mustHave?: boolean
  /** For min_length: minimum characters of application text. */
  minLength?: number
  enabled?: boolean
}

export interface AtsCriteriaProfile {
  roleProfile: AtsRoleProfile
  label: string
  strongMin: number
  viableMin: number
  rejectBelow: number
  criteria: AtsCriterion[]
  updatedAt?: string
}

export interface AtsScreenResult {
  name: string
  email?: string
  githubUrl?: string
  portfolioUrl?: string
  coverLetter: boolean
  score: number
  recommendation: AtsRecommendation
  breakdown: Record<string, number>
  matched: string[]
  missing: string[]
  summary: string
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const GITHUB_RE = /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/?(?:[A-Za-z0-9_.\-/]*)?/gi
const PORTFOLIO_RE =
  /https?:\/\/(?:www\.)?(?:[A-Za-z0-9-]+\.)+(?:vercel\.app|netlify\.app|pages\.dev|github\.io|web\.app|carrd\.co|behance\.net|dribbble\.com|figma\.com)[^\s)\]>"']*/gi
const GENERIC_URL_RE = /https?:\/\/[^\s)\]>"']+/gi

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((t) => text.includes(t.toLowerCase()))
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

export function defaultFrontendCriteria(): AtsCriteriaProfile {
  return {
    roleProfile: 'frontend',
    label: 'Front-End Developer',
    strongMin: 75,
    viableMin: 55,
    rejectBelow: 40,
    criteria: [
      { id: 'react', label: 'React', kind: 'keywords', weight: 22, mustHave: true, keywords: ['react', 'react.js', 'reactjs', 'next.js', 'nextjs'], enabled: true },
      { id: 'typescript', label: 'TypeScript', kind: 'keywords', weight: 14, keywords: ['typescript', ' ts ', '.tsx'], enabled: true },
      { id: 'javascript', label: 'JavaScript', kind: 'keywords', weight: 8, keywords: ['javascript', 'es6', 'es2015', 'vanilla js'], enabled: true },
      { id: 'html_css', label: 'HTML / CSS / Responsive', kind: 'keywords', weight: 8, keywords: ['html', 'css', 'tailwind', 'sass', 'scss', 'responsive'], enabled: true },
      { id: 'git', label: 'Git / GitHub', kind: 'keywords', weight: 14, mustHave: true, keywords: ['git', 'github', 'pull request', 'version control'], enabled: true },
      { id: 'github_url', label: 'GitHub profile/link', kind: 'github', weight: 8, mustHave: true, enabled: true },
      { id: 'portfolio', label: 'Portfolio / deployed work', kind: 'portfolio', weight: 10, mustHave: true, enabled: true },
      { id: 'cover_letter', label: 'Cover letter', kind: 'cover_letter', weight: 8, mustHave: true, enabled: true },
      { id: 'testing', label: 'Testing', kind: 'keywords', weight: 6, keywords: ['jest', 'vitest', 'testing library', 'playwright', 'cypress', 'unit test'], enabled: true },
      { id: 'tooling', label: 'Modern tooling', kind: 'keywords', weight: 8, keywords: ['vite', 'webpack', 'react router', 'tanstack', 'zustand', 'redux', 'figma', 'pwa'], enabled: true },
      { id: 'substance', label: 'Application substance', kind: 'min_length', weight: 0, minLength: 180, enabled: true },
    ],
  }
}

export function defaultBackendCriteria(): AtsCriteriaProfile {
  return {
    roleProfile: 'backend',
    label: 'Back-End Developer',
    strongMin: 75,
    viableMin: 55,
    rejectBelow: 40,
    criteria: [
      { id: 'node', label: 'Node.js / NestJS / Express', kind: 'keywords', weight: 22, mustHave: true, keywords: ['node.js', 'nodejs', 'node js', 'express', 'fastify', 'nestjs', 'nest.js'], enabled: true },
      { id: 'typescript', label: 'TypeScript', kind: 'keywords', weight: 12, keywords: ['typescript', ' ts '], enabled: true },
      { id: 'postgres', label: 'PostgreSQL / SQL', kind: 'keywords', weight: 16, mustHave: true, keywords: ['postgres', 'postgresql', 'sql', 'prisma', 'drizzle', 'typeorm'], enabled: true },
      { id: 'git', label: 'Git / GitHub', kind: 'keywords', weight: 12, mustHave: true, keywords: ['git', 'github'], enabled: true },
      { id: 'api', label: 'API / Auth', kind: 'keywords', weight: 10, keywords: ['api', 'rest', 'graphql', 'endpoint', 'auth', 'jwt', 'oauth'], enabled: true },
      { id: 'github_url', label: 'GitHub profile/link', kind: 'github', weight: 8, mustHave: true, enabled: true },
      { id: 'portfolio', label: 'Portfolio / repo evidence', kind: 'portfolio', weight: 6, enabled: true },
      { id: 'cover_letter', label: 'Cover letter', kind: 'cover_letter', weight: 8, mustHave: true, enabled: true },
      { id: 'testing', label: 'Testing / API docs', kind: 'keywords', weight: 6, keywords: ['jest', 'vitest', 'integration test', 'swagger', 'openapi'], enabled: true },
      { id: 'substance', label: 'Application substance', kind: 'min_length', weight: 0, minLength: 180, enabled: true },
    ],
  }
}

export function defaultDesignerCriteria(): AtsCriteriaProfile {
  return {
    roleProfile: 'designer',
    label: 'Graphic Designer',
    strongMin: 75,
    viableMin: 55,
    rejectBelow: 40,
    criteria: [
      { id: 'tools', label: 'Photoshop / Illustrator / Figma', kind: 'keywords', weight: 28, mustHave: true, keywords: ['photoshop', 'illustrator', 'figma', 'indesign', 'adobe'], enabled: true },
      { id: 'branding', label: 'Brand / layout / campaigns', kind: 'keywords', weight: 18, keywords: ['brand', 'typography', 'layout', 'visual identity', 'campaign', 'social media'], enabled: true },
      { id: 'portfolio', label: 'Portfolio', kind: 'portfolio', weight: 22, mustHave: true, enabled: true },
      { id: 'cover_letter', label: 'Cover letter', kind: 'cover_letter', weight: 10, mustHave: true, enabled: true },
      { id: 'collaboration', label: 'Briefs / feedback / deadlines', kind: 'keywords', weight: 8, keywords: ['brief', 'feedback', 'collaboration', 'deadline'], enabled: true },
      { id: 'substance', label: 'Application substance', kind: 'min_length', weight: 0, minLength: 160, enabled: true },
    ],
  }
}

export function defaultCriteriaForProfile(profile: AtsRoleProfile): AtsCriteriaProfile {
  if (profile === 'backend') return defaultBackendCriteria()
  if (profile === 'designer') return defaultDesignerCriteria()
  return defaultFrontendCriteria()
}

function extractName(raw: string, email?: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  for (const line of lines.slice(0, 12)) {
    const lower = line.toLowerCase()
    if (lower.startsWith('from:') || lower.startsWith('subject:') || lower.startsWith('to:')) continue
    if (EMAIL_RE.test(line) && line.length < 80) continue
    if (/^https?:\/\//i.test(line)) continue
    const cleaned = line
      .replace(/^name\s*[:\-]\s*/i, '')
      .replace(/^applicant\s*[:\-]\s*/i, '')
      .replace(/^dear\s+.*/i, '')
      .trim()
    if (
      cleaned.length >= 3 &&
      cleaned.length <= 60 &&
      /[A-Za-z]/.test(cleaned) &&
      cleaned.split(/\s+/).length <= 6 &&
      !/application|frontend|front-end|developer|cover letter|cv|resume/i.test(cleaned)
    ) {
      return cleaned
    }
  }

  if (email) {
    const local = email.split('@')[0] ?? 'Candidate'
    return local
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return 'Unknown candidate'
}

function extractUrls(raw: string): { githubUrl?: string; portfolioUrl?: string } {
  const github = raw.match(GITHUB_RE)?.[0]
  const portfolio =
    raw.match(PORTFOLIO_RE)?.find((u) => !/github\.com/i.test(u)) ??
    raw
      .match(GENERIC_URL_RE)
      ?.find(
        (u) =>
          !/github\.com|alison\.com|youtu\.be|google\.com|linkedin\.com\/in|mail\.google/i.test(u) &&
          /portfolio|project|demo|site|app|design|behance|dribbble/i.test(u),
      )
  return {
    githubUrl: github?.replace(/\/$/, ''),
    portfolioUrl: portfolio?.replace(/[.,;]+$/, ''),
  }
}

function hasCoverLetter(text: string): boolean {
  return includesAny(text, [
    'cover letter',
    'dear hiring',
    'dear afrivate',
    'i am writing',
    'i am excited',
    'why i want',
    'my experience',
    'please find attached',
  ])
}

function recommend(
  score: number,
  missingMustHaves: string[],
  profile: AtsCriteriaProfile,
): AtsRecommendation {
  if (missingMustHaves.length >= 2 || score < profile.rejectBelow) return 'reject'
  if (score >= profile.strongMin && missingMustHaves.length === 0) return 'strong'
  if (score >= profile.viableMin) return 'viable'
  return 'weak'
}

function scoreWithCriteria(
  text: string,
  rawLength: number,
  urls: { githubUrl?: string; portfolioUrl?: string },
  coverLetter: boolean,
  profile: AtsCriteriaProfile,
) {
  const matched: string[] = []
  const missing: string[] = []
  const breakdown: Record<string, number> = {}
  let totalWeight = 0
  let earned = 0

  for (const c of profile.criteria) {
    if (c.enabled === false) continue
    totalWeight += Math.max(0, c.weight)
    let points = 0
    let hit = false

    if (c.kind === 'keywords') {
      const terms = c.keywords ?? []
      hit = includesAny(text, terms)
      // Partial credit for multiple keyword hits on heavier criteria
      const hits = terms.reduce((n, t) => (text.includes(t.toLowerCase()) ? n + 1 : n), 0)
      points = hit ? c.weight : 0
      if (hit && c.weight >= 12 && hits >= 2) points = c.weight
    } else if (c.kind === 'github') {
      hit = !!urls.githubUrl || includesAny(text, ['github.com/'])
      points = hit ? c.weight : 0
    } else if (c.kind === 'portfolio') {
      hit =
        !!urls.portfolioUrl ||
        !!urls.githubUrl ||
        includesAny(text, ['portfolio', 'deployed', 'live demo', 'behance', 'dribbble'])
      points = hit ? c.weight : 0
    } else if (c.kind === 'cover_letter') {
      hit = coverLetter
      points = hit ? c.weight : 0
    } else if (c.kind === 'min_length') {
      const min = c.minLength ?? 180
      hit = rawLength >= min
      points = hit ? c.weight : 0
      if (!hit && c.mustHave !== false) {
        // soft penalty when substance is thin
        breakdown.red_flags = (breakdown.red_flags ?? 0) - 6
      }
    }

    breakdown[c.id] = points
    earned += points
    if (hit) matched.push(c.label)
    else if (c.mustHave) missing.push(c.label)
  }

  // Normalize to 0–100 based on enabled weights so editing weights stays intuitive
  const normalized = totalWeight > 0 ? (earned / totalWeight) * 100 : 0
  const withFlags = clamp(normalized + (breakdown.red_flags ?? 0))
  const mustMissing = missing.filter((label) =>
    profile.criteria.some((c) => c.label === label && c.mustHave && c.enabled !== false),
  )

  return {
    score: withFlags,
    breakdown,
    matched,
    missing,
    recommendation: recommend(withFlags, mustMissing, profile),
  }
}

export function detectAtsRoleProfile(roleTitle: string): AtsRoleProfile {
  const t = roleTitle.toLowerCase()
  if (/(front[\s-]?end|react|ui engineer)/.test(t)) return 'frontend'
  if (/(back[\s-]?end|node|nestjs|api engineer)/.test(t)) return 'backend'
  if (/(graphic|designer|visual|brand)/.test(t)) return 'designer'
  return 'general'
}

export function screenApplicationText(
  rawInput: string,
  roleProfile: AtsRoleProfile = 'frontend',
  criteria?: AtsCriteriaProfile,
): AtsScreenResult {
  const raw = rawInput.trim()
  const text = ` ${raw.toLowerCase()} `
  const email = raw.match(EMAIL_RE)?.[0]
  const urls = extractUrls(raw)
  const coverLetter = hasCoverLetter(text)
  const name = extractName(raw, email)
  const profile = criteria ?? defaultCriteriaForProfile(roleProfile === 'general' ? 'frontend' : roleProfile)

  const scored = scoreWithCriteria(text, raw.length, urls, coverLetter, profile)

  const summaryParts = [
    scored.recommendation === 'strong'
      ? 'Strong match for the role.'
      : scored.recommendation === 'viable'
        ? 'Viable candidate worth reviewing.'
        : scored.recommendation === 'weak'
          ? 'Weak match; review only if short on options.'
          : 'Likely reject based on missing core requirements.',
    scored.matched.length ? `Matched: ${scored.matched.join(', ')}.` : '',
    scored.missing.length ? `Missing: ${scored.missing.join(', ')}.` : '',
  ]

  return {
    name,
    email,
    githubUrl: urls.githubUrl,
    portfolioUrl: urls.portfolioUrl,
    coverLetter,
    score: scored.score,
    recommendation: scored.recommendation,
    breakdown: scored.breakdown,
    matched: scored.matched,
    missing: scored.missing,
    summary: summaryParts.filter(Boolean).join(' '),
  }
}

export function splitApplicationBatch(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []
  const byDivider = normalized
    .split(/\n\s*-{3,}\s*\n|\n(?=Subject:\s)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 40)
  if (byDivider.length > 1) return byDivider
  return [normalized]
}

export function recommendationTone(
  recommendation?: AtsRecommendation | null,
): 'success' | 'brand' | 'warning' | 'danger' | 'muted' {
  if (recommendation === 'strong') return 'success'
  if (recommendation === 'viable') return 'brand'
  if (recommendation === 'weak') return 'warning'
  if (recommendation === 'reject') return 'danger'
  return 'muted'
}

export function isViableCandidate(c: Pick<JobCandidate, 'recommendation' | 'score'>): boolean {
  if (c.recommendation === 'strong' || c.recommendation === 'viable') return true
  return (c.score ?? 0) >= 55
}

export function detectSourceFromEmail(from: string, subject: string): AtsSource {
  const hay = `${from} ${subject}`.toLowerCase()
  if (hay.includes('indeed')) return 'indeed'
  if (hay.includes('linkedin')) return 'linkedin'
  if (hay.includes('bebee')) return 'bebee'
  if (hay.includes('jobberman')) return 'jobberman'
  return 'gmail'
}
