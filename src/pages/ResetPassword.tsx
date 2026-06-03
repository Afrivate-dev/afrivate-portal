import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, CheckCircle, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

type Stage = 'loading' | 'set_password' | 'success' | 'error'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setStage('error')
      return
    }

    const client = supabase

    const handleAuth = async () => {
      // Supabase v2 uses PKCE by default — token arrives as ?code= in the URL
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error('[reset] code exchange error:', exchangeError.message)
          setStage('error')
          return
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
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
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
    setTimeout(() => navigate('/', { replace: true }), 2500)
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
            This link has expired or already been used. Ask your administrator to send a new invite or password reset.
          </p>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        </div>
      )}

      {stage === 'set_password' && (
        <>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-fg">Set your password</h1>
            <p className="mt-1 text-sm text-muted">
              Choose a strong password to secure your AfriVate account.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              type="password"
              label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              leadingIcon={<Lock className="h-4 w-4" />}
              required
            />
            <Input
              type="password"
              label="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              leadingIcon={<Lock className="h-4 w-4" />}
              required
            />

            {error && (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Set password & sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}

      {stage === 'success' && (
        <div className="space-y-3 py-4 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-success" />
          <h1 className="text-xl font-bold text-fg">Password set!</h1>
          <p className="text-sm text-muted">
            You're signed in. Taking you to the portal now…
          </p>
        </div>
      )}
    </Card>
  )
}
