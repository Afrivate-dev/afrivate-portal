import { useMemo, useState } from 'react'
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
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, relativeTime } from '@/utils/helpers'
import type { RecognitionPost } from '@/types'

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
}

export function RecognitionPage() {
  const { user } = useAuth()
  const { users, recognition, giveRecognition, toggleRecognitionReaction } = useData()
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<FormDraft>({
    receiverId: '',
    tag: 'great_work',
    message: '',
  })

  const otherUsers = useMemo(
    () => (user ? users.filter((u) => u.active && u.id !== user.id) : []),
    [users, user],
  )

  const sorted = useMemo(
    () =>
      [...recognition].sort((a, b) =>
        a.createdAt > b.createdAt ? -1 : 1,
      ),
    [recognition],
  )

  const stats = useMemo(() => {
    if (!user) return { given: 0, received: 0 }
    return {
      given: recognition.filter((r) => r.giverId === user.id).length,
      received: recognition.filter((r) => r.receiverId === user.id).length,
    }
  }, [recognition, user])

  if (!user) return null

  const openForm = () => {
    setDraft({
      receiverId: otherUsers[0]?.id ?? '',
      tag: 'great_work',
      message: '',
    })
    setFormOpen(true)
  }

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.receiverId || !draft.message.trim()) return
    giveRecognition({
      giverId: user.id,
      receiverId: draft.receiverId,
      tag: draft.tag,
      message: draft.message.trim(),
    })
    setFormOpen(false)
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

      {/* Personal stats */}
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

      {/* Feed */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No shoutouts yet"
          description="Be the first to celebrate someone\u2019s work."
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
            if (!giver || !receiver) return null
            const isMyShoutout = r.giverId === user.id
            const aboutMe = r.receiverId === user.id
            return (
              <li key={r.id}>
                <Card
                  padding="md"
                  className={cn(
                    aboutMe && 'ring-2 ring-pink-500/40',
                  )}
                >
                  {aboutMe ? (
                    <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 dark:text-pink-300">
                      <Award className="h-3.5 w-3.5" /> This one\u2019s for you
                    </div>
                  ) : null}

                  {/* Header: giver -> receiver */}
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

                  {/* Message */}
                  <p className="mt-3 text-sm text-fg/90">{r.message}</p>

                  {/* Footer */}
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

                    <button
                      onClick={() => toggleRecognitionReaction(r.id, user.id)}
                      disabled={isMyShoutout}
                      title={isMyShoutout ? 'You can\u2019t react to your own shoutout' : 'React'}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ring-focus',
                        reacted
                          ? 'border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-300'
                          : 'border-border bg-surface text-fg hover:bg-surface-2',
                        isMyShoutout && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <Heart
                        className={cn('h-3.5 w-3.5', reacted && 'fill-current')}
                      />
                      {r.reactedBy.length}
                    </button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {/* Give shoutout modal */}
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
              label: `${u.name} \u2014 ${u.jobTitle}`,
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
              placeholder="Be specific \u2014 what did they do and why does it matter?"
            />
            <div className="mt-1 flex justify-end">
              <span
                className={cn(
                  'text-[11px]',
                  draft.message.length > MAX_LENGTH - 20
                    ? 'text-warning'
                    : 'text-muted',
                )}
              >
                {draft.message.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
