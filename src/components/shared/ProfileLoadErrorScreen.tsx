import { AlertCircle, LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ProfileLoadErrorScreen({
  onRetry,
  onSignOut,
}: {
  onRetry: () => void
  onSignOut: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
        <AlertCircle className="h-8 w-8 text-danger" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="font-heading text-2xl font-bold text-fg">Could not load your account</h1>
        <p className="text-sm text-muted">
          You are signed in, but we could not read your profile from the server. This is usually a
          configuration issue — try again, or sign out and contact your administrator.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <Button type="button" className="flex-1" onClick={() => void onRetry()}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
