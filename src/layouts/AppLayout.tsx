import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { PendingApprovalScreen } from '@/components/shared/PendingApprovalScreen'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Drawer } from '@/components/layout/Drawer'
import { InstallAppPrompt } from '@/components/shared/InstallAppPrompt'

export function AppLayout() {
  const { user, logout, reconcileUser } = useAuth()
  const { dataStatus, dataError, reloadData, users } = useData()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (dataStatus !== 'ready' || !user) return
    const dataUser = users.find((u) => u.id === user.id)
    if (dataUser && dataUser.role !== user.role) {
      reconcileUser({ role: dataUser.role })
    }
  }, [dataStatus, users, user, reconcileUser])

  if (!user) {
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

  if (user.active === false) {
    return <PendingApprovalScreen user={user} onSignOut={logout} />
  }

  if (dataStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted">
        Loading your portal…
      </div>
    )
  }

  if (dataStatus === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
        <p className="text-sm text-fg">We couldn&apos;t load your data right now.</p>
        {dataError ? <p className="max-w-md text-xs text-muted">Please try again in a moment.</p> : null}
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
      <InstallAppPrompt />
    </div>
  )
}
