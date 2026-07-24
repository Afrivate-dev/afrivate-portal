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
  | 'resume_file'

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
  phone?: string
  linkedinUrl?: string
  location?: string
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
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?/g
const LINKEDIN_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/gi
const GITHUB_RE = /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/?(?:[A-Za-z0-9_.\-/]*)?/gi
const PORTFOLIO_RE =
  /https?:\/\/(?:www\.)?(?:[A-Za-z0-9-]+\.)+(?:vercel\.app|netlify\.app|pages\.dev|github\.io|web\.app|carrd\.co|behance\.net|dribbble\.com|figma\.com)[^\s)\]>"']*/gi
const GENERIC_URL_RE = /https?:\/\/[^\s)\]>"']+/gi
const FROM_HEADER_RE = /^From:\s*(.+)$/im
const SUBJECT_HEADER_RE = /^Subject:\s*(.+)$/im

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((t) => text.includes(t.toLowerCase()))
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function titleCaseName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const NAME_BLOCKLIST =
  /\b(javascript|typescript|python|java|react|nodejs|node\.?js|html|css|sql|sincerely|regards|faithfully|dear|hello|thanks|thank you|cover letter|resume|curriculum|vitae|application|frontend|front-end|backend|back-end|developer|engineer|designer|portfolio|github|linkedin|attachments|subject|best wishes|kind regards|yours|warm regards|looking forward|please find|cv|phone|email|mobile|whatsapp|lagos|nigeria|remote)\b/i

/** Strip rank markers / punctuation noise before treating text as a person name. */
export function normalizePersonNameCandidate(value: string): string {
  return value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^#?\d+[.)]?\s*/g, '')
    .replace(/[,.;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when a string looks like a real person name (not a skill, closing, or subject fragment). */
export function isPlausiblePersonName(value: string, opts?: { allowSingleWord?: boolean }): boolean {
  const cleaned = normalizePersonNameCandidate(value)
  if (cleaned.length < 3 || cleaned.length > 70) return false
  if (EMAIL_RE.test(cleaned) || /^https?:\/\//i.test(cleaned)) return false
  if (NAME_BLOCKLIST.test(cleaned)) return false
  if (/[#@/\\]/.test(cleaned) || /\d/.test(cleaned)) return false
  if (/^(yours?|sincerely|regards|faithfully|best|kind|warm)\b/i.test(cleaned)) return false

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 5) return false
  if (words.length === 1 && !opts?.allowSingleWord) return false

  if (!words.every((w) => /^[A-Za-z][A-Za-z'’.-]*$/.test(w))) return false
  // Reject single tech-looking tokens (e.g. JavaScript, TypeScript)
  if (words.length === 1 && words[0]!.length > 12) return false
  return true
}

/** Parse `Name <email@x.com>` or plain email from a From header / address line. */
export function parseFromAddress(from: string): { name?: string; email?: string } {
  const trimmed = from.trim()
  const angle = trimmed.match(/^(.*?)\s*<([^>]+)>$/)
  if (angle) {
    const email = angle[2]?.trim()
    const rawName = angle[1]?.replace(/^["']|["']$/g, '').trim()
    const name =
      rawName && !EMAIL_RE.test(rawName) && isPlausiblePersonName(rawName, { allowSingleWord: true })
        ? titleCaseName(normalizePersonNameCandidate(rawName))
        : undefined
    return {
      name,
      email: email && EMAIL_RE.test(email) ? email : undefined,
    }
  }
  if (EMAIL_RE.test(trimmed)) return { email: trimmed.match(EMAIL_RE)?.[0] }
  if (isPlausiblePersonName(trimmed, { allowSingleWord: true })) {
    return { name: titleCaseName(normalizePersonNameCandidate(trimmed)) }
  }
  return {}
}

function extractPhone(raw: string): string | undefined {
  const matches = raw.match(PHONE_RE) ?? []
  for (const m of matches) {
    const digits = m.replace(/\D/g, '')
    if (digits.length >= 10 && digits.length <= 15) return m.trim()
  }
  return undefined
}

function extractLinkedIn(raw: string): string | undefined {
  const hit = raw.match(LINKEDIN_RE)?.[0]
  return hit?.replace(/\/$/, '')
}

function extractLocation(raw: string): string | undefined {
  const labeled = raw.match(
    /(?:location|based in|city|reside(?:s|nt)? in|lives? in)\s*[:-]?\s*([A-Za-z][A-Za-z\s,'-]{2,40})/i,
  )
  if (labeled?.[1]) return labeled[1].trim().replace(/\s+/g, ' ')
  const cities =
    raw.match(
      /\b(Lagos|Abuja|Ibadan|Port Harcourt|Accra|Nairobi|Remote|Nigeria|Ghana|Kenya|South Africa)\b/i,
    )?.[0]
  return cities
}

function nameFromEmailLocal(email?: string): string | undefined {
  if (!email) return undefined
  const local = email.split('@')[0] ?? ''
  const words = local
    .replace(/\d+/g, ' ')
    .replace(/[._+-]+/g, ' ')
    .trim()
  if (!words || NAME_BLOCKLIST.test(words)) return undefined
  const titled = titleCaseName(normalizePersonNameCandidate(words))
  return isPlausiblePersonName(titled, { allowSingleWord: true }) ? titled : undefined
}

function extractName(raw: string, email?: string): string {
  // 1) Email From: display name (most reliable for Gmail sync)
  const fromLine = raw.match(FROM_HEADER_RE)?.[1]
  if (fromLine) {
    const parsed = parseFromAddress(fromLine)
    if (parsed.name && !/noreply|indeed|linkedin|no-reply|mailer/i.test(parsed.name)) {
      return parsed.name
    }
  }

  // 2) Subject: APPLICATION FOR … — Full Name
  const subject = raw.match(SUBJECT_HEADER_RE)?.[1] ?? ''
  const subjectName =
    subject.match(/[—–-]\s*([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})\s*$/)?.[1] ||
    subject.match(/:\s*([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})\s*$/)?.[1]
  if (subjectName && isPlausiblePersonName(subjectName)) {
    return titleCaseName(normalizePersonNameCandidate(subjectName))
  }

  // 3) Explicit Name / Full name labels
  const labeled = raw.match(
    /(?:^|\n)\s*(?:full\s*name|candidate\s*name|applicant\s*name|name)\s*[:-]\s*([A-Za-z][A-Za-z'’.-]+(?:\s+[A-Za-z][A-Za-z'’.-]+){0,3})/i,
  )
  if (labeled?.[1] && isPlausiblePersonName(labeled[1], { allowSingleWord: true })) {
    return titleCaseName(normalizePersonNameCandidate(labeled[1]))
  }

  // 4) Signature after letter closing (never use "Yours sincerely" itself)
  const signature = raw.match(
    /(?:yours?\s+sincerely|kind\s+regards|best\s+regards|warm\s+regards|respectfully)[,.]?\s*(?:\r?\n)+\s*([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})\s*(?:\r?\n|$)/i,
  )
  if (signature?.[1] && isPlausiblePersonName(signature[1])) {
    return titleCaseName(normalizePersonNameCandidate(signature[1]))
  }

  // 5) First plausible multi-word line near the top of the body
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  for (const line of lines.slice(0, 20)) {
    const lower = line.toLowerCase()
    if (lower.startsWith('from:') || lower.startsWith('subject:') || lower.startsWith('to:')) continue
    if (lower.startsWith('--- resume:')) continue
    if (/^(yours?|kind|best|warm|dear|hi|hello|thanks)\b/i.test(line)) continue
    if (EMAIL_RE.test(line) && line.length < 80) continue
    if (/^https?:\/\//i.test(line)) continue
    const cleaned = normalizePersonNameCandidate(
      line.replace(/^name\s*[:-]\s*/i, '').replace(/^applicant\s*[:-]\s*/i, ''),
    )
    if (isPlausiblePersonName(cleaned)) return titleCaseName(cleaned)
  }

  // 6) Fallback from email local-part
  return nameFromEmailLocal(email) ?? 'Unknown candidate'
}

export function defaultFrontendCriteria(): AtsCriteriaProfile {
  return {
    roleProfile: 'frontend',
    label: 'Front-End Developer',
    strongMin: 75,
    viableMin: 55,
    rejectBelow: 40,
    criteria: [
      { id: 'react', label: 'React', kind: 'keywords', weight: 20, mustHave: true, keywords: ['react', 'react.js', 'reactjs', 'next.js', 'nextjs'], enabled: true },
      { id: 'typescript', label: 'TypeScript', kind: 'keywords', weight: 12, keywords: ['typescript', ' ts ', '.tsx'], enabled: true },
      { id: 'javascript', label: 'JavaScript', kind: 'keywords', weight: 6, keywords: ['javascript', 'es6', 'es2015', 'vanilla js'], enabled: true },
      { id: 'html_css', label: 'HTML / CSS / Responsive', kind: 'keywords', weight: 7, keywords: ['html', 'css', 'tailwind', 'sass', 'scss', 'responsive'], enabled: true },
      { id: 'git', label: 'Git / GitHub', kind: 'keywords', weight: 10, mustHave: true, keywords: ['git', 'github', 'pull request', 'version control'], enabled: true },
      { id: 'github_url', label: 'GitHub profile/link', kind: 'github', weight: 8, mustHave: true, enabled: true },
      { id: 'portfolio', label: 'Portfolio / deployed work', kind: 'portfolio', weight: 10, mustHave: true, enabled: true },
      { id: 'cover_letter', label: 'Cover letter', kind: 'cover_letter', weight: 6, mustHave: true, enabled: true },
      { id: 'resume_file', label: 'Resume/CV scanned', kind: 'resume_file', weight: 10, mustHave: true, enabled: true },
      { id: 'testing', label: 'Testing', kind: 'keywords', weight: 5, keywords: ['jest', 'vitest', 'testing library', 'playwright', 'cypress', 'unit test'], enabled: true },
      { id: 'tooling', label: 'Modern tooling', kind: 'keywords', weight: 6, keywords: ['vite', 'webpack', 'react router', 'tanstack', 'zustand', 'redux', 'figma', 'pwa'], enabled: true },
      { id: 'experience', label: 'Experience signals (2+ years / senior)', kind: 'keywords', weight: 8, keywords: ['years of experience', '2 years', '3 years', '4 years', '5 years', 'senior', 'mid-level', 'yoe'], enabled: true },
      { id: 'remote_africa', label: 'Remote / Africa / Nigeria fit', kind: 'keywords', weight: 5, keywords: ['remote', 'nigeria', 'lagos', 'abuja', 'africa', 'west africa', 'gmt+1', 'wat'], enabled: true },
      { id: 'communication', label: 'Communication / teamwork', kind: 'keywords', weight: 4, keywords: ['collaboration', 'team', 'communication', 'stakeholder', 'agile', 'scrum'], enabled: true },
      { id: 'accessibility', label: 'Accessibility / quality', kind: 'keywords', weight: 3, keywords: ['accessibility', 'a11y', 'wcag', 'performance', 'seo'], enabled: true },
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
      { id: 'node', label: 'Node.js / NestJS / Express', kind: 'keywords', weight: 20, mustHave: true, keywords: ['node.js', 'nodejs', 'node js', 'express', 'fastify', 'nestjs', 'nest.js'], enabled: true },
      { id: 'typescript', label: 'TypeScript', kind: 'keywords', weight: 10, keywords: ['typescript', ' ts '], enabled: true },
      { id: 'postgres', label: 'PostgreSQL / SQL', kind: 'keywords', weight: 14, mustHave: true, keywords: ['postgres', 'postgresql', 'sql', 'prisma', 'drizzle', 'typeorm'], enabled: true },
      { id: 'git', label: 'Git / GitHub', kind: 'keywords', weight: 10, mustHave: true, keywords: ['git', 'github'], enabled: true },
      { id: 'api', label: 'API / Auth', kind: 'keywords', weight: 10, keywords: ['api', 'rest', 'graphql', 'endpoint', 'auth', 'jwt', 'oauth'], enabled: true },
      { id: 'github_url', label: 'GitHub profile/link', kind: 'github', weight: 8, mustHave: true, enabled: true },
      { id: 'portfolio', label: 'Portfolio / repo evidence', kind: 'portfolio', weight: 6, enabled: true },
      { id: 'cover_letter', label: 'Cover letter', kind: 'cover_letter', weight: 6, mustHave: true, enabled: true },
      { id: 'resume_file', label: 'Resume/CV scanned', kind: 'resume_file', weight: 10, mustHave: true, enabled: true },
      { id: 'testing', label: 'Testing / API docs', kind: 'keywords', weight: 5, keywords: ['jest', 'vitest', 'integration test', 'swagger', 'openapi'], enabled: true },
      { id: 'experience', label: 'Experience signals (2+ years / senior)', kind: 'keywords', weight: 8, keywords: ['years of experience', '2 years', '3 years', '4 years', '5 years', 'senior', 'mid-level'], enabled: true },
      { id: 'remote_africa', label: 'Remote / Africa / Nigeria fit', kind: 'keywords', weight: 5, keywords: ['remote', 'nigeria', 'lagos', 'abuja', 'africa', 'west africa'], enabled: true },
      { id: 'cloud', label: 'Cloud / DevOps basics', kind: 'keywords', weight: 4, keywords: ['docker', 'aws', 'gcp', 'azure', 'ci/cd', 'linux'], enabled: true },
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
      { id: 'tools', label: 'Photoshop / Illustrator / Figma', kind: 'keywords', weight: 24, mustHave: true, keywords: ['photoshop', 'illustrator', 'figma', 'indesign', 'adobe'], enabled: true },
      { id: 'branding', label: 'Brand / layout / campaigns', kind: 'keywords', weight: 16, keywords: ['brand', 'typography', 'layout', 'visual identity', 'campaign', 'social media'], enabled: true },
      { id: 'portfolio', label: 'Portfolio', kind: 'portfolio', weight: 20, mustHave: true, enabled: true },
      { id: 'cover_letter', label: 'Cover letter', kind: 'cover_letter', weight: 8, mustHave: true, enabled: true },
      { id: 'resume_file', label: 'Resume/CV / portfolio PDF scanned', kind: 'resume_file', weight: 12, mustHave: true, enabled: true },
      { id: 'collaboration', label: 'Briefs / feedback / deadlines', kind: 'keywords', weight: 6, keywords: ['brief', 'feedback', 'collaboration', 'deadline'], enabled: true },
      { id: 'experience', label: 'Experience signals', kind: 'keywords', weight: 6, keywords: ['years of experience', '2 years', '3 years', 'senior', 'campaigns'], enabled: true },
      { id: 'remote_africa', label: 'Remote / Africa / Nigeria fit', kind: 'keywords', weight: 4, keywords: ['remote', 'nigeria', 'lagos', 'abuja', 'africa'], enabled: true },
      { id: 'substance', label: 'Application substance', kind: 'min_length', weight: 0, minLength: 160, enabled: true },
    ],
  }
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

function hasResumeFileText(text: string): boolean {
  // Marker inserted by Gmail sync after successful PDF/DOCX/image text extraction
  return /---\s*resume:/i.test(text)
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
    } else if (c.kind === 'resume_file') {
      hit = hasResumeFileText(text)
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

export interface AtsRoleDefinition {
  profile: Exclude<AtsRoleProfile, 'general'>
  title: string
  department: string
}

/** Standard hiring roles — applications are sorted into these sections. */
export const ATS_STANDARD_ROLES: AtsRoleDefinition[] = [
  { profile: 'frontend', title: 'Front-End Developer', department: 'Technology & Product' },
  { profile: 'backend', title: 'Back-End Developer', department: 'Technology & Product' },
  { profile: 'designer', title: 'Graphic Designer', department: 'Creative' },
]

export function labelForAtsRoleProfile(profile: AtsRoleProfile): string {
  if (profile === 'general') return 'Unassigned / Other'
  return ATS_STANDARD_ROLES.find((r) => r.profile === profile)?.title ?? profile
}

/**
 * Detect which open role an application belongs to from subject + body/CV text.
 * Prefers explicit "APPLICATION FOR …" subjects from AfriVate job posts.
 */
export function detectAtsRoleFromApplication(text: string): AtsRoleProfile {
  const subject = text.match(/^Subject:\s*(.+)$/im)?.[1]?.toLowerCase() ?? ''
  const head = `${subject}\n${text.slice(0, 2500).toLowerCase()}`

  if (
    /application for\s+(the\s+)?front|front[\s-]?end\s+developer|frontend\s+developer|react\s+developer|ui\s+engineer/.test(
      head,
    )
  ) {
    return 'frontend'
  }
  if (
    /application for\s+(the\s+)?back|back[\s-]?end\s+developer|backend\s+developer|nestjs|node\.?js\s+developer|api\s+engineer/.test(
      head,
    )
  ) {
    return 'backend'
  }
  if (
    /application for\s+(the\s+)?graphic|graphic\s+designer|visual\s+designer|brand\s+designer/.test(head)
  ) {
    return 'designer'
  }

  const fe = (head.match(/\breact\b|\bnext\.?js\b|\btailwind\b|\bfrontend\b|\bfront-end\b|\btsx\b/g) || []).length
  const be = (head.match(/\bnestjs\b|\bexpress\b|\bpostgres\b|\bbackend\b|\bback-end\b|\bnode\.?js\b|\bprisma\b/g) || [])
    .length
  const de = (head.match(/\bphotoshop\b|\billustrator\b|\bfigma\b|\bbehance\b|\bdribbble\b|\bgraphic\b|\bindesign\b/g) || [])
    .length

  if (fe === 0 && be === 0 && de === 0) return 'general'
  if (fe >= be && fe >= de) return 'frontend'
  if (be >= fe && be >= de) return 'backend'
  return 'designer'
}

export function defaultCriteriaForProfile(profile: AtsRoleProfile): AtsCriteriaProfile {
  if (profile === 'backend') return defaultBackendCriteria()
  if (profile === 'designer') return defaultDesignerCriteria()
  return defaultFrontendCriteria()
}

export function screenApplicationText(
  rawInput: string,
  roleProfile: AtsRoleProfile = 'frontend',
  criteria?: AtsCriteriaProfile,
): AtsScreenResult {
  const raw = rawInput.trim()
  const text = ` ${raw.toLowerCase()} `
  const fromParsed = parseFromAddress(raw.match(FROM_HEADER_RE)?.[1] ?? '')
  const email = fromParsed.email || raw.match(EMAIL_RE)?.[0]
  const urls = extractUrls(raw)
  const coverLetter = hasCoverLetter(text)
  const name = extractName(raw, email)
  const phone = extractPhone(raw)
  const linkedinUrl = extractLinkedIn(raw)
  const location = extractLocation(raw)
  const profile = criteria ?? defaultCriteriaForProfile(roleProfile === 'general' ? 'frontend' : roleProfile)

  const scored = scoreWithCriteria(text, raw.length, urls, coverLetter, profile)

  const identityBits = [
    name !== 'Unknown candidate' ? name : null,
    email,
    phone,
    location,
  ].filter(Boolean)

  const summaryParts = [
    identityBits.length ? `Applicant: ${identityBits.join(' · ')}.` : '',
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
    phone,
    linkedinUrl,
    location,
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

/** Short, plain-language label for a recommendation. */
export function recommendationLabel(recommendation?: AtsRecommendation | null): string {
  if (recommendation === 'strong') return 'Strong fit'
  if (recommendation === 'viable') return 'Good fit'
  if (recommendation === 'weak') return 'Weak fit'
  if (recommendation === 'reject') return 'Not a fit'
  return 'Not scored'
}

export function isViableCandidate(c: Pick<JobCandidate, 'recommendation' | 'score'>): boolean {
  if (c.recommendation === 'strong' || c.recommendation === 'viable') return true
  return (c.score ?? 0) >= 55
}

/** Human-readable explanation for why someone sits at a Top-N rank. */
export function explainCandidateRanking(
  candidate: JobCandidate,
  rank: number,
  rankedPeers: JobCandidate[],
  criteria: AtsCriteriaProfile,
): string {
  const parts: string[] = []
  const score = candidate.score ?? 0
  const fit =
    candidate.recommendation === 'strong'
      ? 'strong fit'
      : candidate.recommendation === 'viable'
        ? 'good fit'
        : candidate.recommendation === 'weak'
          ? 'weak fit'
          : candidate.recommendation === 'reject'
            ? 'poor fit'
            : 'not yet rated'

  parts.push(`Ranked #${rank} with a score of ${score} out of 100 (${fit}).`)

  if (rank === 1) {
    parts.push('Best overall match for this role based on your scoring rules.')
  }

  const signals = Object.entries(candidate.scoreBreakdown ?? {})
    .filter(([key, pts]) => key !== 'red_flags' && pts > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, pts]) => {
      const label = criteria.criteria.find((c) => c.id === id)?.label ?? id
      return `${label} (+${pts})`
    })

  if (signals.length) {
    parts.push(`Stood out for: ${signals.join(', ')}.`)
  }

  const next = rankedPeers[rank]
  if (next && next.score != null) {
    const gap = score - next.score
    if (gap > 0) {
      parts.push(`${gap} point${gap === 1 ? '' : 's'} ahead of ${next.name} (#${rank + 1}).`)
    } else if (gap === 0) {
      parts.push(`Same score as ${next.name} (#${rank + 1}).`)
    }
  }

  const prev = rank > 1 ? rankedPeers[rank - 2] : undefined
  if (prev && prev.score != null && rank > 1) {
    const gap = prev.score - score
    if (gap > 0) {
      parts.push(`${gap} point${gap === 1 ? '' : 's'} behind ${prev.name} (#${rank - 1}).`)
    }
  }

  return parts.join(' ')
}

export function detectSourceFromEmail(from: string, subject: string): AtsSource {
  const hay = `${from} ${subject}`.toLowerCase()
  if (hay.includes('indeed')) return 'indeed'
  if (hay.includes('linkedin')) return 'linkedin'
  if (hay.includes('bebee')) return 'bebee'
  if (hay.includes('jobberman')) return 'jobberman'
  return 'gmail'
}
