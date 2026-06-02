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
    // Supabase puts the session in the URL hash after a reset/invite link click.
    // The client SDK picks it up automatically on load — we just need to check
    // if there's an active session (meaning the link was valid).
    if (!supabase) {
      setStage('error')
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStage('set_password')
      } else {
        // No session — link may have expired
        setStage('error')
      }
    })
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
            This password reset link has expired or already been used. Request a new one from
            your administrator.
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
