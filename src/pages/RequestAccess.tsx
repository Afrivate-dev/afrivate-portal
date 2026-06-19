import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Mail, Lock, ArrowLeft, Send, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/context/AuthContext'
import { submitAccessRequest } from '@/lib/requestAccess'
import { pages } from '@/content/copy'

export function RequestAccessPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user?.active === true) return <Navigate to="/" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (!user) {
      const signIn = await login(email, password)
      if (!signIn.ok) {
        setLoading(false)
        setError(signIn.error ?? 'Could not sign in. Check your email and password.')
        return
      }
    }

    const result = await submitAccessRequest(message)
    setLoading(false)

    if (!result.ok) {
      setError(result.error ?? 'Could not send your request.')
      return
    }

    setSuccess(
      result.alreadyRequested
        ? 'Your request is already with the team. People & Culture will review your account soon.'
        : 'Request sent. People & Culture will review your account and email you when you are approved.',
    )
  }

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
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          {!user ? (
            <>
              <Input
                type="email"
                name="email"
                label={pages.login.emailLabel}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@afrivate.org"
                autoComplete="email"
                leadingIcon={<Mail className="h-4 w-4" />}
                required
              />
              <Input
                type="password"
                name="password"
                label={pages.login.passwordLabel}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                leadingIcon={<Lock className="h-4 w-4" />}
                required
              />
            </>
          ) : null}

          <Textarea
            label="Optional message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. I joined the Engineering team this week…"
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

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            <Send className="h-4 w-4" />
            {pages.requestAccess.submitLabel}
          </Button>
        </form>
      )}
    </Card>
  )
}
