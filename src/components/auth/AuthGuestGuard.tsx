import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ScreenLoader } from '@/components/shared/ScreenLoader'
import { clearRememberedAuthNext, getSafeNext } from '@/lib/safeRedirect'

/** Auth pages: send an already signed-in user back to the page they asked for. */
export function AuthGuestGuard() {
  const { user, authReady, profileChecked } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const next = getSafeNext(searchParams, location.state)
  const signedIn = Boolean(user && (!profileChecked || user.active === true))

  useEffect(() => {
    if (signedIn) clearRememberedAuthNext()
  }, [signedIn])

  if (!authReady) {
    return <ScreenLoader message="Checking your session…" className="min-h-[40vh]" />
  }

  // Signed in, profile still loading: go to the app. Never bounce back to /login.
  if (signedIn) {
    return <Navigate to={next} replace />
  }

  return <Outlet />
}
