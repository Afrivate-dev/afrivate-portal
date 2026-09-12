import {
  LayoutDashboard,
  ListChecks,
  CalendarCheck,
  PlayCircle,
  Megaphone,
  Users,
  FolderOpen,
  Calendar,
  Inbox,
  Search,
  StickyNote,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { Role, User } from '@/types'
import { nav as navLabels } from '@/content/copy'
import { isSuspended } from '@/lib/dutyStatus'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles?: Role[]
}

/** Full destination list. Primary vs More is decided at runtime in useDailyNav. */
export const navItems: NavItem[] = [
  { to: '/', label: navLabels.home, icon: LayoutDashboard },
  { to: '/tasks', label: navLabels.myWork, icon: ListChecks },
  { to: '/inbox', label: navLabels.inbox, icon: Inbox },
  { to: '/people', label: navLabels.peopleHub, icon: Users },
  { to: '/search', label: navLabels.search, icon: Search },
  { to: '/checkin', label: navLabels.weeklyUpdate, icon: CalendarCheck },
  { to: '/onboarding', label: navLabels.gettingStarted, icon: PlayCircle },
  { to: '/notes', label: navLabels.notes, icon: StickyNote },
  { to: '/announcements', label: navLabels.updates, icon: Megaphone },
  { to: '/documents', label: navLabels.resources, icon: FolderOpen },
  { to: '/events', label: navLabels.whatsOn, icon: Calendar },
  { to: '/admin', label: navLabels.workspaceAdmin, icon: Settings, roles: ['hr', 'admin'] },
]

export function visibleNavItems(user: User | null, role: Role | null): NavItem[] {
  const items = navItems.filter((i) => !i.roles || (role && i.roles.includes(role)))
  if (isSuspended(user)) {
    return items.filter((i) => i.to === '/announcements' || i.to === '/documents')
  }
  return items
}
