import { useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { X, LogOut, ShieldCheck } from 'lucide-react'
import { navItems } from '@/config/nav'
import { cn, roleLabel, firstName } from '@/utils/helpers'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/useConfirm'
import { confirms, actions } from '@/content/copy'
import { Avatar } from '@/components/ui/Avatar'

interface DrawerProps {
  open: boolean
  onClose: () => void
}

export function Drawer({ open, onClose }: DrawerProps) {
  const { user, role, logout } = useAuth()
  const confirm = useConfirm()

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!user) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 transition-opacity lg:hidden',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={cn(
          'absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-elevated transition-transform',
          open ? 'translate-x-0 animate-slide-in-right motion-reduce:animate-none' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <a href="https://afrivate.org" className="flex items-center gap-2.5">
            <img src="/afrivate-icon.svg" alt="AfriVate" className="h-8 w-auto dark:hidden" />
            <img src="/afrivate-icon-white.svg" alt="AfriVate" className="hidden h-8 w-auto dark:block" />
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-sm font-bold text-fg">AfriVate</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Portal</span>
            </div>
          </a>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-2 text-fg hover:bg-surface-2 ring-focus"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <Avatar name={user.name} src={user.avatarUrl} size="md" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-fg">{firstName(user.name)}</div>
            <div className="truncate text-xs text-muted">{roleLabel[user.role]}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <ul className="space-y-0.5">
            {navItems
              .filter((i) => !i.roles || (role && i.roles.includes(role)))
              .map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent/10 text-accent'
                          : 'text-fg hover:bg-surface-2',
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
          </ul>
        </nav>

        <div className="border-t border-border">
          <Link
            to="/privacy"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
          >
            <ShieldCheck className="h-4 w-4" />
            Privacy Notice
          </Link>
          <button
            onClick={async () => {
              onClose()
              const ok = await confirm({
                title: confirms.signOutTitle,
                message: confirms.signOut,
                confirmLabel: actions.signOut,
                destructive: true,
              })
              if (ok) logout()
            }}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-4 text-sm font-medium text-danger hover:bg-surface-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </div>
  )
}
