import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowLeft, Send, CheckCircle, User, Briefcase } from 'lucide-react'
import { ScreenLoader } from '@/components/shared/ScreenLoader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/useConfirm'
import { fetchSignupDepartments } from '@/lib/departments'
import { submitAccessRequest, savePendingAccessDraft, clearPendingAccessDraft } from '@/lib/requestAccess'
import { pages, confirms } from '@/content/copy'
import { validatePortalPassword, passwordPolicyHint } from '@/utils/passwordPolicy'

export function RequestAccessPage() {
  const { user, register, authReady } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [message, setMessage] = useState('')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [deptsLoading, setDeptsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  if (!authReady) {
    return <ScreenLoader message="Checking your session…" className="min-h-[40vh]" />
  }

  if (user?.active === true) return <Navigate to="/" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const pwError = validatePortalPassword(password)
    if (pwError) {
      setError(pwError)
      return
    }
    if (!departmentId) {
      setError('Please select your department.')
      return
    }
    if (!jobTitle.trim()) {
      setError('Please enter your job title or role.')
      return
    }

    const ok = await confirm({
      title: confirms.requestAccessTitle,
      message: confirms.requestAccess,
      confirmLabel: pages.requestAccess.submitLabel,
    })
    if (!ok) return

    setLoading(true)

    const created = await register(email, password, name)
    if (!created.ok) {
      setLoading(false)
      setError(created.error ?? 'Could not create your account.')
      return
    }

    if (created.needsEmailConfirmation) {
      savePendingAccessDraft({
        preferredDepartmentId: departmentId,
        jobTitle: jobTitle.trim(),
        message: message.trim() || undefined,
      })
      setLoading(false)
      setSuccess(pages.requestAccess.confirmEmailSuccess)
      return
    }

    const result = await submitAccessRequest({
      message,
      preferredDepartmentId: departmentId,
      jobTitle: jobTitle.trim(),
    })
    setLoading(false)

    if (!result.ok) {
      setError(result.error ?? 'Account created, but we could not send your request. Sign in and try again from the pending screen.')
      return
    }

    clearPendingAccessDraft()
    setSuccess(
      result.alreadyRequested
        ? 'Account created. Your request is already with the team — People & Culture will review it soon.'
        : 'Account created and request sent. People & Culture will email you when your access is approved.',
    )
    navigate('/', { replace: true })
  }

  const deptOptions = departments.map((d) => ({ value: d.id, label: d.name }))

  return (
    <Card padding="lg" className="w-full max-w-md">
      <Link
        to="/login"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-fg">{pages.requestAccess.title}</h1>
        <p className="mt-2 text-sm text-muted">{pages.requestAccess.subtitle}</p>
      </div>

      {success ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
          <p className="text-center text-sm text-muted">
            Already approved?{' '}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <Input
            type="text"
            name="name"
            label={pages.requestAccess.nameLabel}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={pages.requestAccess.namePlaceholder}
            autoComplete="name"
            leadingIcon={<User className="h-4 w-4" />}
            required
          />
          <Input
            type="email"
            name="email"
            label={pages.login.emailLabel}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            autoComplete="email"
            leadingIcon={<Mail className="h-4 w-4" />}
            required
          />
          <p className="-mt-2 text-xs text-muted">{pages.requestAccess.emailHint}</p>
          <Input
            type="password"
            name="password"
            label={pages.login.passwordLabel}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            leadingIcon={<Lock className="h-4 w-4" />}
            required
          />
          <p className="-mt-2 text-xs text-muted">{passwordPolicyHint}</p>

          {deptsLoading ? (
            <ScreenLoader message="Loading departments…" className="min-h-[4rem]" />
          ) : departments.length === 0 ? (
            <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              No departments are set up yet. Ask your administrator to create departments before signing up.
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
            placeholder="e.g. Software Engineer, Marketing Associate"
            leadingIcon={<Briefcase className="h-4 w-4" />}
            required
          />

          <Textarea
            label="Optional message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Anything else the admin team should know…"
            rows={3}
          />

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={deptsLoading || departments.length === 0}
          >
            <Send className="h-4 w-4" />
            {pages.requestAccess.submitLabel}
          </Button>

          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </Card>
  )
}
