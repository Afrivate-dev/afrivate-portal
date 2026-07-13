import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Megaphone,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Users as UsersIcon,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/useConfirm'
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
import { ComposerDraftsPanel } from '@/components/shared/ComposerDraftsPanel'
import {
  AnnouncementMediaGallery,
  MediaAttachmentEditor,
} from '@/components/shared/AnnouncementAttachments'
import { InstagramFeedCard } from '@/components/shared/InstagramFeedCard'
import { PortalMediaGallery } from '@/components/shared/PortalMediaGallery'
import { MemoDocumentBody } from '@/components/shared/MemoDocumentBody'
import { labelForConfigId } from '@/lib/portalConfig'
import { notifySuccess } from '@/lib/notify'
import { isMemoPayload, type ComposerDraft, type MemoDraftPayload } from '@/lib/composerDrafts'
import { useComposerDrafts } from '@/hooks/useComposerDrafts'
import { cn, fmtDate, fmtTime, isAdmin, isHR, isTeamLead, relativeTime } from '@/utils/helpers'
import { mergedDepartmentNames } from '@/lib/departments'
import { userSeesAnnouncement } from '@/lib/announcementVisibility'
import {
  canPublishMemo,
  memoGalleryMedia,
  pickMemoBodyDocument,
  resolveMemoTitle,
  titleFromAttachmentName,
  usesDocumentAsMemoBody,
} from '@/utils/documentPreview'
import { pages, actions, confirms } from '@/content/copy'
import type { Announcement, AnnouncementMedia, AnnouncementPriority, User } from '@/types'

type PriorityFilter = 'all' | AnnouncementPriority
type MemoFilter = 'all' | string

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
  memoCategory: string
  media: AnnouncementMedia[]
}

const emptyDraft: FormDraft = {
  title: '',
  body: '',
  audience: 'all',
  priority: 'info',
  memoCategory: 'general',
  media: [],
}

const draftFromAnnouncement = (a: Announcement): FormDraft => ({
  id: a.id,
  title: a.title,
  body: a.body,
  audience: a.audience,
  priority: a.priority,
  memoCategory: a.memoCategory ?? 'general',
  media: a.media ? [...a.media] : [],
})

export function AnnouncementsPage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    announcements,
    users,
    departments: orgDepartments,
    memoCategories,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    markAnnouncementRead,
  } = useData()
  const { setActivity, readersForUpdate, multiplayerLive } = useCollab()

  const canPost = isTeamLead(user)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [memoFilter, setMemoFilter] = useState<MemoFilter>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [readingId, setReadingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<FormDraft>(emptyDraft)
  const [composerDraftId, setComposerDraftId] = useState<string | undefined>()
  const [composerSourceId, setComposerSourceId] = useState<string | undefined>()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const { byKind, saveDraft, deleteDraft, getById, store } = useComposerDrafts()
  const openedDraftParam = useRef<string | null>(null)

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || !user) return
    const target = announcements.find((a) => a.id === openId)
    if (!target || !userSeesAnnouncement(target, user)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('open')
          return next
        },
        { replace: true },
      )
      return
    }
    setReadingId(openId)
    if (!target.readBy.includes(user.id)) markAnnouncementRead(openId, user.id)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('open')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams, announcements, user, markAnnouncementRead])

  useEffect(() => {
    if (searchParams.get('unread') !== '1') return
    setUnreadOnly(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('unread')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const draftId = searchParams.get('draft')
    if (!draftId) {
      openedDraftParam.current = null
      return
    }
    if (openedDraftParam.current === draftId) return
    if (!canPost) {
      openedDraftParam.current = draftId
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('draft')
          return next
        },
        { replace: true },
      )
      return
    }
    const saved = getById(draftId)
    if (!saved) {
      // Wait until store has seeded / loaded
      if (!store.seededRevivalMemos && store.drafts.length === 0) return
      openedDraftParam.current = draftId
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('draft')
          return next
        },
        { replace: true },
      )
      return
    }
    if (saved.kind !== 'memo' || !isMemoPayload(saved.payload)) {
      openedDraftParam.current = draftId
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('draft')
          return next
        },
        { replace: true },
      )
      return
    }
    openedDraftParam.current = draftId
    const p = saved.payload
    setDraft({
      id: p.editId,
      title: p.title,
      body: p.body,
      audience: p.audience,
      priority: p.priority,
      memoCategory: p.memoCategory,
      media: p.media ? [...p.media] : [],
    })
    setComposerDraftId(saved.id)
    setComposerSourceId(saved.sourceId)
    setFormOpen(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('draft')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams, canPost, getById, store.seededRevivalMemos, store.drafts.length])

  useEffect(() => {
    if (readingId) {
      setActivity({ readingUpdateId: readingId, composingUpdate: undefined })
    } else if (formOpen && canPost) {
      setActivity({ readingUpdateId: undefined, composingUpdate: true })
    } else {
      setActivity({ readingUpdateId: undefined, composingUpdate: undefined })
    }
  }, [readingId, formOpen, canPost, setActivity])

  const audienceDepartments = useMemo(
    () => mergedDepartmentNames(orgDepartments, users),
    [orgDepartments, users],
  )

  const visibleAnnouncements = useMemo(() => {
    if (!user) return []
    return announcements.filter((a) => {
      if (!userSeesAnnouncement(a, user)) return false
      if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false
      const cat = a.memoCategory ?? 'general'
      if (memoFilter !== 'all' && cat !== memoFilter) return false
      if (unreadOnly && a.readBy.includes(user.id)) return false
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
  }, [announcements, user, priorityFilter, memoFilter, search, unreadOnly])

  const hasUnread = useMemo(() => {
    if (!user) return false
    return announcements.some(
      (a) => userSeesAnnouncement(a, user) && !a.readBy.includes(user.id),
    )
  }, [announcements, user])

  const filtersActive = !!search.trim() || priorityFilter !== 'all' || memoFilter !== 'all' || unreadOnly
  const reading = readingId ? announcements.find((a) => a.id === readingId) ?? null : null
  const readingBodyDoc =
    reading && usesDocumentAsMemoBody(reading.body, reading.media)
      ? pickMemoBodyDocument(reading.media)
      : null
  const readingGallery = reading ? memoGalleryMedia(reading.body, reading.media) : undefined
  const readingReaders =
    reading && multiplayerLive ? readersForUpdate(reading.id) : []
  const readingAuthor = reading ? users.find((u) => u.id === reading.postedById) : undefined
  const userById = (id: string) => users.find((u) => u.id === id)

  if (!user) return null

  const canSeeMemoReaders = (a: Announcement) =>
    a.postedById === user.id || isHR(user) || isAdmin(user)

  const resumeComposerDraft = (saved: ComposerDraft) => {
    if (!isMemoPayload(saved.payload)) return
    const p = saved.payload
    setDraft({
      id: p.editId,
      title: p.title,
      body: p.body,
      audience: p.audience,
      priority: p.priority,
      memoCategory: p.memoCategory,
      media: p.media ? [...p.media] : [],
    })
    setComposerDraftId(saved.id)
    setComposerSourceId(saved.sourceId)
    setFormOpen(true)
  }

  const openCreate = () => {
    setDraft(emptyDraft)
    setComposerDraftId(undefined)
    setComposerSourceId(undefined)
    setFormOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setDraft(draftFromAnnouncement(a))
    setComposerDraftId(undefined)
    setComposerSourceId(undefined)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setDraft(emptyDraft)
    setComposerDraftId(undefined)
    setComposerSourceId(undefined)
  }

  const saveAsDraft = () => {
    if (!draft.title.trim() && !draft.body.trim() && !draft.media.length) return
    const payload: MemoDraftPayload = {
      title: draft.title,
      body: draft.body,
      audience: draft.audience,
      priority: draft.priority,
      memoCategory: draft.memoCategory,
      media: draft.media,
      editId: draft.id,
    }
    const label = resolveMemoTitle(draft.title, draft.media) || 'Untitled memo draft'
    const saved = saveDraft({
      id: composerDraftId,
      kind: 'memo',
      label,
      payload,
      sourceId: composerSourceId,
    })
    setComposerDraftId(saved.id)
    notifySuccess('Draft saved on this device')
    setFormOpen(false)
  }

  const applyMediaChange = (media: AnnouncementMedia[]) => {
    setDraft((prev) => {
      const next = { ...prev, media }
      if (!prev.title.trim()) {
        const primary = pickMemoBodyDocument(media)
        if (primary?.fileName) next.title = titleFromAttachmentName(primary.fileName)
      }
      return next
    })
  }

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canPublishMemo(draft.title, draft.body, draft.media)) return
    const title = resolveMemoTitle(draft.title, draft.media)
    const body = draft.body.trim()
    const payload = {
      title,
      body,
      audience: draft.audience,
      priority: draft.priority,
      memoCategory: draft.memoCategory,
      media: draft.media.length > 0 ? draft.media : [],
      ...(draft.id ? {} : { postedById: user.id }),
    }
    if (draft.id) {
      updateAnnouncement(draft.id, {
        title: payload.title,
        body: payload.body,
        audience: payload.audience,
        priority: payload.priority,
        memoCategory: payload.memoCategory,
        media: payload.media,
      })
    } else {
      createAnnouncement({ ...payload, postedById: user.id })
    }
    if (composerDraftId) deleteDraft(composerDraftId)
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

      {canPost ? (
        <ComposerDraftsPanel
          title="Memo drafts"
          description="Saved on this device — resume to edit or publish when ready."
          drafts={byKind.memo}
          onResume={resumeComposerDraft}
          onDelete={deleteDraft}
        />
      ) : null}

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
                label="Type"
                value={memoFilter}
                onChange={(e) => setMemoFilter(e.target.value as MemoFilter)}
                options={[
                  { value: 'all', label: 'All types' },
                  ...memoCategories.map((c) => ({ value: c.id, label: c.label })),
                ]}
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
                onClick={async () => {
                  const ok = await confirm({ message: confirms.markAllUpdatesRead })
                  if (ok) {
                    for (const a of announcements) {
                      if (userSeesAnnouncement(a, user) && !a.readBy.includes(user.id)) {
                        markAnnouncementRead(a.id, user.id)
                      }
                    }
                  }
                }}
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
        <ul className="av-stagger mx-auto flex max-w-lg flex-col gap-4 sm:gap-5">
          {visibleAnnouncements.map((a) => {
            const meta = PRIORITY_UI[a.priority]
            const author = userById(a.postedById)
            const unread = !a.readBy.includes(user.id)
            const canEdit =
              a.postedById === user.id || isHR(user) || isAdmin(user)
            const canDelete = isHR(user) || isAdmin(user)
            const docAsBody = usesDocumentAsMemoBody(a.body, a.media)
            const bodyDoc = docAsBody ? pickMemoBodyDocument(a.media) : null
            const gallery = memoGalleryMedia(a.body, a.media)
            return (
              <li key={a.id}>
                <InstagramFeedCard
                  className={cn(
                    meta.border,
                    meta.shadow,
                    unread && 'ring-1 ring-accent/30',
                  )}
                  onClick={() => openDetail(a)}
                  header={
                    <>
                      {author ? (
                        <Avatar name={author.name} src={author.avatarUrl} size="sm" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">
                          {author?.name ?? U.unknownAuthor}
                        </p>
                        <p className="text-xs text-muted">{relativeTime(a.postedAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {unread ? (
                          <span className="h-2 w-2 rounded-full bg-accent" aria-label="Unread" />
                        ) : null}
                        <Badge tone={meta.tone}>{announcementPriorityLabel(a.priority)}</Badge>
                        {a.memoCategory && a.memoCategory !== 'general' ? (
                          <Badge tone={a.memoCategory === 'digest' ? 'info' : 'warning'}>
                            {labelForConfigId(a.memoCategory, memoCategories)}
                          </Badge>
                        ) : null}
                        {canEdit || canDelete ? (
                          <div className="flex items-center gap-0.5">
                            {canEdit ? (
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
                            ) : null}
                            {canDelete ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteConfirmId(a.id)
                                }}
                                aria-label={U.deleteAria}
                                className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger ring-focus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </>
                  }
                  media={
                    gallery?.length ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <PortalMediaGallery media={gallery} variant="feed" />
                      </div>
                    ) : undefined
                  }
                  caption={
                    <>
                      <p className="text-sm font-semibold text-fg">{a.title}</p>
                      {a.body.trim() ? (
                        <p className="whitespace-pre-line text-sm text-fg/90">{a.body}</p>
                      ) : null}
                      {bodyDoc ? (
                        <div className="mt-2">
                          <MemoDocumentBody item={bodyDoc} siblings={a.media} compact />
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {a.audience !== 'all' ? (
                          <Badge tone="muted">
                            <UsersIcon className="h-3 w-3" /> {a.audience}
                          </Badge>
                        ) : null}
                        {canSeeMemoReaders(a) ? (
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {U.openedCount.replace('{n}', String(a.readBy.length))}
                          </span>
                        ) : null}
                      </div>
                    </>
                  }
                />
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
              {canSeeMemoReaders(reading) ? (
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
            {reading.body.trim() ? (
              <p className="whitespace-pre-line text-sm text-fg/90">{reading.body}</p>
            ) : null}
            {readingBodyDoc ? (
              <MemoDocumentBody item={readingBodyDoc} siblings={reading.media} />
            ) : null}
            {readingGallery?.length ? (
              <AnnouncementMediaGallery media={readingGallery} variant="feed" />
            ) : null}
            {canSeeMemoReaders(reading) ? (
              <MemoReadersPanel readerIds={reading.readBy} userById={userById} />
            ) : null}
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
            <Button
              variant="secondary"
              type="button"
              onClick={saveAsDraft}
              disabled={!draft.title.trim() && !draft.body.trim() && !draft.media.length}
            >
              Save draft
            </Button>
            <Button
              type="button"
              onClick={submitForm}
              disabled={!canPublishMemo(draft.title, draft.body, draft.media)}
            >
              {draft.id ? actions.save : U.newPost}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitForm}>
          <Input
            label={U.formTitleLabel}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder={U.formTitlePlaceholder}
          />
          {canPost ? (
            <MediaAttachmentEditor items={draft.media} onChange={applyMediaChange} />
          ) : null}
          <Textarea
            label={
              usesDocumentAsMemoBody(draft.body, draft.media)
                ? `${U.formBodyLabel} (optional — document is the memo)`
                : `${U.formBodyLabel} (or upload a document above instead)`
            }
            rows={5}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder={U.formBodyPlaceholder}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={U.formAudienceLabel}
              value={draft.audience}
              onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
              options={[
                { value: 'all', label: U.everyone },
                ...audienceDepartments.map((d) => ({ value: d, label: d })),
              ]}
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
          {canPost ? (
            <Select
              label="Memo type"
              value={draft.memoCategory}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  memoCategory: e.target.value as FormDraft['memoCategory'],
                })
              }
              options={memoCategories.map((c) => ({ value: c.id, label: c.label }))}
            />
          ) : null}
        </form>
      </Modal>

      {/* Delete announcement confirmation */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete announcement"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              {actions.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirmId) deleteAnnouncement(deleteConfirmId)
                setDeleteConfirmId(null)
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg">{U.deleteConfirm}</p>
      </Modal>
    </div>
  )
}

function MemoReadersPanel({
  readerIds,
  userById,
}: {
  readerIds: string[]
  userById: (id: string) => User | undefined
}) {
  const readers = readerIds.map((id) => userById(id)).filter(Boolean) as User[]

  return (
    <div className="rounded-md border border-border bg-surface-2/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{U.readersTitle}</p>
      {readers.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{U.readersEmpty}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {readers.map((u) => (
            <li
              key={u.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-fg"
            >
              <Avatar name={u.name} src={u.avatarUrl} size="xs" />
              <span>{u.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
