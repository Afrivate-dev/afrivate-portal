import { useEffect, useState, Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { PendingApprovalScreen } from '@/components/shared/PendingApprovalScreen'
import { ProfileLoadErrorScreen } from '@/components/shared/ProfileLoadErrorScreen'
import { ScreenLoader } from '@/components/shared/ScreenLoader'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Drawer } from '@/components/layout/Drawer'
import { InstallAppPrompt } from '@/components/shared/InstallAppPrompt'

function AppShell({
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  children,
}: {
  drawerOpen: boolean
  onOpenDrawer: () => void
  onCloseDrawer: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar onOpenDrawer={onOpenDrawer} />
        <main className="flex-1 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <MobileNav onOpenDrawer={onOpenDrawer} />
      </div>
      <Drawer open={drawerOpen} onClose={onCloseDrawer} />
      <InstallAppPrompt />
    </div>
  )
}

export function AppLayout() {
  const { user, logout, reconcileUser, authReady, profileLoadFailed, refreshUser } = useAuth()
  const { dataStatus, reloadData, users } = useData()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (dataStatus !== 'ready' || !user) return
    const dataUser = users.find((u) => u.id === user.id)
    if (!dataUser) return
    const patch: Partial<typeof user> = {}
    if (dataUser.role !== user.role) patch.role = dataUser.role
    if (dataUser.active !== user.active) patch.active = dataUser.active
    if (Object.keys(patch).length > 0) reconcileUser(patch)
  }, [dataStatus, users, user, reconcileUser])

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <ScreenLoader message="Checking your session…" />
      </div>
    )
  }

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

  if (profileLoadFailed) {
    return (
      <ProfileLoadErrorScreen
        onRetry={() => void refreshUser()}
        onSignOut={logout}
      />
    )
  }

  if (user.active === false) {
    return <PendingApprovalScreen user={user} onSignOut={logout} />
  }

  if (dataStatus === 'loading') {
    return (
      <AppShell
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        onCloseDrawer={() => setDrawerOpen(false)}
      >
        <ScreenLoader message="Loading your portal…" className="min-h-[50vh]" />
      </AppShell>
    )
  }

  if (dataStatus === 'error') {
    return (
      <AppShell
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        onCloseDrawer={() => setDrawerOpen(false)}
      >
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-fg">We couldn&apos;t load your data right now.</p>
          <p className="max-w-md text-xs text-muted">Please try again in a moment.</p>
          <button
            type="button"
            onClick={() => void reloadData()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white ring-focus"
          >
            Retry
          </button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      drawerOpen={drawerOpen}
      onOpenDrawer={() => setDrawerOpen(true)}
      onCloseDrawer={() => setDrawerOpen(false)}
    >
      <Suspense fallback={<ScreenLoader message="Loading page…" className="min-h-[50vh]" />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}
