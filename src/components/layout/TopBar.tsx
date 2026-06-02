import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Moon, Sun, LogOut, User as UserIcon, Bell, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useData } from '@/context/DataContext'
import { useCollab } from '@/context/CollabContext'
import { Avatar } from '@/components/ui/Avatar'
import { Select } from '@/components/ui/Select'
import { roleLabel } from '@/utils/helpers'
import type { UserAvailability } from '@/types'

const AVAILABILITY_OPTIONS: { value: UserAvailability; label: string }[] = [
  { value: 'online', label: 'Available' },
  { value: 'away', label: 'Away' },
  { value: 'busy', label: 'Busy' },
  { value: 'focusing', label: 'Focusing' },
]

interface TopBarProps {
  onOpenDrawer: () => void
}

export function TopBar({ onOpenDrawer }: TopBarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { announcements, inbox } = useData()
  const { myAvailability, setMyAvailability, multiplayerLive } = useCollab()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const unreadAnnouncements = user
    ? announcements.filter((a) => !a.readBy.includes(user.id)).length
    : 0
  const unreadInbox = user ? inbox.filter((n) => n.userId === user.id && !n.read).length : 0
  const unread = unreadAnnouncements + unreadInbox

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  if (!user) return null

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onOpenDrawer}
        aria-label="Open menu"
        className="rounded-md p-2 text-fg hover:bg-surface-2 lg:hidden ring-focus"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="rounded-md p-2 text-fg hover:bg-surface-2 ring-focus"
        >
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <button
          type="button"
          onClick={() => navigate('/search')}
          aria-label="Search"
          className="rounded-md p-2 text-fg hover:bg-surface-2 ring-focus"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        <div className="hidden w-[130px] shrink-0 md:block">
          <Select
            aria-label="Your availability"
            value={myAvailability}
            onChange={(e) => setMyAvailability(e.target.value as UserAvailability)}
            options={AVAILABILITY_OPTIONS}
          />
        </div>

        {multiplayerLive ? (
          <span className="hidden rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 lg:inline">
            Live
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => navigate('/inbox')}
          aria-label="Inbox"
          className="relative rounded-md p-2 text-fg hover:bg-surface-2 ring-focus"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
          ) : null}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-md p-1.5 hover:bg-surface-2 ring-focus"
          >
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="hidden text-left sm:block">
              <div className="text-sm font-medium text-fg leading-tight">{user.name}</div>
              <div className="text-[11px] text-muted leading-tight">{roleLabel[user.role]}</div>
            </div>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-elevated animate-fade-in">
              <div className="border-b border-border p-3">
                <div className="text-sm font-semibold text-fg">{user.name}</div>
                <div className="truncate text-xs text-muted">{user.email}</div>
              </div>
              <ul className="py-1">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/profile')
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-surface-2"
                  >
                    <UserIcon className="h-4 w-4 text-muted" />
                    My profile
                  </button>
                </li>
                <li>
                    <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-surface-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
