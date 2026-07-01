import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  CalendarDays,
  Heart,
  GraduationCap,
  BarChart3,
  TrendingUp,
  Users,
} from 'lucide-react'

export interface PeopleNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

/** Sub-navigation inside People hub — keeps main sidebar uncluttered. */
export const peopleNavItems: PeopleNavItem[] = [
  { to: '/people', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/people/leave', label: 'Time off', icon: CalendarDays },
  { to: '/people/shout-outs', label: 'Shout-outs', icon: Heart },
  { to: '/people/learning', label: 'Learning', icon: GraduationCap },
  { to: '/people/surveys', label: 'Surveys', icon: BarChart3 },
  { to: '/people/growth', label: 'Growth', icon: TrendingUp },
  { to: '/people/directory', label: 'Directory', icon: Users },
]
