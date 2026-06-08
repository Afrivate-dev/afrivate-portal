import { useState } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseAuthEnabled } from '@/lib/authMode'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Login failed')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <Card padding="lg" className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-fg">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to the AfriVate employee portal
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          type="email"
          name="email"
          label="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@afrivate.org"
          autoComplete="email"
          leadingIcon={<Mail className="h-4 w-4" />}
          required
          autoFocus
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          name="password"
          label="Password"
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
      </form>

      <div className="mt-4 text-center">
        <Link
          to="/forgot-password"
          className="text-sm text-muted hover:text-accent"
        >
          Forgot your password?
        </Link>
      </div>

      {!isSupabaseAuthEnabled() && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted">
            Running in local mode. Connect Supabase to enable real authentication.
          </p>
        </div>
      )}

    </Card>
  )
}
