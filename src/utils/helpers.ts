import { clsx, type ClassValue } from 'clsx'
import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isThisWeek,
  isPast,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import type { PresencePeer, Role, User, UserAvailability } from '@/types'
import { roleTitles } from '@/content/copy'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/* ----------------------------- Role helpers ----------------------------- */

export const isAdmin = (user: User | null | undefined) => user?.role === 'admin'
export const isHR = (user: User | null | undefined) =>
  !!user && (['hr', 'admin'] as Role[]).includes(user.role)
export const isLead = (user: User | null | undefined) =>
  !!user && (['team_lead', 'hr', 'admin'] as Role[]).includes(user.role)

export const roleLabel: Record<Role, string> = { ...roleTitles }

/* ----------------------------- Date helpers ----------------------------- */

export const fmtDate = (iso?: string) =>
  iso ? format(parseISO(iso), 'd MMM yyyy') : ''

export const fmtShortDate = (iso?: string) =>
  iso ? format(parseISO(iso), 'd MMM') : ''

export const fmtTime = (iso?: string) =>
  iso ? format(parseISO(iso), 'HH:mm') : ''

export const fmtDayName = (iso?: string) =>
  iso ? format(parseISO(iso), 'EEE') : ''

export const relativeTime = (iso?: string) =>
  iso ? formatDistanceToNowStrict(parseISO(iso), { addSuffix: true }) : ''

export const isDueToday = (iso?: string) =>
  iso ? isToday(parseISO(iso)) : false

export const isDueThisWeek = (iso?: string) =>
  iso ? isThisWeek(parseISO(iso), { weekStartsOn: 1 }) : false

export const isOverdue = (iso?: string) =>
  iso ? isPast(parseISO(iso)) && !isToday(parseISO(iso)) : false

export const currentWeekRange = () => {
  const now = new Date()
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    end: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
  }
}

export const weekLabel = (weekStartIso?: string) => {
  const start = weekStartIso ? parseISO(weekStartIso) : startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = endOfWeek(start, { weekStartsOn: 1 })
  return `Week of ${format(start, 'd')}\u2013${format(end, 'd MMM yyyy')}`
}

export type PresenceVisual = UserAvailability | 'offline'

/** Teammate not in presence sync is treated as offline. */
export function availabilityFromPeer(
  peer: PresencePeer | undefined,
  live: boolean,
): PresenceVisual {
  if (!live) return 'offline'
  if (!peer) return 'offline'
  return peer.availability
}

/* ---------------------------- Avatar helpers ---------------------------- */

const PALETTE = [
  '#3e8cff', '#22c55e', '#f59e0b', '#ec4899',
  '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6',
]

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const colorForName = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

/* ----------------------------- Misc helpers ----------------------------- */

export const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const uid = () => Math.random().toString(36).slice(2, 10)

/** Company update visibility (same rules as the Updates page). */
export function userSeesAnnouncement(user: User, a: { audience: string }): boolean {
  return a.audience === 'all' || a.audience === user.department
}

/**
 * Parse @mentions in task notes. Matches @FirstName, @FullName (no spaces), @emailLocal, or @userId.
 */
export function extractMentionedUserIds(text: string | undefined, users: User[]): string[] {
  if (!text) return []
  const ids = new Set<string>()
  const re = /@([^\s@]+)/g
  const active = users.filter((u) => u.active)
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const token = m[1].toLowerCase()
    for (const u of active) {
      if (u.id === token) {
        ids.add(u.id)
        break
      }
      const parts = u.name.trim().split(/\s+/)
      const first = parts[0]?.toLowerCase()
      const compact = parts.join('').toLowerCase()
      const emailLocal = u.email.split('@')[0]?.toLowerCase()
      if (token === first || token === compact || token === emailLocal) {
        ids.add(u.id)
        break
      }
    }
  }
  return [...ids]
}

export function newlyMentionedUserIds(
  oldText: string | undefined,
  newText: string | undefined,
  users: User[],
): string[] {
  const before = new Set(extractMentionedUserIds(oldText, users))
  return extractMentionedUserIds(newText, users).filter((id) => !before.has(id))
}

export function mailtoHref(
  email: string,
  options?: { subject?: string; body?: string },
): string {
  const e = email.trim()
  if (!e) return '#'
  const params = new URLSearchParams()
  if (options?.subject) params.set('subject', options.subject)
  if (options?.body) params.set('body', options.body)
  const q = params.toString()
  return q ? `mailto:${e}?${q}` : `mailto:${e}`
}
