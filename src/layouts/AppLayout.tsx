import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Drawer } from '@/components/layout/Drawer'

function PendingApprovalScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
        <Clock className="h-8 w-8 text-accent" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold text-fg">Account pending approval</h1>
        <p className="max-w-sm text-sm text-muted">
          Your account has been created successfully. An administrator will review and
          activate it shortly. Sign back in once you've been notified.
        </p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2 ring-focus"
      >
        Sign out
      </button>
    </div>
  )
}

export function AppLayout() {
  const { user, logout, reconcileUser } = useAuth()
  const { dataStatus, dataError, reloadData, users } = useData()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Keep auth session role in sync with the users list (e.g. after an admin
  // updates the current user's role via the Admin Panel or direct DB edit).
  useEffect(() => {
    if (dataStatus !== 'ready' || !user) return
    const dataUser = users.find((u) => u.id === user.id)
    if (dataUser && dataUser.role !== user.role) {
      reconcileUser({ role: dataUser.role })
    }
  }, [dataStatus, users, user, reconcileUser])

  if (!user) {
    // Preserve auth tokens from invite / password-reset links.
    // AppLayout renders synchronously before AuthRedirectHandler's useEffect fires,
    // so we must intercept ?code= here rather than letting <Navigate replace /> drop it.
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) return <Navigate to={`/reset-password?code=${code}`} replace />
    const hash = window.location.hash
    if (
      hash.includes('access_token') ||
      hash.includes('type=recovery') ||
      hash.includes('type=invite')
    ) {
      return <Navigate to={`/reset-password${hash}`} replace />
    }
    return <Navigate to="/login" replace />
  }

  // User signed in but not yet approved by admin
  if (user.active === false) {
    return <PendingApprovalScreen onSignOut={logout} />
  }

  if (dataStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted">
        Loading workspace…
      </div>
    )
  }

  if (dataStatus === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
        <p className="text-sm text-fg">Could not load workspace data.</p>
        {dataError ? <p className="max-w-md text-xs text-muted">{dataError}</p> : null}
        <button
          type="button"
          onClick={() => void reloadData()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white ring-focus"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar onOpenDrawer={() => setDrawerOpen(true)} />


        <main className="flex-1 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>

        <MobileNav onOpenDrawer={() => setDrawerOpen(true)} />
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
