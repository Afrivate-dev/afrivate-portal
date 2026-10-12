import { useMemo } from 'react'
import { ExternalLink, GraduationCap, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useHr } from '@/context/HrContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { fmtDate, isHR } from '@/utils/helpers'
import { findLearningSubmission } from '@/utils/learningSubmission'
import { LearningReviewPanel } from '@/components/admin/LearningReviewPanel'

const HR_LEARNING_EMAIL = 'afrivatehr@gmail.com'

export function PeopleLearningPage() {
  const { user } = useAuth()
  const { learningAssignments, learningSubmissions } = useHr()

  const active = useMemo(() => learningAssignments.filter((a) => a.active), [learningAssignments])
  const current = active[0]

  const mySubs = useMemo(
    () => (user ? learningSubmissions.filter((s) => s.userId === user.id) : []),
    [learningSubmissions, user],
  )

  const currentSubmission = useMemo(
    () => (user && current ? findLearningSubmission(current.id, user.id, learningSubmissions) : undefined),
    [user, current, learningSubmissions],
  )

  if (!user) return null

  const reportSubject = current ? `L&D Report: ${current.title}` : 'L&D Report'
  const mailto = `mailto:${HR_LEARNING_EMAIL}?subject=${encodeURIComponent(reportSubject)}`

  return (
    <div className="av-contain space-y-6">
      <PageHeader
        title="Learning"
        description="Open your assigned course, then email a one-page report to Human Resources by the due date."
      />

      {current ? (
        <Card padding="md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Badge tone="brand">{current.monthLabel ?? 'Current course'}</Badge>
              <h2 className="mt-2 text-lg font-semibold text-fg">{current.title}</h2>
              {current.description ? (
                <p className="mt-1 text-sm text-muted">{current.description}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {current.platform ? <span>Platform: {current.platform}</span> : null}
                {current.durationMinutes ? (
                  <span>
                    Duration:{' '}
                    {current.durationMinutes >= 60
                      ? `~${Math.round(current.durationMinutes / 60)}h`
                      : `${current.durationMinutes} min`}
                  </span>
                ) : null}
                {current.dueDate ? <span>Due {fmtDate(current.dueDate)}</span> : null}
              </div>
            </div>
            {current.courseUrl || current.alisonUrl ? (
              <a
                href={current.courseUrl || current.alisonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                {current.platform ? `Open on ${current.platform}` : 'Open course'}{' '}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>

          <div className="mt-6 space-y-3 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-fg">Email your report</h3>
            <p className="text-sm text-muted">
              When you finish, email a one-page report to{' '}
              <a className="font-medium text-accent hover:underline" href={mailto}>
                {HR_LEARNING_EMAIL}
              </a>
              {current.dueDate ? ` by ${fmtDate(current.dueDate)}` : ' by the due date'}.
              Include what you learned and one way you will use it at work.
            </p>
            {currentSubmission ? (
              <p className="text-xs text-muted">
                An earlier in-portal note is on file ({currentSubmission.status}). New completions are sent by email.
              </p>
            ) : null}
            <a
              href={mailto}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Mail className="h-4 w-4" /> Email your report
            </a>
          </div>
        </Card>
      ) : (
        <EmptyState icon={GraduationCap} title="No course assigned" description="Your team will post the next course here." />
      )}

      {mySubs.length > 0 ? (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-fg">Your submissions</h3>
          <ul className="mt-3 divide-y divide-border">
            {mySubs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-medium text-fg">{s.courseName}</span>
                <Badge tone={s.status === 'approved' ? 'success' : s.status === 'rejected' ? 'danger' : 'warning'}>
                  {s.status}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {isHR(user) ? <LearningReviewPanel /> : null}
    </div>
  )
}
