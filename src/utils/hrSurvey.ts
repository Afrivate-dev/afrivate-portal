import type { PulseSurvey } from '@/types/hr'

/** Whether a pulse/eNPS survey is open for responses (active + date window). */
export function isSurveyOpen(s: PulseSurvey, now = new Date()): boolean {
  if (!s.active) return false
  if (s.opensAt && new Date(s.opensAt) > now) return false
  if (s.closesAt && new Date(s.closesAt) < now) return false
  return true
}

/** eNPS from 0–10 scores: % promoters (9–10) minus % detractors (0–6). */
export function computeEnps(scores: number[]): number | null {
  if (scores.length === 0) return null
  const promoters = scores.filter((s) => s >= 9).length
  const detractors = scores.filter((s) => s <= 6).length
  return Math.round(((promoters - detractors) / scores.length) * 100)
}

/** Average pulse engagement from scale answers (excludes eNPS-style 0–10 NPS questions). */
export function computePulseEngagement(
  responses: Array<{ answers: Record<string, string | number> }>,
): number | null {
  const values: number[] = []
  for (const r of responses) {
    for (const v of Object.values(r.answers)) {
      if (typeof v === 'number') values.push(v)
    }
  }
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Extract primary 0–10 score from eNPS survey responses (first numeric answer per response). */
export function extractEnpsScores(
  responses: Array<{ answers: Record<string, string | number> }>,
): number[] {
  return responses
    .map((r) => {
      const nums = Object.values(r.answers).filter((v): v is number => typeof v === 'number')
      return nums[0]
    })
    .filter((n): n is number => n != null)
}
