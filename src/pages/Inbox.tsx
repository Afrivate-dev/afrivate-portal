import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox as InboxIcon, AtSign, ListChecks, Heart, UserPlus, CalendarDays, StickyNote } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/ConfirmContext'
import { useData } from '@/context/DataContext'
import { confirms } from '@/content/copy'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { cn, relativeTime } from '@/utils/helpers'
import { pages } from '@/content/copy'
import type { InboxNotification, InboxNotificationType } from '@/types'

const I = pages.inbox

const TYPE_META: Record<
  InboxNotificationType,
  { icon: typeof Heart; label: string; iconClass: string }
> = {
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
}

export function InboxPage() {
  const { user } = useAuth()
  const { inbox, markInboxRead, markAllInboxRead, users } = useData()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const mine = useMemo(() => {
    if (!user) return []
    return [...inbox]
      .filter((n) => n.userId === user.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [inbox, user])

  const unreadCount = useMemo(() => mine.filter((n) => !n.read).length, [mine])

  if (!user) return null

  const openNotification = (n: InboxNotification) => {
    markInboxRead(n.id)
    const link =
      n.taskId && (n.type === 'task_assigned' || n.type === 'task_mention')
        ? `/tasks?open=${n.taskId}`
        : n.noteId && n.type === 'note_mention'
          ? n.link
          : n.leaveId && (n.type === 'leave_update' || n.type === 'leave_comment')
            ? '/leave'
            : n.recognitionId && n.type === 'recognition_comment'
              ? `/recognition?open=${encodeURIComponent(n.recognitionId)}`
              : n.link
    navigate(link)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={I.title}
        description={I.subtitle}
        actions={
          unreadCount > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const ok = await confirm({ message: confirms.markAllInboxRead })
                if (ok) markAllInboxRead(user.id)
              }}
            >
              {I.markAllRead}
            </Button>
          ) : null
        }
      />

      {mine.length === 0 ? (
        <EmptyState icon={InboxIcon} title={I.empty} description={I.emptyBody} />
      ) : (
        <ul className="space-y-2">
          {mine.map((n) => {
            const meta = TYPE_META[n.type]
            const Icon = meta.icon
            const from = n.fromUserId ? users.find((u) => u.id === n.fromUserId) : undefined
            return (
              <li key={n.id}>
                <Card padding="md" className={cn(!n.read && 'border-accent/30 bg-accent/[0.03]')}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className="flex w-full gap-3 text-left ring-focus rounded-lg"
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2',
                        meta.iconClass,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted">
                          {meta.label}
                        </span>
                        {!n.read ? (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                            New
                          </span>
                        ) : null}
                        <span className="ml-auto text-xs text-muted">{relativeTime(n.createdAt)}</span>
                      </div>
                      <p className="mt-1 font-semibold text-fg">{n.title}</p>
                      {n.body ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{n.body}</p> : null}
                      {from ? (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                          <Avatar name={from.name} src={from.avatarUrl} size="sm" />
                          <span>{from.name}</span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
