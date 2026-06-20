import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ScreenLoader } from '@/components/shared/ScreenLoader'

/** Auth pages: redirect signed-in active users to the portal home. */
export function AuthGuestGuard() {
  const { user, authReady } = useAuth()

  if (!authReady) {
    return <ScreenLoader message="Checking your session…" className="min-h-[40vh]" />
  }

  if (user?.active === true) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
