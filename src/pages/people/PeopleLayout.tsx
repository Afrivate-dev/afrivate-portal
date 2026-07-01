import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/utils/helpers'
import { peopleNavItems } from '@/pages/people/peopleNav'
import { useHr } from '@/context/HrContext'
import { ScreenLoader } from '@/components/shared/ScreenLoader'

export function PeopleLayout() {
  const { hrStatus } = useHr()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="av-scroll-x w-full max-w-full border-b border-border pb-1">
        <nav className="inline-flex w-max gap-1" aria-label="People sections">
          {peopleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition sm:px-3.5 sm:text-sm',
                  'min-h-[44px] touch-manipulation ring-focus',
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-muted hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      {hrStatus === 'loading' ? (
        <ScreenLoader message="Loading people data…" />
      ) : (
        <Outlet />
      )}
    </div>
  )
}
