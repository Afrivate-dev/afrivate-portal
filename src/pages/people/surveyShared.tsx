import { fmtDate } from '@/utils/helpers'
import type { PulseQuestion, PulseSurvey, PulseSurveyType } from '@/types/hr'

export const SURVEY_TYPE_LABEL: Record<PulseSurveyType, string> = {
  pulse: 'Pulse',
  enps: 'eNPS',
  onboarding: 'Onboarding',
}

export function surveyTypeBadgeTone(
  type: PulseSurveyType,
): 'brand' | 'info' | 'muted' {
  if (type === 'enps') return 'brand'
  if (type === 'onboarding') return 'info'
  return 'muted'
}

export function surveyWindowLabel(survey: PulseSurvey): string | null {
  if (survey.opensAt && survey.closesAt) {
    return `${fmtDate(survey.opensAt)} – ${fmtDate(survey.closesAt)}`
  }
  if (survey.closesAt) return `Closes ${fmtDate(survey.closesAt)}`
  if (survey.opensAt) return `Opens ${fmtDate(survey.opensAt)}`
  return null
}

export function validateSurveyAnswers(
  questions: PulseQuestion[],
  answers: Record<string, string | number>,
): boolean {
  return questions
    .filter((q) => q.type === 'scale')
    .every((q) => typeof answers[q.id] === 'number')
}
