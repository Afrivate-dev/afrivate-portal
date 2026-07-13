import type { LucideIcon } from 'lucide-react'
import {
  AtSign,
  BarChart3,
  CalendarDays,
  Heart,
  Inbox,
  ListChecks,
  Megaphone,
  StickyNote,
  UserPlus,
} from 'lucide-react'
import type { InboxNotification, InboxNotificationType } from '@/types'

/** Every notification type emitted by the portal (client + Supabase RPCs). */
export const INBOX_NOTIFICATION_TYPES = [
  'recognition',
  'task_mention',
  'note_mention',
  'task_assigned',
  'access_request',
  'access_granted',
  'leave_update',
  'leave_comment',
  'recognition_comment',
  'survey_reminder',
  'memo_published',
] as const satisfies readonly InboxNotificationType[]

export type InboxTypeMeta = {
  icon: LucideIcon
  label: string
  iconClass: string
}

export const INBOX_TYPE_META: Record<InboxNotificationType, InboxTypeMeta> = {
  recognition: {
    icon: Heart,
    label: 'Shout-out',
    iconClass: 'text-pink-600 dark:text-pink-300',
  },
  task_assigned: {
    icon: ListChecks,
    label: 'Assignment',
    iconClass: 'text-accent',
  },
  task_mention: {
    icon: AtSign,
    label: 'Mention',
    iconClass: 'text-amber-600 dark:text-amber-300',
  },
  note_mention: {
    icon: StickyNote,
    label: 'Note mention',
    iconClass: 'text-amber-600 dark:text-amber-300',
  },
  leave_update: {
    icon: CalendarDays,
    label: 'Leave update',
    iconClass: 'text-accent',
  },
  leave_comment: {
    icon: CalendarDays,
    label: 'Leave message',
    iconClass: 'text-accent',
  },
  recognition_comment: {
    icon: Heart,
    label: 'Shout-out comment',
    iconClass: 'text-pink-600 dark:text-pink-300',
  },
  access_request: {
    icon: UserPlus,
    label: 'Access request',
    iconClass: 'text-accent',
  },
  access_granted: {
    icon: UserPlus,
    label: 'Access approved',
    iconClass: 'text-success',
  },
  survey_reminder: {
    icon: BarChart3,
    label: 'Survey',
    iconClass: 'text-accent',
  },
  memo_published: {
    icon: Megaphone,
    label: 'Memo',
    iconClass: 'text-accent',
  },
}

const FALLBACK_TYPE_META: InboxTypeMeta = {
  icon: Inbox,
  label: 'Notification',
  iconClass: 'text-muted',
}

const KNOWN_TYPES = new Set<string>(INBOX_NOTIFICATION_TYPES)

export function isInboxNotificationType(value: string): value is InboxNotificationType {
  return KNOWN_TYPES.has(value)
}

/** Label/icon for any stored type string — never throws, never returns undefined. */
export function getInboxTypeMeta(type: string | null | undefined): InboxTypeMeta {
  const key = String(type ?? '').trim()
  if (key && isInboxNotificationType(key)) {
    return INBOX_TYPE_META[key]
  }
  return FALLBACK_TYPE_META
}

function surveyDetailPath(notification: InboxNotification): string | null {
  const m = notification.id.match(/^inbox_survey_(.+)_([0-9a-f-]{36})$/i)
  if (m) return `/people/surveys/${m[1]}`
  const link = notification.link?.trim()
  if (link?.startsWith('/people/surveys/')) return link
  return null
}

/** Safe in-app destination for a notification — always returns an internal path. */
export function resolveInboxLink(notification: InboxNotification): string {
  const stored = notification.link?.trim()
  const safeStored = stored?.startsWith('/') ? stored : null

  switch (notification.type) {
    case 'task_assigned':
    case 'task_mention':
      if (notification.taskId) return `/tasks?open=${encodeURIComponent(notification.taskId)}`
      return safeStored ?? '/tasks'
    case 'note_mention':
      return safeStored ?? (notification.noteId ? `/notes?open=${encodeURIComponent(notification.noteId)}` : '/notes')
    case 'leave_update':
    case 'leave_comment':
      return '/people/leave'
    case 'recognition':
    case 'recognition_comment':
      if (notification.recognitionId) {
        return `/people/shout-outs?open=${encodeURIComponent(notification.recognitionId)}`
      }
      return safeStored ?? '/people/shout-outs'
    case 'access_request':
      return '/admin'
    case 'access_granted':
      return safeStored ?? '/'
    case 'survey_reminder':
      return surveyDetailPath(notification) ?? safeStored ?? '/people/surveys'
    default:
      return safeStored ?? '/'
  }
}

/** Normalize a DB row type string for display (unknown types pass through unchanged). */
export function normalizeInboxTypeFromDb(raw: unknown): string {
  const type = String(raw ?? '').trim()
  return type || 'notification'
}
