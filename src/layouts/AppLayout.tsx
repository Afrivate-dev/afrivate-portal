import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Drawer } from '@/components/layout/Drawer'

export function AppLayout() {
  const { user } = useAuth()
  const { dataStatus, dataError, reloadData } = useData()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!user) return <Navigate to="/login" replace />

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
