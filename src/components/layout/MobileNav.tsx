import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { navItems } from '@/config/nav'
import { cn } from '@/utils/helpers'

interface MobileNavProps {
  onOpenDrawer: () => void
}

export function MobileNav({ onOpenDrawer }: MobileNavProps) {
  const bottomItems = navItems.filter((i) => i.showInBottomBar).slice(0, 4)

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface lg:hidden">
      {bottomItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-accent' : 'text-muted hover:text-fg',
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button
        onClick={onOpenDrawer}
        className="flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted hover:text-fg"
      >
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  )
}
