import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, CheckCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { validatePortalPassword, passwordPolicyHint } from '@/utils/passwordPolicy'

type Stage = 'loading' | 'set_password' | 'success' | 'error'

function VisibilityToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-muted hover:text-fg"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const authAvailable = Boolean(supabase)
  const [stage, setStage] = useState<Stage>(() => (authAvailable ? 'loading' : 'error'))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  /** true when this is a brand-new invited user setting their password for the first time */
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    if (!authAvailable) return

    const client = supabase!

    const handleAuth = async () => {
      // Supabase v2 PKCE flow — token arrives as ?code= in the URL
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { error: exchangeError, data } = await client.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error('[reset] code exchange error:', exchangeError.message)
          setStage('error')
          return
        }
        // Detect first-time invited users: they have never signed in before
        const lastSignIn = data.user?.last_sign_in_at
        const createdAt = data.user?.created_at
        if (!lastSignIn || lastSignIn === createdAt) {
          setIsNewUser(true)
        }
        // Clean the code from the URL so a refresh doesn't try to re-use it
        window.history.replaceState({}, '', '/reset-password')
        setStage('set_password')
        return
      }

      // Fallback: implicit flow — token arrives in the URL hash (#access_token=...)
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        // The Supabase SDK detects the hash automatically on initialisation.
        // Give it a moment then check for a session.
        await new Promise((r) => setTimeout(r, 500))
        const { data } = await client.auth.getSession()
        if (data.session) {
          window.history.replaceState({}, '', '/reset-password')
          setStage('set_password')
          return
        }
      }

      // No token in URL — check if there's already an active session
      const { data } = await client.auth.getSession()
      if (data.session) {
        setStage('set_password')
        return
      }

      setStage('error')
    }

    void handleAuth()
  }, [authAvailable])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const pwError = validatePortalPassword(password)
    if (pwError) {
      setError(pwError)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!supabase) {
      setError('Auth not configured.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setStage('success')
    setTimeout(() => navigate('/', { replace: true }), 3000)
  }

  return (
    <Card padding="lg" className="w-full max-w-md">
      {stage === 'loading' && (
        <div className="py-6 text-center text-sm text-muted">Verifying your link…</div>
      )}

      {stage === 'error' && (
        <div className="space-y-4 text-center">
          <h1 className="text-xl font-bold text-fg">Link expired</h1>
          <p className="text-sm text-muted">
            This link has expired or already been used. Ask your administrator to send a new
            invite or password reset.
          </p>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        </div>
      )}

      {stage === 'set_password' && (
        <>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-fg">
              {isNewUser ? 'Create your password' : 'Set new password'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {isNewUser
                ? 'Welcome to AfriVate! Choose a strong password to secure your new account.'
                : 'Choose a strong password to secure your AfriVate account.'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              type={showPassword ? 'text' : 'password'}
              label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 chars, uppercase & number"
              hint={passwordPolicyHint}
              autoComplete="new-password"
              leadingIcon={<Lock className="h-4 w-4" />}
              trailingNode={
                <VisibilityToggle
                  show={showPassword}
                  onToggle={() => setShowPassword((s) => !s)}
                />
              }
              required
            />
            <Input
              type={showConfirm ? 'text' : 'password'}
              label="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              leadingIcon={<Lock className="h-4 w-4" />}
              trailingNode={
                <VisibilityToggle
                  show={showConfirm}
                  onToggle={() => setShowConfirm((s) => !s)}
                />
              }
              required
            />

            {error && (
              <div
                role="alert"
                className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {isNewUser ? 'Create account & sign in' : 'Set password & sign in'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}

      {stage === 'success' && (
        <div className="space-y-3 py-4 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-success" />
          <h1 className="text-xl font-bold text-fg">
            {isNewUser ? 'Password created!' : 'Password updated!'}
          </h1>
          <p className="text-sm text-muted">
            {isNewUser
              ? 'Your account is ready. Taking you to the portal — an administrator may need to activate it before you can access everything.'
              : 'All done. Taking you to the portal now…'}
          </p>
        </div>
      )}
    </Card>
  )
}
