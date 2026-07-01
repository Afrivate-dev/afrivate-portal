import { useMemo, useState } from 'react'
import { ExternalLink, GraduationCap, Upload } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useHr } from '@/context/HrContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { GoogleDrivePickerButton } from '@/components/shared/GoogleDrivePickerButton'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import { uploadPortalFile } from '@/lib/supabase/fileStorage'
import { notifyError, notifySuccess } from '@/lib/notify'
import { fmtDate, isHR } from '@/utils/helpers'
import { hasBlockingLearningSubmission, findLearningSubmission } from '@/utils/learningSubmission'
import { LearningReviewPanel } from '@/components/admin/LearningReviewPanel'

export function PeopleLearningPage() {
  const { user } = useAuth()
  const { learningAssignments, learningSubmissions, submitLearning } = useHr()
  const [courseName, setCourseName] = useState('')
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10))
  const [certFile, setCertFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

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

  const submissionBlocked = useMemo(
    () => (user && current ? hasBlockingLearningSubmission(current.id, user.id, learningSubmissions) : false),
    [user, current, learningSubmissions],
  )

  if (!user) return null

  const submit = async () => {
    if (!current || !courseName.trim() || submissionBlocked) return
    setBusy(true)
    let certificatePath: string | undefined
    if (certFile) {
      if (!isSupabaseAuthEnabled() || !supabase) {
        notifyError('Certificate upload requires Supabase storage. Submit without a file or connect storage.')
        setBusy(false)
        return
      }
      const uploaded = await uploadPortalFile(supabase, 'media', certFile, user.id)
      if ('error' in uploaded) {
        notifyError(uploaded.error)
        setBusy(false)
        return
      }
      certificatePath = uploaded.path
    }
    const ok = submitLearning({
      assignmentId: current.id,
      userId: user.id,
      courseName: courseName.trim(),
      completedAt,
      certificatePath,
    })
    if (!ok) {
      notifyError('You already have a submission under review for this course.')
      setBusy(false)
      return
    }
    notifySuccess(
      currentSubmission?.status === 'rejected'
        ? 'Resubmission sent for HR review.'
        : 'Submission sent for HR review.',
    )
    setCourseName('')
    setCertFile(null)
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning"
        description="Complete courses on Alison, then submit your certificate here."
      />

      {current ? (
        <Card padding="md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="brand">{current.monthLabel ?? 'Current course'}</Badge>
              <h2 className="mt-2 text-lg font-semibold text-fg">{current.title}</h2>
              {current.description ? <p className="mt-1 text-sm text-muted">{current.description}</p> : null}
              {current.dueDate ? (
                <p className="mt-2 text-xs text-muted">Due {fmtDate(current.dueDate)}</p>
              ) : null}
            </div>
            <a
              href={current.alisonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Open on Alison <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {submissionBlocked ? (
            <div className="mt-6 border-t border-border pt-6">
              <p className="text-sm text-muted">
                {currentSubmission?.status === 'approved'
                  ? 'This course is marked complete — no further submission needed.'
                  : 'Your submission is awaiting HR review. You will be notified when it is approved.'}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-fg">
                {currentSubmission?.status === 'rejected' ? 'Resubmit completion' : 'Submit completion'}
              </h3>
              {currentSubmission?.status === 'rejected' ? (
                <p className="text-xs text-muted">
                  Your previous submission was not approved. Update your details and try again.
                </p>
              ) : null}
              <Input label="Course name" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="As shown on Alison" />
              <Input label="Completed on" type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
              <p className="text-xs text-muted">Certificate optional — attach PDF or image if you have one.</p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-2">
                  <Upload className="h-4 w-4" />
                  {certFile ? certFile.name : 'Upload certificate'}
                  <input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} />
                </label>
                <GoogleDrivePickerButton
                  label="From Google Drive"
                  onPicked={(file) => setCertFile(file)}
                />
              </div>
              <Button onClick={() => void submit()} loading={busy} disabled={!courseName.trim()}>
                {currentSubmission?.status === 'rejected' ? 'Resubmit for review' : 'Submit for review'}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <EmptyState icon={GraduationCap} title="No course assigned" description="HR will post the monthly Alison course here." />
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
