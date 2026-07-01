import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { computeEnps, computePulseEngagement, extractEnpsScores, isSurveyOpen } from '@/utils/hrSurvey'

/** HR-only summary of pulse / eNPS survey responses. */
export function PulseSurveyResultsPanel() {
  const { users } = useData()
  const { pulseSurveys, pulseResponses } = useHr()

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
          responseCount: responses.length,
          score,
          isEnps,
        }
      })
      .sort((a, b) => (a.survey.createdAt > b.survey.createdAt ? -1 : 1))
  }, [pulseSurveys, pulseResponses])

  if (summaries.length === 0) return null

  return (
    <Card padding="md">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">Survey results</h3>
      </div>
      <ul className="space-y-3 text-sm">
        {summaries.map(({ survey, responseCount, score, isEnps }) => (
          <li key={survey.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-fg">{survey.title}</p>
                <p className="text-xs text-muted">
                  {responseCount} response{responseCount === 1 ? '' : 's'}
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
                {isEnps ? 'eNPS' : 'Avg. engagement'}:{' '}
                <span className="font-semibold">{isEnps ? score : score.toFixed(1)}</span>
                {isEnps ? '' : ' / 10'}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">No scored responses yet.</p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
