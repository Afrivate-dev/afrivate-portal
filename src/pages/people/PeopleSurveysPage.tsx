import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useHr } from '@/context/HrContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { isSurveyOpen } from '@/utils/hrSurvey'
import {
  SURVEY_TYPE_LABEL,
  surveyTypeBadgeTone,
  surveyWindowLabel,
} from '@/pages/people/surveyShared'

export function PeopleSurveysPage() {
  const { user } = useAuth()
  const { pulseSurveys, pulseResponses } = useHr()

  const openSurveys = useMemo(
    () =>
      pulseSurveys
        .filter((s) => isSurveyOpen(s))
        .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
    [pulseSurveys],
  )

  const completedSurveyIds = useMemo(() => {
    if (!user) return new Set<string>()
    return new Set(
      pulseResponses.filter((r) => r.userId === user.id).map((r) => r.surveyId),
    )
  }, [pulseResponses, user])

  if (!user) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Surveys"
        description="Monthly pulse checks, quarterly eNPS, and onboarding feedback. Open a survey to respond on its own page — each submission is stored individually and feeds HR dashboard metrics."
      />

      {openSurveys.length > 0 ? (
        <ul className="space-y-3">
          {openSurveys.map((survey) => {
            const done = completedSurveyIds.has(survey.id)
            const windowLabel = surveyWindowLabel(survey)
            return (
              <li key={survey.id}>
                <Card padding="md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone={surveyTypeBadgeTone(survey.surveyType)}>
                          {SURVEY_TYPE_LABEL[survey.surveyType]}
                        </Badge>
                        {done ? (
                          <Badge tone="success">Completed</Badge>
                        ) : (
                          <Badge tone="warning">Awaiting your response</Badge>
                        )}
                      </div>
                      <h2 className="text-lg font-semibold text-fg">{survey.title}</h2>
                      {survey.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{survey.description}</p>
                      ) : null}
                      {windowLabel ? (
                        <p className="mt-2 text-xs text-muted">{windowLabel}</p>
                      ) : null}
                    </div>
                    <Link
                      to={`/people/surveys/${survey.id}`}
                      className={`inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium ring-focus transition-all sm:w-auto ${
                        done
                          ? 'border border-border bg-surface-2 text-fg hover:bg-surface-3'
                          : 'bg-accent text-white shadow-sm hover:bg-accent-hover'
                      }`}
                    >
                      {done ? 'View submission' : 'Take survey'}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="No survey open right now"
          description="When HR launches a pulse, eNPS, or onboarding survey, it will appear here."
        />
      )}
    </div>
  )
}
