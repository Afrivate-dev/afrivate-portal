import type { Announcement, InboxNotification, User } from '@/types'
import { userSeesAnnouncement } from '@/lib/announcementVisibility'
import { uid } from '@/utils/helpers'

/** Build inbox rows for audience members when a memo is published. */
export function memoPublishedInboxRows(
  announcement: Announcement,
  users: User[],
): InboxNotification[] {
  const now = new Date().toISOString()
  const textSnippet = announcement.body.trim().slice(0, 140)
  const docName = announcement.media?.find((m) => m.kind === 'document')?.fileName
  const body =
    textSnippet ||
    (docName
      ? `Document: ${docName}`
      : announcement.media?.length
        ? 'Open the memo to view the attached file.'
        : undefined)

  return users
    .filter(
      (u) =>
        u.active &&
        u.id !== announcement.postedById &&
        userSeesAnnouncement(announcement, u),
    )
    .map((u) => ({
      id: `inbox_memo_${announcement.id}_${u.id}`,
      userId: u.id,
      type: 'memo_published' as const,
      title:
        announcement.priority === 'urgent'
          ? `Urgent memo: ${announcement.title}`
          : `New memo: ${announcement.title}`,
      body,
      link: `/announcements?open=${encodeURIComponent(announcement.id)}`,
      read: false,
      createdAt: now,
      fromUserId: announcement.postedById,
    }))
}

export function pushLocalInboxRows(rows: InboxNotification[]): void {
  if (!rows.length || typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem('av-inbox')
    const prev = raw ? (JSON.parse(raw) as InboxNotification[]) : []
    window.localStorage.setItem('av-inbox', JSON.stringify([...rows, ...prev]))
  } catch {
    /* ignore */
  }
}

export function newInboxId(prefix = 'n'): string {
  return `${prefix}_${uid()}`
}
