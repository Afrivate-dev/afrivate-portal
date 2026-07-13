import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Heart,
  Plus,
  ArrowRight,
  Sparkles,
  Award,
  Users as UsersIcon,
  Lightbulb,
  Star,
  Crown,
  MessageCircle,
  Share2,
  Check,
  Trash2,
  Settings2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/useConfirm'
import { confirms } from '@/content/copy'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { ComposerDraftsPanel } from '@/components/shared/ComposerDraftsPanel'
import { InstagramFeedCard } from '@/components/shared/InstagramFeedCard'
import { PortalMediaGallery } from '@/components/shared/PortalMediaGallery'
import { MediaAttachmentEditor } from '@/components/shared/AnnouncementAttachments'
import { ManageLabelCategoriesModal } from '@/components/shared/ManageLabelCategoriesModal'
import { notifySuccess } from '@/lib/notify'
import { isShoutoutPayload, type ComposerDraft, type ShoutoutDraftPayload } from '@/lib/composerDrafts'
import { useComposerDrafts } from '@/hooks/useComposerDrafts'
import { cn, relativeTime, isHR } from '@/utils/helpers'
import type { AnnouncementMedia, RecognitionComment, RecognitionPost, User } from '@/types'

type Tag = string

const TAG_STYLE_PRESETS: {
  icon: typeof Sparkles
  chipBg: string
  chipText: string
}[] = [
  {
    icon: Sparkles,
    chipBg: 'bg-amber-500/15',
    chipText: 'text-amber-600 dark:text-amber-300',
  },
  {
    icon: UsersIcon,
    chipBg: 'bg-blue-500/15',
    chipText: 'text-blue-600 dark:text-blue-300',
  },
  {
    icon: Lightbulb,
    chipBg: 'bg-purple-500/15',
    chipText: 'text-purple-600 dark:text-purple-300',
  },
  {
    icon: Star,
    chipBg: 'bg-pink-500/15',
    chipText: 'text-pink-600 dark:text-pink-300',
  },
  {
    icon: Crown,
    chipBg: 'bg-emerald-500/15',
    chipText: 'text-emerald-600 dark:text-emerald-300',
  },
]

function resolveTagMeta(tagId: string, tags: { id: string; label: string }[]) {
  const index = tags.findIndex((t) => t.id === tagId)
  const preset = TAG_STYLE_PRESETS[index >= 0 ? index % TAG_STYLE_PRESETS.length : 0]
  const label = tags.find((t) => t.id === tagId)?.label ?? tagId.replace(/_/g, ' ')
  return { label, ...preset }
}

const MAX_LENGTH = 280

interface FormDraft {
  receiverId: string
  tag: Tag
  message: string
  media: AnnouncementMedia[]
}

function shoutoutShareUrl(id: string) {
  return `${window.location.origin}/people/shout-outs?open=${encodeURIComponent(id)}`
}

function RecognitionCommentThread({
  postId,
  comments,
  users,
  currentUserId,
  onSend,
}: {
  postId: string
  comments: RecognitionComment[]
  users: User[]
  currentUserId: string
  onSend: (body: string) => void
}) {
  const [draft, setDraft] = useState('')
  const rows = comments.filter((c) => c.recognitionId === postId)

  const send = () => {
    if (!draft.trim()) return
    onSend(draft.trim())
    setDraft('')
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Be the first to comment.</p>
      ) : (
        <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
          {rows.map((c) => {
            const author = users.find((u) => u.id === c.userId)
            const mine = c.userId === currentUserId
            return (
              <li key={c.id} className={cn('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}>
                {author ? (
                  <Avatar name={author.name} src={author.avatarUrl} size="xs" className="mt-0.5 shrink-0" />
                ) : null}
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2',
                    mine ? 'bg-accent/15 text-fg' : 'bg-surface-2 text-fg',
                  )}
                >
                  <p className="text-[11px] font-medium text-muted">{author?.name ?? 'User'}</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
                  <p className="mt-1 text-[10px] text-muted">{relativeTime(c.createdAt)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex gap-2 border-t border-border pt-3">
        <Textarea
          label=""
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          aria-label="Add a comment"
        />
        <Button
          type="button"
          size="sm"
          disabled={!draft.trim()}
          onClick={send}
          className="shrink-0 self-end"
        >
          Post
        </Button>
      </div>
    </div>
  )
}

export function RecognitionPage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const {
    users,
    recognition,
    recognitionComments,
    giveRecognition,
    deleteRecognition,
    toggleRecognitionReaction,
    addRecognitionComment,
    recognitionTags,
    addRecognitionTag,
    updateRecognitionTag,
    deleteRecognitionTag,
  } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const postRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const [draft, setDraft] = useState<FormDraft>({
    receiverId: '',
    tag: 'great_work',
    message: '',
    media: [],
  })
  const [composerDraftId, setComposerDraftId] = useState<string | undefined>()
  const { byKind, saveDraft, deleteDraft, getById } = useComposerDrafts()
  const openedDraftParam = useRef<string | null>(null)

  const canManageTags = isHR(user)
  const defaultTagId = recognitionTags[0]?.id ?? 'great_work'

  const otherUsers = useMemo(
    () => (user ? users.filter((u) => u.active && u.id !== user.id) : []),
    [users, user],
  )

  const sorted = useMemo(
    () => [...recognition].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
    [recognition],
  )

  const stats = useMemo(() => {
    if (!user) return { given: 0, received: 0 }
    return {
      given: recognition.filter((r) => r.giverId === user.id).length,
      received: recognition.filter((r) => r.receiverId === user.id).length,
    }
  }, [recognition, user])

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    const target = recognition.find((r) => r.id === openId)
    if (!target) return
    const frameId = requestAnimationFrame(() => {
      setHighlightId(openId)
      setSearchParams({}, { replace: true })
      requestAnimationFrame(() => {
        postRefs.current[openId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })
    const timer = setTimeout(() => setHighlightId(null), 2500)
    return () => {
      cancelAnimationFrame(frameId)
      clearTimeout(timer)
    }
  }, [searchParams, setSearchParams, recognition])

  useEffect(() => {
    const draftId = searchParams.get('draft')
    if (!draftId) {
      openedDraftParam.current = null
      return
    }
    if (openedDraftParam.current === draftId) return
    const saved = getById(draftId)
    if (!saved || saved.kind !== 'shoutout' || !isShoutoutPayload(saved.payload)) {
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
      receiverId: p.receiverId,
      tag: p.tag,
      message: p.message,
      media: p.media ? [...p.media] : [],
    })
    setComposerDraftId(saved.id)
    setFormOpen(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('draft')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams, getById])

  if (!user) return null

  const resumeComposerDraft = (saved: ComposerDraft) => {
    if (!isShoutoutPayload(saved.payload)) return
    const p = saved.payload
    setDraft({
      receiverId: p.receiverId || otherUsers[0]?.id || '',
      tag: p.tag || defaultTagId,
      message: p.message,
      media: p.media ? [...p.media] : [],
    })
    setComposerDraftId(saved.id)
    setFormOpen(true)
  }

  const openForm = () => {
    setDraft({
      receiverId: otherUsers[0]?.id ?? '',
      tag: defaultTagId,
      message: '',
      media: [],
    })
    setComposerDraftId(undefined)
    setFormOpen(true)
  }

  const saveAsDraft = () => {
    if (!draft.message.trim() && !draft.receiverId) return
    const payload: ShoutoutDraftPayload = {
      receiverId: draft.receiverId,
      tag: draft.tag,
      message: draft.message,
      media: draft.media,
    }
    const recipient = users.find((u) => u.id === draft.receiverId)?.name
    const label = recipient
      ? `Shout-out to ${recipient}`
      : draft.message.trim().slice(0, 40) || 'Untitled shout-out draft'
    const saved = saveDraft({
      id: composerDraftId,
      kind: 'shoutout',
      label,
      payload,
    })
    setComposerDraftId(saved.id)
    notifySuccess('Draft saved on this device')
    setFormOpen(false)
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.receiverId || !draft.message.trim()) return
    const ok = await confirm({
      title: confirms.sendRecognitionTitle,
      message: confirms.sendRecognition,
      confirmLabel: 'Send',
    })
    if (!ok) return
    giveRecognition({
      giverId: user.id,
      receiverId: draft.receiverId,
      tag: draft.tag,
      message: draft.message.trim(),
      media: draft.media.length ? draft.media : undefined,
    })
    if (composerDraftId) deleteDraft(composerDraftId)
    setComposerDraftId(undefined)
    setFormOpen(false)
  }

  const sharePost = async (post: RecognitionPost) => {
    const url = shoutoutShareUrl(post.id)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shout-out on AfriVate',
          text: post.message.slice(0, 120),
          url,
        })
        return
      } catch {
        /* user cancelled or unsupported */
      }
    }
    await navigator.clipboard.writeText(url)
    setCopiedId(post.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deletePost = async (id: string) => {
    const ok = await confirm({
      title: confirms.deleteRecognitionTitle,
      message: confirms.deleteRecognition,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    deleteRecognition(id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shout-outs"
        description="Celebrate great work across the team."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {canManageTags ? (
              <Button variant="secondary" onClick={() => setManageTagsOpen(true)} className="w-full sm:w-auto">
                <Settings2 className="h-4 w-4" /> Manage tags
              </Button>
            ) : null}
            <Button onClick={openForm} disabled={otherUsers.length === 0} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Give shoutout
            </Button>
          </div>
        }
      />

      <ComposerDraftsPanel
        title="Shout-out drafts"
        description="Saved on this device — resume to edit or post when ready."
        drafts={byKind.shoutout}
        onResume={resumeComposerDraft}
        onDelete={deleteDraft}
      />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-300">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Received</p>
              <p className="mt-0.5 text-2xl font-bold text-fg">{stats.received}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-300">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Given</p>
              <p className="mt-0.5 text-2xl font-bold text-fg">{stats.given}</p>
            </div>
          </div>
        </Card>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No shoutouts yet"
          description="Be the first to celebrate someone’s work."
          action={
            <Button onClick={openForm} disabled={otherUsers.length === 0}>
              <Plus className="h-4 w-4" /> Give shoutout
            </Button>
          }
        />
      ) : (
        <ul className="av-stagger mx-auto flex max-w-lg flex-col gap-4 sm:gap-5">
          {sorted.map((r) => {
            const giver = users.find((u) => u.id === r.giverId)
            const receiver = users.find((u) => u.id === r.receiverId)
            const meta = resolveTagMeta(r.tag, recognitionTags)
            const reacted = r.reactedBy.includes(user.id)
            const TagIcon = meta.icon
            const commentCount = recognitionComments.filter((c) => c.recognitionId === r.id).length
            if (!giver || !receiver) return null
            const aboutMe = r.receiverId === user.id
            const isMine = r.giverId === user.id
            const highlighted = highlightId === r.id
            return (
              <li
                key={r.id}
                ref={(el) => {
                  postRefs.current[r.id] = el
                }}
              >
                <InstagramFeedCard
                  className={cn(
                    aboutMe && 'ring-2 ring-pink-500/40',
                    highlighted && 'ring-2 ring-accent',
                  )}
                  header={
                    <>
                      <Avatar name={giver.name} src={giver.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">
                          {giver.name}
                          <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-muted" />
                          {receiver.name}
                        </p>
                        <p className="text-xs text-muted">{relativeTime(r.createdAt)}</p>
                      </div>
                      {aboutMe ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/15 px-2 py-0.5 text-[10px] font-semibold text-pink-600 dark:text-pink-300">
                          <Award className="h-3 w-3" /> For you
                        </span>
                      ) : null}
                      {isMine ? (
                        <button
                          type="button"
                          onClick={() => void deletePost(r.id)}
                          title="Delete shout-out"
                          aria-label="Delete shout-out"
                          className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger ring-focus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </>
                  }
                  media={
                    r.media?.length ? (
                      <PortalMediaGallery media={r.media} variant="feed" />
                    ) : undefined
                  }
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => toggleRecognitionReaction(r.id, user.id)}
                        title="Like"
                        className={cn(
                          'rounded-md p-2 ring-focus transition hover:bg-surface-2',
                          reacted ? 'text-pink-600 dark:text-pink-300' : 'text-fg',
                        )}
                      >
                        <Heart className={cn('h-6 w-6', reacted && 'fill-current')} />
                      </button>
                      <button
                        type="button"
                        title={`${commentCount} comments`}
                        className="rounded-md p-2 text-fg ring-focus transition hover:bg-surface-2"
                        onClick={() => {
                          postRefs.current[r.id]?.querySelector('textarea')?.focus()
                        }}
                      >
                        <MessageCircle className="h-6 w-6" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void sharePost(r)}
                        title="Share"
                        className="rounded-md p-2 text-fg ring-focus transition hover:bg-surface-2"
                      >
                        {copiedId === r.id ? (
                          <Check className="h-6 w-6 text-success" />
                        ) : (
                          <Share2 className="h-6 w-6" />
                        )}
                      </button>
                      {r.reactedBy.length > 0 ? (
                        <span className="ml-auto text-sm font-semibold text-fg">
                          {r.reactedBy.length} {r.reactedBy.length === 1 ? 'like' : 'likes'}
                        </span>
                      ) : null}
                    </>
                  }
                  caption={
                    <>
                      <p className="whitespace-pre-line text-sm text-fg/90">
                        <span className="font-semibold text-fg">{giver.name}</span> {r.message}
                      </p>
                      <span
                        className={cn(
                          'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          meta.chipBg,
                          meta.chipText,
                        )}
                      >
                        <TagIcon className="h-3 w-3" /> {meta.label}
                      </span>
                    </>
                  }
                  footer={
                    <RecognitionCommentThread
                      postId={r.id}
                      comments={recognitionComments}
                      users={users}
                      currentUserId={user.id}
                      onSend={(body) => addRecognitionComment(r.id, body)}
                    />
                  }
                />
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Give shoutout"
        description="Recognise someone for great work."
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={saveAsDraft}
              disabled={!draft.message.trim() && !draft.receiverId}
            >
              Save draft
            </Button>
            <Button
              type="button"
              onClick={submitForm}
              disabled={
                !draft.receiverId ||
                !draft.message.trim() ||
                draft.message.length > MAX_LENGTH
              }
            >
              Post shoutout
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitForm}>
          <Select
            label="Recipient"
            value={draft.receiverId}
            onChange={(e) => setDraft({ ...draft, receiverId: e.target.value })}
            options={otherUsers.map((u) => ({
              value: u.id,
              label: `${u.name} — ${u.jobTitle}`,
            }))}
            required
          />
          <Select
            label="Tag"
            value={draft.tag}
            onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
            options={recognitionTags.map((t) => ({
              value: t.id,
              label: t.label,
            }))}
          />
          <div>
            <Textarea
              label="Message"
              required
              rows={4}
              maxLength={MAX_LENGTH}
              value={draft.message}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
              placeholder="Be specific — what did they do and why does it matter?"
            />
            <div className="mt-1 flex justify-end">
              <span
                className={cn(
                  'text-[11px]',
                  draft.message.length > MAX_LENGTH - 20 ? 'text-warning' : 'text-muted',
                )}
              >
                {draft.message.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>
          <MediaAttachmentEditor
            items={draft.media}
            onChange={(media) => setDraft({ ...draft, media })}
          />
        </form>
      </Modal>

      <ManageLabelCategoriesModal
        open={manageTagsOpen}
        onClose={() => setManageTagsOpen(false)}
        title="Manage shout-out tags"
        description="HR and admins can manage these."
        items={recognitionTags}
        onAdd={addRecognitionTag}
        onUpdate={updateRecognitionTag}
        onDelete={deleteRecognitionTag}
      />
    </div>
  )
}
