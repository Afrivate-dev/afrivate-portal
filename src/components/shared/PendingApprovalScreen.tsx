import { useEffect, useState } from 'react'
import { Clock, Send, LogOut, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { fetchOwnAccessRequestStatus, submitAccessRequest } from '@/lib/requestAccess'
import { firstName } from '@/utils/helpers'
import type { User } from '@/types'

export function PendingApprovalScreen({
  user,
  onSignOut,
}: {
  user: User
  onSignOut: () => void
}) {
  const { refreshUser } = useAuth()
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'none' | 'pending' | 'acknowledged' | 'loading'>(() =>
    isSupabaseAuthEnabled() ? 'loading' : 'none',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseAuthEnabled()) return
    void refreshUser()
    void fetchOwnAccessRequestStatus().then((s) => setStatus(s))
  }, [refreshUser])

  const onRequestAccess = async () => {
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    const result = await submitAccessRequest(message)
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

      {status === 'pending' || status === 'acknowledged' ? (
        <div className="flex max-w-md items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-left text-sm text-success">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {success ??
              'Your access request is with the team. You will receive an email once your account is approved.'}
          </span>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-3 text-left">
          <Textarea
            label="Optional message for the admin team"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. I joined the Engineering team this week…"
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
