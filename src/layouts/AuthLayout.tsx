import { Outlet } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { Moon, Sun } from 'lucide-react'

export function AuthLayout() {
  const { theme, toggle } = useTheme()

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-fg">
      {/* Decorative gradient — AfriVate purple */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 dark:opacity-100"
        style={{
          background:
            'radial-gradient(60% 60% at 20% 0%, rgba(141, 64, 135, 0.18) 0%, transparent 60%), radial-gradient(50% 50% at 80% 100%, rgba(240, 231, 246, 0.35) 0%, transparent 60%)',
        }}
      />

      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <a href="https://afrivate.org" className="flex items-center gap-3">
          <img src="/afrivate-icon.svg" alt="AfriVate" className="h-10 w-auto dark:hidden" />
          <img src="/afrivate-icon-white.svg" alt="AfriVate" className="hidden h-10 w-auto dark:block" />
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-lg font-bold text-fg">AfriVate</span>
            <span className="text-[11px] text-muted">Elevating Africa</span>
          </div>
        </a>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="rounded-md border border-border bg-surface p-2 text-fg hover:bg-surface-2 ring-focus"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <main className="flex min-h-[calc(100vh-120px)] items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
        <div className="w-full max-w-md animate-page-enter motion-reduce:animate-none">
          <Outlet />
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} AfriVate Technologies Ltd · Employee portal
      </footer>
    </div>
  )
}
