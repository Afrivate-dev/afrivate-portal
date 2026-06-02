import { useMemo, useState, useEffect } from 'react'
import {
  Megaphone,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Users as UsersIcon,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useCollab } from '@/context/CollabContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  AnnouncementMediaGallery,
  MediaAttachmentEditor,
} from '@/components/shared/AnnouncementAttachments'
import { cn, fmtDate, fmtTime, isHR, relativeTime } from '@/utils/helpers'
import { pages, actions } from '@/content/copy'
import type { Announcement, AnnouncementMedia, AnnouncementPriority } from '@/types'

type PriorityFilter = 'all' | AnnouncementPriority

const U = pages.updates

const PRIORITY_UI: Record<
  AnnouncementPriority,
  { tone: 'info' | 'warning' | 'danger'; border?: string; shadow?: string }
> = {
  info: { tone: 'info' },
  important: {
    tone: 'warning',
    border: 'border-l-4 border-l-warning',
  },
  urgent: {
    tone: 'danger',
    border: 'border-l-4 border-l-danger',
    shadow: 'shadow-elevated',
  },
}

function announcementPriorityLabel(p: AnnouncementPriority): string {
  return { info: U.priorityFYI, important: U.priorityHeadsUp, urgent: U.priorityAction }[p]
}

interface FormDraft {
  id?: string
  title: string
  body: string
  audience: string
  priority: AnnouncementPriority
  media: AnnouncementMedia[]
}

const emptyDraft: FormDraft = {
  title: '',
  body: '',
  audience: 'all',
  priority: 'info',
  media: [],
}

const draftFromAnnouncement = (a: Announcement): FormDraft => ({
  id: a.id,
  title: a.title,
  body: a.body,
  audience: a.audience,
  priority: a.priority,
  media: a.media ? [...a.media] : [],
})

export function AnnouncementsPage() {
  const { user } = useAuth()
  const {
    announcements,
    users,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    markAnnouncementRead,
    markAllAnnouncementsRead,
  } = useData()
  const { setActivity, readersForUpdate, multiplayerLive } = useCollab()

  const canPost = isHR(user)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [readingId, setReadingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<FormDraft>(emptyDraft)

  useEffect(() => {
    if (readingId) {
      setActivity({ readingUpdateId: readingId, composingUpdate: undefined })
    } else if (formOpen && canPost) {
      setActivity({ readingUpdateId: undefined, composingUpdate: true })
    } else {
      setActivity({ readingUpdateId: undefined, composingUpdate: undefined })
    }
  }, [readingId, formOpen, canPost, setActivity])

  const departments = useMemo(() => {
    const set = new Set(users.map((u) => u.department))
    return ['all', ...Array.from(set).sort()]
  }, [users])

  const visibleAnnouncements = useMemo(() => {
    if (!user) return []
    return announcements.filter((a) => {
      // Audience scoping
      if (a.audience !== 'all' && a.audience !== user.department) return false
      // Priority filter
      if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false
      if (unreadOnly && a.readBy.includes(user.id)) return false
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !a.title.toLowerCase().includes(q) &&
          !a.body.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [announcements, user, priorityFilter, search, unreadOnly])

  const hasUnread = useMemo(() => {
    if (!user) return false
    return announcements.some(
      (a) =>
        (a.audience === 'all' || a.audience === user.department) &&
        !a.readBy.includes(user.id),
    )
  }, [announcements, user])

  const filtersActive = !!search.trim() || priorityFilter !== 'all' || unreadOnly
  const reading = readingId ? announcements.find((a) => a.id === readingId) ?? null : null
  const readingReaders =
    reading && multiplayerLive ? readersForUpdate(reading.id) : []
  const readingAuthor = reading ? users.find((u) => u.id === reading.postedById) : undefined
  const userById = (id: string) => users.find((u) => u.id === id)

  if (!user) return null

  const openCreate = () => {
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setDraft(draftFromAnnouncement(a))
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setDraft(emptyDraft)
  }

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim() || !draft.body.trim()) return
    const payload = {
      title: draft.title.trim(),
      body: draft.body.trim(),
      audience: draft.audience,
      priority: draft.priority,
      postedById: user.id,
      media: draft.media.length > 0 ? draft.media : [],
    }
    if (draft.id) {
      updateAnnouncement(draft.id, payload)
    } else {
      createAnnouncement(payload)
    }
    closeForm()
  }

  const openDetail = (a: Announcement) => {
    setReadingId(a.id)
    if (!a.readBy.includes(user.id)) markAnnouncementRead(a.id, user.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={U.title}
        description={U.subtitle}
        actions={
          canPost ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {U.newPost}
            </Button>
          ) : undefined
        }
      />

      {/* Search + filter */}
      <Card padding="md">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Input
                leadingIcon={<Search className="h-4 w-4" />}
                placeholder={U.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-52">
              <Select
                label={U.priorityFilterLabel}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                options={[
                  { value: 'all', label: U.priorityAll },
                  { value: 'info', label: U.priorityFYI },
                  { value: 'important', label: U.priorityHeadsUp },
                  { value: 'urgent', label: U.priorityAction },
                ]}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-fg lg:pb-0">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent ring-focus"
              />
              {U.unreadOnly}
            </label>
            {hasUnread ? (
              <Button
                variant="secondary"
                type="button"
                className="lg:ml-auto"
                onClick={() => markAllAnnouncementsRead(user.id)}
              >
                {U.markAllRead}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Feed */}
      {visibleAnnouncements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={filtersActive ? U.emptyFilteredTitle : U.emptyFeedTitle}
          description={
            filtersActive
              ? U.emptyFilteredBody
              : canPost
                ? U.emptyFeedBodyPoster
                : U.emptyFeedBodyMember
          }
        />
      ) : (
        <ul className="space-y-3">
          {visibleAnnouncements.map((a) => {
            const meta = PRIORITY_UI[a.priority]
            const author = userById(a.postedById)
            const unread = !a.readBy.includes(user.id)
            const canEdit = canPost && a.postedById === user.id
            return (
              <li key={a.id}>
                <Card
                  padding="md"
                  className={cn(
                    'cursor-pointer transition-shadow',
                    meta.border,
                    meta.shadow,
                    unread && 'ring-1 ring-accent/30',
                  )}
                  onClick={() => openDetail(a)}
                >
                  <div className="flex items-start gap-3">
                    {unread ? (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    ) : (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={cn(
                            'text-base text-fg',
                            unread ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {a.title}
                        </h3>
                        <Badge tone={meta.tone}>{announcementPriorityLabel(a.priority)}</Badge>
                        {a.audience !== 'all' ? (
                          <Badge tone="muted">
                            <UsersIcon className="h-3 w-3" /> {a.audience}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-3 text-sm text-muted">{a.body}</p>
                      <div onClick={(e) => e.stopPropagation()}>
                        <AnnouncementMediaGallery media={a.media} compact />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-muted">
                          {author ? (
                            <>
                              <Avatar name={author.name} src={author.avatarUrl} size="xs" />
                              <span>
                                {author.name} \u00b7 {relativeTime(a.postedAt)}
                              </span>
                            </>
                          ) : (
                            <span>{relativeTime(a.postedAt)}</span>
                          )}
                        </div>
                        {canPost ? (
                          <span className="inline-flex items-center gap-1 text-muted">
                            <Eye className="h-3 w-3" />
                            {U.openedCount.replace('{n}', String(a.readBy.length))}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(a)
                          }}
                          aria-label={U.editAria}
                          className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg ring-focus"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm(U.deleteConfirm)) {
                              deleteAnnouncement(a.id)
                            }
                          }}
                          aria-label={U.deleteAria}
                          className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger ring-focus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {/* Detail modal */}
      <Modal
        open={!!reading}
        onClose={() => setReadingId(null)}
        title={reading?.title}
        size="lg"
      >
        {reading ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={PRIORITY_UI[reading.priority].tone}>
                {announcementPriorityLabel(reading.priority)}
              </Badge>
              {reading.audience !== 'all' ? (
                <Badge tone="muted">
                  <UsersIcon className="h-3 w-3" /> {reading.audience}
                </Badge>
              ) : (
                <Badge tone="muted">{U.everyone}</Badge>
              )}
              {canPost ? (
                <Badge tone="default">
                  <Eye className="h-3 w-3" />{' '}
                  {U.openedCount.replace('{n}', String(reading.readBy.length))}
                </Badge>
              ) : null}
              {readingReaders.length > 0 ? (
                <Badge tone="brand">
                  {readingReaders.length} reading now
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-3 border-y border-border py-3">
              {readingAuthor ? (
                <Avatar name={readingAuthor.name} src={readingAuthor.avatarUrl} size="sm" />
              ) : null}
              <div>
                <p className="text-sm font-medium text-fg">
                  {readingAuthor?.name ?? U.unknownAuthor}
                </p>
                <p className="text-xs text-muted">
                  {fmtDate(reading.postedAt)} at {fmtTime(reading.postedAt)}
                </p>
              </div>
            </div>
            <p className="whitespace-pre-line text-sm text-fg/90">{reading.body}</p>
            <AnnouncementMediaGallery media={reading.media} />
          </div>
        ) : null}
      </Modal>

      {/* Create/edit modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={draft.id ? U.formEditTitle : U.formNewTitle}
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={closeForm}>
              {actions.cancel}
            </Button>
            <Button type="button" onClick={submitForm}>
              {draft.id ? actions.save : U.newPost}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitForm}>
          <Input
            label={U.formTitleLabel}
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder={U.formTitlePlaceholder}
          />
          <Textarea
            label={U.formBodyLabel}
            required
            rows={6}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder={U.formBodyPlaceholder}
          />
          {canPost ? (
            <MediaAttachmentEditor
              items={draft.media}
              onChange={(media) => setDraft({ ...draft, media })}
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={U.formAudienceLabel}
              value={draft.audience}
              onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
              options={departments.map((d) => ({
                value: d,
                label: d === 'all' ? U.everyone : d,
              }))}
            />
            <Select
              label={U.formPriorityLabel}
              value={draft.priority}
              onChange={(e) =>
                setDraft({ ...draft, priority: e.target.value as AnnouncementPriority })
              }
              options={[
                { value: 'info', label: U.priorityFYI },
                { value: 'important', label: U.priorityHeadsUp },
                { value: 'urgent', label: U.priorityAction },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
