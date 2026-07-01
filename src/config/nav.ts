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
import type { Role } from '@/types'
import { nav as navLabels } from '@/content/copy'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles?: Role[]
  showInBottomBar?: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: navLabels.home, icon: LayoutDashboard, showInBottomBar: true },
  { to: '/tasks', label: navLabels.myWork, icon: ListChecks, showInBottomBar: true },
  { to: '/inbox', label: navLabels.inbox, icon: Inbox, showInBottomBar: true },
  { to: '/people', label: navLabels.peopleHub, icon: Users, showInBottomBar: true },
  { to: '/search', label: navLabels.search, icon: Search },
  { to: '/checkin', label: navLabels.weeklyUpdate, icon: CalendarCheck },
  { to: '/onboarding', label: navLabels.gettingStarted, icon: PlayCircle },
  { to: '/notes', label: navLabels.notes, icon: StickyNote },
  { to: '/announcements', label: navLabels.updates, icon: Megaphone },
  { to: '/documents', label: navLabels.resources, icon: FolderOpen },
  { to: '/events', label: navLabels.whatsOn, icon: Calendar },
  { to: '/admin', label: navLabels.workspaceAdmin, icon: Settings, roles: ['hr', 'admin'] },
]
