import { Navigate, useLocation } from 'react-router-dom'

/** Redirect legacy paths while preserving query string (e.g. `/directory?open=`). */
export function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation()
  return <Navigate to={`${to}${location.search}`} replace />
}
