import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff, UserPlus, LogOut, Sparkles } from 'lucide-react'
import { ScreenLoader } from '@/components/shared/ScreenLoader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { pages } from '@/content/copy'
import { supabase } from '@/lib/supabase'
import { isSupabaseAuthEnabled } from '@/lib/authMode'

type SignInMode = 'password' | 'magic_link'

export function LoginPage() {
  const { user, login, authReady, logout, sendMagicLink } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const supabaseMode = isSupabaseAuthEnabled()
  const [mode, setMode] = useState<SignInMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  useEffect(() => {
    if (!supabase) return

    const code = searchParams.get('code')
    if (code) {
      setLoading(true)
      void supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        setLoading(false)
        if (exchangeError) {
          setError('Sign-in link expired or invalid. Try again or use your password.')
          window.history.replaceState({}, '', '/login')
          return
        }
        window.history.replaceState({}, '', '/login')
        navigate('/', { replace: true })
      })
      return
    }

    const hash = window.location.hash
    if (
      hash.includes('access_token') &&
      (hash.includes('type=magiclink') ||
        hash.includes('type=signup') ||
        hash.includes('type=email'))
    ) {
      setLoading(true)
      void supabase.auth.getSession().then(({ data }) => {
        setLoading(false)
        window.history.replaceState({}, '', '/login')
        if (data.session) navigate('/', { replace: true })
      })
    }
  }, [searchParams, navigate])

  if (!authReady || loading) {
    return <ScreenLoader message="Checking your session…" className="min-h-[40vh]" />
  }

  if (user?.active === true) return <Navigate to="/" replace />

  const pendingSession = Boolean(user && user.active === false)

  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed. Check your email and password.')
      return
    }
    navigate('/', { replace: true })
  }

  const onSubmitMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    const result = await sendMagicLink(email)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not send magic link.')
      return
    }
    setMagicLinkSent(true)
    setInfo(`We sent a sign-in link to ${email.trim()}.`)
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

      {supabaseMode ? (
        <div className="mb-4 flex rounded-lg border border-border bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('password')
              setMagicLinkSent(false)
              setError(null)
              setInfo(null)
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === 'password' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('magic_link')
              setError(null)
              setInfo(null)
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === 'magic_link' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            Magic link
          </button>
        </div>
      ) : null}

      {magicLinkSent && mode === 'magic_link' ? (
        <div className="space-y-3 py-2 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-accent" />
          <p className="text-sm text-muted">{info}</p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setMagicLinkSent(false)
              setInfo(null)
            }}
          >
            Send another link
          </Button>
        </div>
      ) : mode === 'magic_link' ? (
        <form className="space-y-4" onSubmit={onSubmitMagicLink}>
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
          <p className="text-xs text-muted">
            For approved accounts only. We will email you a one-time sign-in link.
          </p>
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {error}
            </div>
          ) : null}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Email me a sign-in link
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onSubmitPassword}>
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
      )}

      <div className="mt-5 space-y-2 text-center">
        <Link to="/forgot-password" className="block text-sm text-muted hover:text-accent">
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
