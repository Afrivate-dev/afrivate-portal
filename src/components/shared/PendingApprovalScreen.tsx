import { useEffect, useState } from 'react'
import { Clock, Send, LogOut, CheckCircle, Briefcase } from 'lucide-react'
import { ScreenLoader } from '@/components/shared/ScreenLoader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { fetchSignupDepartments } from '@/lib/departments'
import { fetchOwnAccessRequestStatus, submitAccessRequest, readPendingAccessDraft, clearPendingAccessDraft } from '@/lib/requestAccess'
import { firstName } from '@/utils/helpers'
import type { User } from '@/types'

export function PendingApprovalScreen({
  user,
  onSignOut,
}: {
  user: User
  onSignOut: () => void
}) {
  const { refreshUser, user: liveUser } = useAuth()
  const [message, setMessage] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [deptsLoading, setDeptsLoading] = useState(true)
  const [status, setStatus] = useState<'none' | 'pending' | 'acknowledged' | 'approved' | 'loading'>(() =>
    isSupabaseAuthEnabled() ? 'loading' : 'none',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchSignupDepartments().then((rows) => {
      if (!cancelled) {
        setDepartments(rows)
        setDeptsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseAuthEnabled()) return

    let cancelled = false

    const sync = async () => {
      await refreshUser()
      const s = await fetchOwnAccessRequestStatus()
      if (cancelled) return
      setStatus(s)
      if (s === 'approved') {
        setSuccess('Your access was approved — loading the portal…')
        return
      }

      if (s === 'none') {
        const draft = readPendingAccessDraft()
        if (draft && !cancelled) {
          setDepartmentId(draft.preferredDepartmentId)
          setJobTitle(draft.jobTitle)
          if (draft.message) setMessage(draft.message)
          setSubmitting(true)
          const result = await submitAccessRequest({
            message: draft.message,
            preferredDepartmentId: draft.preferredDepartmentId,
            jobTitle: draft.jobTitle,
          })
          if (cancelled) return
          setSubmitting(false)
          if (result.ok) {
            clearPendingAccessDraft()
            setStatus('pending')
            setSuccess('Access request sent. People & Culture will review your account shortly.')
          }
        }
      }
    }

    void sync()
    const id = window.setInterval(() => void sync(), 12_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [refreshUser])

  const onRequestAccess = async () => {
    setError(null)
    setSuccess(null)

    if (!departmentId) {
      setError('Please select your department.')
      return
    }
    if (!jobTitle.trim()) {
      setError('Please enter your job title or role.')
      return
    }

    setSubmitting(true)
    const result = await submitAccessRequest({
      message,
      preferredDepartmentId: departmentId,
      jobTitle: jobTitle.trim(),
    })
    setSubmitting(false)
    if (!result.ok) {
      if (result.error?.toLowerCase().includes('already active')) {
        await refreshUser()
        setSuccess('Your account is already active — loading the portal…')
        return
      }
      setError(result.error ?? 'Could not send request')
      return
    }
    setStatus('pending')
    setSuccess(
      result.alreadyRequested
        ? 'Your request is already with the team — an administrator will review it soon.'
        : 'Access request sent. People & Culture will review your account shortly.',
    )
  }

  if (liveUser?.active === true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <ScreenLoader message="Loading your portal…" />
      </div>
    )
  }

  const deptOptions = departments.map((d) => ({ value: d.id, label: d.name }))

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
        <Clock className="h-8 w-8 text-accent" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="font-heading text-2xl font-bold text-fg">Account pending approval</h1>
        <p className="text-sm text-muted">
          Hi {firstName(user.name)}, your account is waiting for an administrator to activate it.
          Request access below and we&apos;ll notify the team.
        </p>
      </div>

      {status === 'loading' ? (
        <ScreenLoader message="Checking your request status…" className="min-h-[8rem]" />
      ) : status === 'approved' || success?.includes('already active') || success?.includes('was approved') ? (
        <div className="flex max-w-md items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-left text-sm text-success">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success ?? 'Your access was approved — loading the portal…'}</span>
        </div>
      ) : status === 'pending' || status === 'acknowledged' ? (
        <div className="flex max-w-md flex-col gap-3">
          <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-left text-sm text-success">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {success ??
                'Your access request is with the team. You will receive an email once your account is approved.'}
            </span>
          </div>
          <p className="text-xs text-muted">This page checks for approval every few seconds — no need to resubmit.</p>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-3 text-left">
          {deptsLoading ? (
            <ScreenLoader message="Loading departments…" className="min-h-[4rem]" />
          ) : departments.length === 0 ? (
            <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              No departments are available yet. Contact your administrator.
            </p>
          ) : (
            <Select
              label="Department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={[{ value: '', label: 'Select your department…' }, ...deptOptions]}
              required
            />
          )}
          <Input
            label="Job title / role"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Software Engineer"
            leadingIcon={<Briefcase className="h-4 w-4" />}
            required
          />
          <Textarea
            label="Optional message for the admin team"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Anything else the admin team should know…"
            rows={3}
          />
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          {success ? (
            <p role="status" className="text-sm text-success">
              {success}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            loading={submitting}
            disabled={deptsLoading || departments.length === 0}
            onClick={() => void onRequestAccess()}
          >
            <Send className="h-4 w-4" />
            Request access
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2 ring-focus"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  )
}
