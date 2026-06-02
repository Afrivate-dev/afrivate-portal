import {
  LayoutDashboard,
  ListChecks,
  CalendarCheck,
  PlayCircle,
  Megaphone,
  CalendarDays,
  Users,
  FolderOpen,
  Heart,
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
  { to: '/checkin', label: navLabels.weeklyUpdate, icon: CalendarCheck, showInBottomBar: true },
  { to: '/onboarding', label: navLabels.gettingStarted, icon: PlayCircle, showInBottomBar: true },
  { to: '/inbox', label: navLabels.inbox, icon: Inbox },
  { to: '/search', label: navLabels.search, icon: Search },
  { to: '/notes', label: navLabels.notes, icon: StickyNote },
  { to: '/announcements', label: navLabels.updates, icon: Megaphone },
  { to: '/leave', label: navLabels.timeOff, icon: CalendarDays },
  { to: '/directory', label: navLabels.people, icon: Users },
  { to: '/documents', label: navLabels.resources, icon: FolderOpen },
  { to: '/recognition', label: navLabels.shoutOuts, icon: Heart },
  { to: '/events', label: navLabels.whatsOn, icon: Calendar },
  { to: '/admin', label: navLabels.workspaceAdmin, icon: Settings, roles: ['hr', 'admin'] },
]
