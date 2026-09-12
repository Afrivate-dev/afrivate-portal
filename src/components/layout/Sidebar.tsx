import { NavLink, Link } from 'react-router-dom'
import { Rocket } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useAuth } from '@/context/AuthContext'
import { useDailyNav } from '@/hooks/useDailyNav'
import { canAccessRevivalLaunchChecklist } from '@/lib/revivalLaunchAccess'
import { isSuspended } from '@/lib/dutyStatus'
import type { NavItem } from '@/config/nav'

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex min-h-[40px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
          isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  const { user } = useAuth()
  const { primary, more } = useDailyNav()
  const showLaunchChecklist = canAccessRevivalLaunchChecklist(user) && !isSuspended(user)

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <a href="https://afrivate.org" className="flex items-center gap-2.5">
          <img src="/afrivate-icon.svg" alt="AfriVate" className="h-8 w-auto dark:hidden" />
          <img src="/afrivate-icon-white.svg" alt="AfriVate" className="hidden h-8 w-auto dark:block" />
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-sm font-bold text-fg">AfriVate</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Team space</span>
          </div>
        </a>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <ul className="space-y-0.5">
          {primary.map((item) => (
            <li key={item.to}>
              <NavRow item={item} />
            </li>
          ))}
        </ul>
        {more.length > 0 || showLaunchChecklist ? (
          <>
            <p className="mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
              More
            </p>
            <ul className="space-y-0.5">
              {more.map((item) => (
                <li key={item.to}>
                  <NavRow item={item} />
                </li>
              ))}
              {showLaunchChecklist ? (
                <li>
                  <NavLink
                    to="/launch-checklist"
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-[40px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-accent/10 text-accent'
                          : 'text-muted hover:bg-surface-2 hover:text-fg',
                      )
                    }
                  >
                    <Rocket className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">Launch checklist</span>
                  </NavLink>
                </li>
              ) : null}
            </ul>
          </>
        ) : null}
      </nav>

      <div className="border-t border-border p-4 text-[11px] text-muted">
        <p className="font-medium text-fg">AfriVate Team Space</p>
        <p>For team members · internal</p>
        <Link to="/privacy" className="mt-1.5 block text-accent hover:underline">
          Privacy Notice
        </Link>
      </div>
    </aside>
  )
}
