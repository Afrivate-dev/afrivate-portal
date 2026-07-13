import type { Announcement, Role, User } from '@/types'

function isHrOrAdmin(user: Pick<User, 'role'>): boolean {
  return (['hr', 'admin'] as Role[]).includes(user.role)
}

/** Whether a user may see an announcement (audience scope). */
export function userSeesAnnouncement(
  a: Pick<Announcement, 'audience'>,
  user: Pick<User, 'department' | 'role'> | null | undefined,
): boolean {
  if (!user) return false
  if (a.audience === 'all') return true
  if (isHrOrAdmin(user)) return true
  return a.audience === user.department
}

export function unreadAnnouncementsFor(
  announcements: Announcement[],
  user: Pick<User, 'id' | 'department' | 'role'> | null | undefined,
): Announcement[] {
  if (!user) return []
  return announcements.filter(
    (a) => userSeesAnnouncement(a, user) && !a.readBy.includes(user.id),
  )
}
