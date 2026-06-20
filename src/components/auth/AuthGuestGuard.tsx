import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/** Auth pages: redirect signed-in active users to the portal home. */
export function AuthGuestGuard() {
  const { user, authReady } = useAuth()

  if (!authReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        Loading…
      </div>
    )
  }

  if (user?.active === true) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
