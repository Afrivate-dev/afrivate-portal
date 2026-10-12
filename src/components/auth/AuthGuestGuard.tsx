import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ScreenLoader } from '@/components/shared/ScreenLoader'

/** Auth pages: redirect signed-in active users to the portal home. */
export function AuthGuestGuard() {
  const { user, authReady, profileChecked } = useAuth()

  if (!authReady) {
    return <ScreenLoader message="Checking your session…" className="min-h-[40vh]" />
  }

  // Signed in, profile still loading: go to the app. Never bounce back to /login.
  if (user && (!profileChecked || user.active === true)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
