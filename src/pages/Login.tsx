import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseAuthEnabled } from '@/lib/authMode'

const DEMO = [
  { label: 'Admin', email: 'admin@afrivate.com', password: 'admin123' },
  { label: 'HR', email: 'hr@afrivate.com', password: 'hr123' },
  { label: 'Team Lead', email: 'lead@afrivate.com', password: 'lead123' },
  { label: 'Staff (new)', email: 'staff@afrivate.com', password: 'staff123' },
]

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const fillDemo = (d: (typeof DEMO)[number]) => {
    setEmail(d.email)
    setPassword(d.password)
    setError(null)
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
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@afrivate.com"
          autoComplete="email"
          leadingIcon={<Mail className="h-4 w-4" />}
          required
        />
        <Input
          type="password"
          name="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
          autoComplete="current-password"
          leadingIcon={<Lock className="h-4 w-4" />}
          required
        />

        {error ? (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      {isSupabaseAuthEnabled() ? (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted">
            Your organization uses a managed sign-in. Use the <strong className="text-fg">work email and password</strong>{' '}
            from your administrator. If you can't sign in, contact People & culture or IT.
          </p>
        </div>
      ) : (
        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Demo accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => fillDemo(d)}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-left text-xs hover:border-accent/40 hover:bg-accent/5 ring-focus"
              >
                <div className="font-semibold text-fg">{d.label}</div>
                <div className="truncate text-muted">{d.email}</div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Click a demo card to fill the form, then press Sign in.
          </p>
        </div>
      )}
    </Card>
  )
}
