import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff, UserPlus, LogOut } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { pages } from '@/content/copy'

export function LoginPage() {
  const { user, login, authReady, logout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!authReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        Loading…
      </div>
    )
  }

  if (user?.active === true) return <Navigate to="/" replace />

  const pendingSession = Boolean(user && user.active === false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed. Check your email and password.')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <Card padding="lg" className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-fg">{pages.login.title}</h1>
        <p className="mt-1 text-sm text-muted">{pages.login.subtitle}</p>
      </div>

      {pendingSession ? (
        <div className="mb-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-fg">
          You are signed in, but your account is still waiting for approval.{' '}
          <Link to="/" className="font-medium text-accent hover:underline">
            View status
          </Link>{' '}
          or sign out below to use a different account.
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit}>
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
          autoFocus
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          name="password"
          label={pages.login.passwordLabel}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          leadingIcon={<Lock className="h-4 w-4" />}
          trailingNode={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-muted hover:text-fg"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          required
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
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>

        <Link
          to="/request-access"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 px-6 text-base font-medium text-fg transition-colors hover:bg-surface-3 ring-focus"
        >
          <UserPlus className="h-4 w-4" />
          {pages.login.requestAccessCta}
        </Link>
      </form>

      <div className="mt-5 space-y-2 text-center">
        <Link
          to="/forgot-password"
          className="block text-sm text-muted hover:text-accent"
        >
          Forgot your password?
        </Link>
        <p className="text-xs leading-relaxed text-muted">{pages.login.signInHelp}</p>
        {pendingSession ? (
          <button
            type="button"
            onClick={logout}
            className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        ) : null}
      </div>
    </Card>
  )
}
