import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useHr } from '@/context/HrContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { notifyError, notifySuccess } from '@/lib/notify'
import { isSurveyOpen } from '@/utils/hrSurvey'
import type { PulseQuestion, PulseSurvey } from '@/types/hr'

function ScaleInput({
  q,
  value,
  onChange,
}: {
  q: PulseQuestion
  value: number | undefined
  onChange: (v: number) => void
}) {
  const min = q.min ?? 1
  const max = q.max ?? 10
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-10 w-10 rounded-md text-sm font-semibold ring-focus ${
            value === n ? 'bg-accent text-white' : 'border border-border bg-surface hover:bg-surface-2'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function validateAnswers(questions: PulseQuestion[], answers: Record<string, string | number>): boolean {
  return questions
    .filter((q) => q.type === 'scale')
    .every((q) => typeof answers[q.id] === 'number')
}

function SurveyCard({
  survey,
  alreadyDone,
  onSubmit,
}: {
  survey: PulseSurvey
  alreadyDone: boolean
  onSubmit: (answers: Record<string, string | number>) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({})

  if (alreadyDone) {
    return (
      <Card padding="md">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {survey.surveyType === 'enps' ? 'eNPS' : 'Pulse'}
        </div>
        <h2 className="text-lg font-semibold text-fg">{survey.title}</h2>
        <p className="mt-2 text-sm text-muted">Thanks — you already submitted a response for this survey.</p>
      </Card>
    )
  }

  const submit = () => {
    if (!validateAnswers(survey.questions, answers)) {
      notifyError('Please answer all required questions before submitting.')
      return
    }
    onSubmit(answers)
    setAnswers({})
  }

  return (
    <Card padding="md">
      <div className="mb-1 flex items-center gap-2">
        <Badge tone={survey.surveyType === 'enps' ? 'brand' : 'muted'}>
          {survey.surveyType === 'enps' ? 'eNPS' : 'Pulse'}
        </Badge>
      </div>
      <h2 className="text-lg font-semibold text-fg">{survey.title}</h2>
      {survey.description ? <p className="mt-1 text-sm text-muted">{survey.description}</p> : null}
      <div className="mt-6 space-y-6">
        {survey.questions.map((q) => (
          <div key={q.id}>
            <p className="text-sm font-medium text-fg">{q.text}</p>
            {q.type === 'scale' ? (
              <div className="mt-2">
                <ScaleInput
                  q={q}
                  value={typeof answers[q.id] === 'number' ? (answers[q.id] as number) : undefined}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                />
              </div>
            ) : (
              <Textarea
                className="mt-2"
                rows={3}
                value={typeof answers[q.id] === 'string' ? answers[q.id] : ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Optional"
              />
            )}
          </div>
        ))}
        <Button onClick={submit}>Submit response</Button>
      </div>
    </Card>
  )
}

export function PeopleSurveysPage() {
  const { user } = useAuth()
  const { pulseSurveys, pulseResponses, submitPulseResponse } = useHr()

  const openSurveys = useMemo(
    () => pulseSurveys.filter((s) => isSurveyOpen(s)),
    [pulseSurveys],
  )

  const completedSurveyIds = useMemo(() => {
    if (!user) return new Set<string>()
    return new Set(
      pulseResponses.filter((r) => r.userId === user.id).map((r) => r.surveyId),
    )
  }, [pulseResponses, user])

  if (!user) return null

  const handleSubmit = (surveyId: string, answers: Record<string, string | number>) => {
    submitPulseResponse(surveyId, user.id, answers)
    notifySuccess('Thank you — your response was recorded.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Surveys"
        description="Monthly pulse checks and quarterly eNPS. Individual responses are visible to HR only. Managers see team-level aggregates on People overview; HR sees full results in the workspace admin dashboard."
      />

      {openSurveys.length > 0 ? (
        <div className="space-y-4">
          {openSurveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              alreadyDone={completedSurveyIds.has(survey.id)}
              onSubmit={(answers) => handleSubmit(survey.id, answers)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="No survey open right now"
          description="When HR launches a pulse or eNPS survey, it will appear here."
        />
      )}
    </div>
  )
}
