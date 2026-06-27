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
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/ConfirmContext'
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
import { PortalMediaGallery } from '@/components/shared/PortalMediaGallery'
import { MediaAttachmentEditor } from '@/components/shared/AnnouncementAttachments'
import { cn, relativeTime } from '@/utils/helpers'
import type { AnnouncementMedia, RecognitionComment, RecognitionPost, User } from '@/types'

type Tag = RecognitionPost['tag']

const TAG_META: Record<
  Tag,
  { label: string; icon: typeof Sparkles; chipBg: string; chipText: string }
> = {
  great_work: {
    label: 'Great Work',
    icon: Sparkles,
    chipBg: 'bg-amber-500/15',
    chipText: 'text-amber-600 dark:text-amber-300',
  },
  team_player: {
    label: 'Team Player',
    icon: UsersIcon,
    chipBg: 'bg-blue-500/15',
    chipText: 'text-blue-600 dark:text-blue-300',
  },
  innovation: {
    label: 'Innovation',
    icon: Lightbulb,
    chipBg: 'bg-purple-500/15',
    chipText: 'text-purple-600 dark:text-purple-300',
  },
  above_beyond: {
    label: 'Above & Beyond',
    icon: Star,
    chipBg: 'bg-pink-500/15',
    chipText: 'text-pink-600 dark:text-pink-300',
  },
  leadership: {
    label: 'Leadership',
    icon: Crown,
    chipBg: 'bg-emerald-500/15',
    chipText: 'text-emerald-600 dark:text-emerald-300',
  },
}

const TAG_OPTIONS = (Object.keys(TAG_META) as Tag[]).map((t) => ({
  value: t,
  label: TAG_META[t].label,
}))

const MAX_LENGTH = 280

interface FormDraft {
  receiverId: string
  tag: Tag
  message: string
  media: AnnouncementMedia[]
}

function shoutoutShareUrl(id: string) {
  return `${window.location.origin}/recognition?open=${encodeURIComponent(id)}`
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
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <MessageCircle className="h-3.5 w-3.5" /> Comments
        {rows.length > 0 ? <span className="font-normal normal-case">({rows.length})</span> : null}
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Be the first to comment on this shout-out.</p>
      ) : (
        <ul className="max-h-56 space-y-3 overflow-y-auto text-sm">
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Textarea
          label="Add a comment"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something nice…"
        />
        <Button type="button" size="sm" disabled={!draft.trim()} onClick={send} className="shrink-0">
          Comment
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
    toggleRecognitionReaction,
    addRecognitionComment,
  } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const postRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const [draft, setDraft] = useState<FormDraft>({
    receiverId: '',
    tag: 'great_work',
    message: '',
    media: [],
  })

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
    setHighlightId(openId)
    setSearchParams({}, { replace: true })
    requestAnimationFrame(() => {
      postRefs.current[openId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const timer = setTimeout(() => setHighlightId(null), 2500)
    return () => clearTimeout(timer)
  }, [searchParams, setSearchParams, recognition])

  if (!user) return null

  const openForm = () => {
    setDraft({
      receiverId: otherUsers[0]?.id ?? '',
      tag: 'great_work',
      message: '',
      media: [],
    })
    setFormOpen(true)
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recognition wall"
        description="Shoutouts for great work across the team."
        actions={
          <Button onClick={openForm} disabled={otherUsers.length === 0}>
            <Plus className="h-4 w-4" /> Give shoutout
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
        <ul className="space-y-3">
          {sorted.map((r) => {
            const giver = users.find((u) => u.id === r.giverId)
            const receiver = users.find((u) => u.id === r.receiverId)
            const meta = TAG_META[r.tag]
            const reacted = r.reactedBy.includes(user.id)
            const TagIcon = meta.icon
            const commentCount = recognitionComments.filter((c) => c.recognitionId === r.id).length
            if (!giver || !receiver) return null
            const aboutMe = r.receiverId === user.id
            const highlighted = highlightId === r.id
            return (
              <li
                key={r.id}
                ref={(el) => {
                  postRefs.current[r.id] = el
                }}
              >
                <Card
                  padding="md"
                  className={cn(
                    aboutMe && 'ring-2 ring-pink-500/40',
                    highlighted && 'ring-2 ring-accent animate-pulse',
                  )}
                >
                  {aboutMe ? (
                    <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 dark:text-pink-300">
                      <Award className="h-3.5 w-3.5" /> This one’s for you
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 text-sm">
                    <Avatar name={giver.name} src={giver.avatarUrl} size="sm" />
                    <span className="font-semibold text-fg">{giver.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted" />
                    <Avatar name={receiver.name} src={receiver.avatarUrl} size="sm" />
                    <span className="font-semibold text-fg">{receiver.name}</span>
                    <span className="ml-auto hidden text-xs text-muted sm:inline">
                      {relativeTime(r.createdAt)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-fg/90">{r.message}</p>

                  {r.media?.length ? <PortalMediaGallery media={r.media} compact /> : null}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                        meta.chipBg,
                        meta.chipText,
                      )}
                    >
                      <TagIcon className="h-3 w-3" /> {meta.label}
                    </span>

                    <div className="flex items-center gap-3 text-xs text-muted sm:hidden">
                      <span>{relativeTime(r.createdAt)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRecognitionReaction(r.id, user.id)}
                        title="React"
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ring-focus',
                          reacted
                            ? 'border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-300'
                            : 'border-border bg-surface text-fg hover:bg-surface-2',
                        )}
                      >
                        <Heart className={cn('h-3.5 w-3.5', reacted && 'fill-current')} />
                        {r.reactedBy.length}
                      </button>

                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {commentCount}
                      </span>

                      <button
                        type="button"
                        onClick={() => void sharePost(r)}
                        title="Share link to this shout-out"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg transition-colors hover:bg-surface-2 ring-focus"
                      >
                        {copiedId === r.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-success" /> Copied
                          </>
                        ) : (
                          <>
                            <Share2 className="h-3.5 w-3.5" /> Share
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <RecognitionCommentThread
                    postId={r.id}
                    comments={recognitionComments}
                    users={users}
                    currentUserId={user.id}
                    onSend={(body) => addRecognitionComment(r.id, body)}
                  />
                </Card>
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
            onChange={(e) => setDraft({ ...draft, tag: e.target.value as Tag })}
            options={TAG_OPTIONS}
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
    </div>
  )
}
