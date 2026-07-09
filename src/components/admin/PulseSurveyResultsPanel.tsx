import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { computeEnps, computePulseEngagement, extractEnpsScores, isSurveyOpen } from '@/utils/hrSurvey'
import { SURVEY_TYPE_LABEL } from '@/pages/people/surveyShared'
import type { PulseQuestion } from '@/types/hr'

function questionAverages(
  questions: PulseQuestion[],
  responses: Array<{ answers: Record<string, string | number> }>,
): { id: string; text: string; average: number | null }[] {
  return questions
    .filter((q) => q.type === 'scale')
    .map((q) => {
      const nums = responses
        .map((r) => r.answers[q.id])
        .filter((v): v is number => typeof v === 'number')
      const average =
        nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null
      return { id: q.id, text: q.text, average }
    })
}

/** HR-only summary of pulse / eNPS / onboarding survey responses. */
export function PulseSurveyResultsPanel() {
  const { users } = useData()
  const { pulseSurveys, pulseResponses } = useHr()
  const headcount = users.filter((u) => u.active).length

  const summaries = useMemo(() => {
    return pulseSurveys
      .filter((s) => pulseResponses.some((r) => r.surveyId === s.id))
      .map((survey) => {
        const responses = pulseResponses.filter((r) => r.surveyId === survey.id)
        const isEnps = survey.surveyType === 'enps'
        const score = isEnps
          ? computeEnps(extractEnpsScores(responses))
          : computePulseEngagement(responses)
        return {
          survey,
          responses,
          responseCount: responses.length,
          completionRate: headcount > 0 ? Math.round((responses.length / headcount) * 100) : null,
          score,
          isEnps,
          questionAvgs: questionAverages(survey.questions, responses),
        }
      })
      .sort((a, b) => (a.survey.createdAt > b.survey.createdAt ? -1 : 1))
  }, [pulseSurveys, pulseResponses, headcount])

  if (summaries.length === 0) return null

  return (
    <Card padding="md">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">Survey results</h3>
      </div>
      <ul className="space-y-3 text-sm">
        {summaries.map(({ survey, responseCount, completionRate, score, isEnps, questionAvgs }) => (
          <li key={survey.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-fg">{survey.title}</p>
                <p className="text-xs text-muted">
                  {SURVEY_TYPE_LABEL[survey.surveyType]} · {responseCount} response
                  {responseCount === 1 ? '' : 's'}
                  {completionRate != null ? ` · ${completionRate}% of staff` : ''}
                  {survey.createdById
                    ? ` · created by ${users.find((u) => u.id === survey.createdById)?.name ?? 'HR'}`
                    : ''}
                </p>
              </div>
              <Badge tone={isSurveyOpen(survey) ? 'success' : 'muted'}>
                {isSurveyOpen(survey) ? 'Open' : 'Closed'}
              </Badge>
            </div>
            {score != null ? (
              <p className="mt-2 text-fg">
                {isEnps ? 'eNPS' : survey.surveyType === 'onboarding' ? 'Onboarding CSAT' : 'Avg. engagement'}:{' '}
                <span className="font-semibold">{isEnps ? score : score.toFixed(1)}</span>
                {isEnps ? '' : ' / 10'}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">No scored responses yet.</p>
            )}
            {questionAvgs.length > 0 ? (
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted">
                {questionAvgs.map((q) => (
                  <li key={q.id} className="flex justify-between gap-3">
                    <span className="min-w-0 flex-1">{q.text}</span>
                    <span className="shrink-0 font-medium text-fg">
                      {q.average != null ? q.average.toFixed(1) : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  )
}
