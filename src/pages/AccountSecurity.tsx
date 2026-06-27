import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, ShieldCheck, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { passwordPolicyHint, validatePortalPassword } from '@/utils/passwordPolicy'

export function AccountSecurityPage() {
  const navigate = useNavigate()
  const { user, changeEmail, changePassword, sendReauthentication } = useAuth()
  const supabaseMode = isSupabaseAuthEnabled()

  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordDone, setPasswordDone] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [reauthLoading, setReauthLoading] = useState(false)
  const [reauthSent, setReauthSent] = useState(false)
  const [reauthError, setReauthError] = useState<string | null>(null)

  if (!user) return null

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)
    setEmailLoading(true)
    const result = await changeEmail(newEmail)
    setEmailLoading(false)
    if (!result.ok) {
      setEmailError(result.error ?? 'Could not start email change.')
      return
    }
    setEmailSent(true)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    const pwError = validatePortalPassword(newPassword)
    if (pwError) {
      setPasswordError(pwError)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setPasswordLoading(true)
    const result = await changePassword(newPassword)
    setPasswordLoading(false)
    if (!result.ok) {
      setPasswordError(result.error ?? 'Could not change password.')
      return
    }
    setPasswordDone(true)
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleReauth = async () => {
    setReauthError(null)
    setReauthLoading(true)
    const result = await sendReauthentication()
    setReauthLoading(false)
    if (!result.ok) {
      setReauthError(result.error ?? 'Could not send verification email.')
      return
    }
    setReauthSent(true)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mt-4 text-2xl font-bold text-fg">Account &amp; security</h1>
        <p className="mt-1 text-sm text-muted">
          Manage sign-in email, password, and identity verification for {user.email}.
        </p>
      </div>

      {!supabaseMode ? (
        <Card padding="lg">
          <p className="text-sm text-muted">
            Account security settings are available when Supabase auth is enabled.
          </p>
        </Card>
      ) : (
        <>
          <Card padding="lg" className="space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-fg">Verify identity</h2>
                <p className="mt-1 text-sm text-muted">
                  Before changing your email or password, Supabase may require a recent sign-in.
                  Send a verification link to your current email if prompted.
                </p>
                {reauthSent ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-success">
                    <CheckCircle className="h-4 w-4" />
                    Verification email sent. Open the link, then try your change again.
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3"
                    loading={reauthLoading}
                    onClick={() => void handleReauth()}
                  >
                    Send verification email
                  </Button>
                )}
                {reauthError ? (
                  <p role="alert" className="mt-2 text-sm text-danger">
                    {reauthError}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card padding="lg" className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-fg">Change email</h2>
                <p className="mt-1 text-sm text-muted">
                  We will send a confirmation link to your new address. Your current email stays
                  active until you confirm.
                </p>
                {emailSent ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-success">
                    <CheckCircle className="h-4 w-4" />
                    Confirmation sent to <strong>{newEmail}</strong>. Check your inbox.
                  </p>
                ) : (
                  <form className="mt-4 space-y-3" onSubmit={(e) => void handleChangeEmail(e)}>
                    <Input
                      type="email"
                      label="New work email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="you@afrivate.org"
                      autoComplete="email"
                      required
                    />
                    {emailError ? (
                      <p role="alert" className="text-sm text-danger">
                        {emailError}
                      </p>
                    ) : null}
                    <Button type="submit" loading={emailLoading}>
                      Update email
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </Card>

          <Card padding="lg" className="space-y-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-fg">Change password</h2>
                <p className="mt-1 text-sm text-muted">
                  Choose a new password. You will receive an email notification when your password
                  changes.
                </p>
                {passwordDone ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-success">
                    <CheckCircle className="h-4 w-4" />
                    Password updated successfully.
                  </p>
                ) : (
                  <form className="mt-4 space-y-3" onSubmit={(e) => void handleChangePassword(e)}>
                    <Input
                      type="password"
                      label="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 chars, uppercase & number"
                      hint={passwordPolicyHint}
                      autoComplete="new-password"
                      required
                    />
                    <Input
                      type="password"
                      label="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    {passwordError ? (
                      <p role="alert" className="text-sm text-danger">
                        {passwordError}
                      </p>
                    ) : null}
                    <Button type="submit" loading={passwordLoading}>
                      Update password
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
