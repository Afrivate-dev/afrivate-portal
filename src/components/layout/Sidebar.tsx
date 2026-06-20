import { NavLink, Link } from 'react-router-dom'
import { navItems } from '@/config/nav'
import { cn } from '@/utils/helpers'
import { useAuth } from '@/context/AuthContext'

export function Sidebar() {
  const { role } = useAuth()

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <a href="https://afrivate.org" className="flex items-center gap-2.5">
          <img src="/afrivate-icon.svg" alt="AfriVate" className="h-8 w-auto dark:hidden" />
          <img src="/afrivate-icon-white.svg" alt="AfriVate" className="hidden h-8 w-auto dark:block" />
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-sm font-bold text-fg">AfriVate</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Portal</span>
          </div>
        </a>
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
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-muted hover:bg-surface-2 hover:text-fg',
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>

      <div className="border-t border-border p-4 text-[11px] text-muted">
        <p className="font-medium text-fg">AfriVate Portal</p>
        <p>v0.1.0 · internal use only</p>
        <Link to="/privacy" className="mt-1.5 block text-accent hover:underline">
          Privacy Notice
        </Link>
      </div>
    </aside>
  )
}
