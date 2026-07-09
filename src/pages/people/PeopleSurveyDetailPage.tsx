import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useHr } from '@/context/HrContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { notifyError, notifySuccess } from '@/lib/notify'
import { isSurveyOpen } from '@/utils/hrSurvey'
import type { PulseQuestion } from '@/types/hr'
import {
  SURVEY_TYPE_LABEL,
  surveyTypeBadgeTone,
  surveyWindowLabel,
  validateSurveyAnswers,
} from '@/pages/people/surveyShared'

function ScaleInput({
  q,
  value,
  onChange,
  disabled,
}: {
  q: PulseQuestion
  value: number | undefined
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const min = q.min ?? 1
  const max = q.max ?? 10
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`h-10 w-10 rounded-md text-sm font-semibold ring-focus disabled:cursor-not-allowed disabled:opacity-60 ${
            value === n ? 'bg-accent text-white' : 'border border-border bg-surface hover:bg-surface-2'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export function PeopleSurveyDetailPage() {
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { pulseSurveys, pulseResponses, submitPulseResponse } = useHr()
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitting, setSubmitting] = useState(false)

  const survey = useMemo(
    () => pulseSurveys.find((s) => s.id === surveyId),
    [pulseSurveys, surveyId],
  )

  const existingResponse = useMemo(() => {
    if (!user || !surveyId) return undefined
    return pulseResponses.find((r) => r.surveyId === surveyId && r.userId === user.id)
  }, [pulseResponses, surveyId, user])

  if (!user) return null
  if (!surveyId || !survey) return <Navigate to="/people/surveys" replace />

  const open = isSurveyOpen(survey)
  const alreadyDone = Boolean(existingResponse)
  const windowLabel = surveyWindowLabel(survey)

  const submit = async () => {
    if (!validateSurveyAnswers(survey.questions, answers)) {
      notifyError('Please answer all required questions before submitting.')
      return
    }
    setSubmitting(true)
    const ok = await submitPulseResponse(survey.id, user.id, answers)
    setSubmitting(false)
    if (!ok) {
      notifyError('Could not save your response. Please try again.')
      return
    }
    notifySuccess('Thank you — your response was recorded.')
    navigate('/people/surveys', { replace: true })
  }

  return (
    <div className="space-y-6">
      <Link
        to="/people/surveys"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to surveys
      </Link>

      <PageHeader
        title={survey.title}
        description={
          survey.description ??
          'Your answers are stored securely. HR uses aggregated results for the dashboard; managers see team-level summaries only.'
        }
      />

      <Card padding="md">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone={surveyTypeBadgeTone(survey.surveyType)}>
            {SURVEY_TYPE_LABEL[survey.surveyType]}
          </Badge>
          <Badge tone={open ? 'success' : 'muted'}>{open ? 'Open' : 'Closed'}</Badge>
          {windowLabel ? <span className="text-xs text-muted">{windowLabel}</span> : null}
        </div>

        {alreadyDone ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>You already submitted a response for this survey. Thank you.</span>
            </div>
            <div className="space-y-4">
              {survey.questions.map((q) => {
                const value = existingResponse?.answers[q.id]
                return (
                  <div key={q.id} className="rounded-md border border-border px-3 py-2.5">
                    <p className="text-sm font-medium text-fg">{q.text}</p>
                    <p className="mt-1 text-sm text-muted">
                      {value == null || value === ''
                        ? '—'
                        : typeof value === 'number'
                          ? String(value)
                          : value}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        ) : !open ? (
          <p className="text-sm text-muted">This survey is no longer accepting responses.</p>
        ) : (
          <div className="space-y-6">
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
            <Button onClick={() => void submit()} loading={submitting}>
              Submit response
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
