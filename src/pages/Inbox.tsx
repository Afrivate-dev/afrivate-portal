import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox as InboxIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/useConfirm'
import { useData } from '@/context/DataContext'
import { confirms } from '@/content/copy'
import { getInboxTypeMeta, resolveInboxLink } from '@/lib/inboxNotifications'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { cn, relativeTime } from '@/utils/helpers'
import { pages } from '@/content/copy'
import type { InboxNotification } from '@/types'

const I = pages.inbox

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
    navigate(resolveInboxLink(n))
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
            const meta = getInboxTypeMeta(n.type)
            const Icon = meta.icon
            const from = n.fromUserId ? users.find((u) => u.id === n.fromUserId) : undefined
            const title = n.title?.trim() || meta.label
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
                      <p className="mt-1 font-semibold text-fg">{title}</p>
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
