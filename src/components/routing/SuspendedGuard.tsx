import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { isSuspended, isSuspendedAllowedPath } from '@/lib/dutyStatus'

export function SuspendedGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { pathname } = useLocation()

  if (isSuspended(user) && !isSuspendedAllowedPath(pathname)) {
    return <Navigate to="/announcements" replace />
  }

  return <>{children}</>
}
