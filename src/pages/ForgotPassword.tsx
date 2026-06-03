import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setError('Auth not configured.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` },
    )
    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setSent(true)
  }

  return (
    <Card padding="lg" className="w-full max-w-md">
      {sent ? (
        <div className="space-y-3 py-4 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-success" />
          <h1 className="text-xl font-bold text-fg">Check your email</h1>
          <p className="text-sm text-muted">
            We sent a password reset link to <strong>{email}</strong>. Click the link
            in the email to set a new password.
          </p>
          <Button variant="secondary" className="w-full mt-2" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-fg">Forgot password?</h1>
            <p className="mt-1 text-sm text-muted">
              Enter your work email and we'll send you a reset link.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              type="email"
              label="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@afrivate.org"
              autoComplete="email"
              leadingIcon={<Mail className="h-4 w-4" />}
              required
              autoFocus
            />

            {error && (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Send reset link
            </Button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </button>
        </>
      )}
    </Card>
  )
}
