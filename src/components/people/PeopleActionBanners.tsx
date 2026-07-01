import { Link } from 'react-router-dom'
import { BarChart3, GraduationCap, AlertCircle, ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { isSurveyOpen } from '@/utils/hrSurvey'
import { hasBlockingLearningSubmission } from '@/utils/learningSubmission'

/** Action banners for open surveys, learning due, and policy acknowledgments. */
export function PeopleActionBanners() {
  const { user } = useAuth()
  const { documents } = useData()
  const {
    pulseSurveys,
    pulseResponses,
    learningAssignments,
    learningSubmissions,
    documentAcknowledgments,
  } = useHr()

  const pendingSurveys = useMemo(() => {
    if (!user) return []
    return pulseSurveys.filter(
      (s) =>
        isSurveyOpen(s) &&
        !pulseResponses.some((r) => r.surveyId === s.id && r.userId === user.id),
    )
  }, [pulseSurveys, pulseResponses, user])

  const myPendingLearning = useMemo(() => {
    if (!user) return 0
    return learningAssignments.filter(
      (a) =>
        a.active &&
        !hasBlockingLearningSubmission(a.id, user.id, learningSubmissions),
    ).length
  }, [learningAssignments, learningSubmissions, user])

  if (!user) return null

  const pendingAcks = documents.filter(
    (d) =>
      d.requiresAcknowledgment &&
      !documentAcknowledgments.some((a) => a.documentId === d.id && a.userId === user.id),
  )

  if (pendingSurveys.length === 0 && myPendingLearning <= 0 && pendingAcks.length === 0) return null

  return (
    <div className="space-y-2">
      {pendingSurveys.map((survey) => (
        <Link
          key={survey.id}
          to="/people/surveys"
          className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm ring-focus transition hover:bg-accent/10"
        >
          <BarChart3 className="h-5 w-5 shrink-0 text-accent" />
          <span className="min-w-0 flex-1 font-medium text-fg">
            {survey.surveyType === 'enps' ? 'eNPS survey open' : 'Pulse survey open'} — share your feedback
          </span>
          <ArrowRight className="h-4 w-4 text-muted" />
        </Link>
      ))}
      {myPendingLearning > 0 ? (
        <Link
          to="/people/learning"
          className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm ring-focus transition hover:bg-surface-2"
        >
          <GraduationCap className="h-5 w-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 text-fg">Course submission due — complete on Alison and submit proof</span>
          <ArrowRight className="h-4 w-4 text-muted" />
        </Link>
      ) : null}
      {pendingAcks.length > 0 ? (
        <Link
          to="/documents"
          className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm ring-focus"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
          <span className="min-w-0 flex-1 text-fg">
            {pendingAcks.length} policy document{pendingAcks.length === 1 ? '' : 's'} to acknowledge
          </span>
          <ArrowRight className="h-4 w-4 text-muted" />
        </Link>
      ) : null}
    </div>
  )
}
