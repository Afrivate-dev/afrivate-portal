import { useMemo, useState } from 'react'
import {
  PlayCircle,
  CheckCircle2,
  Circle,
  ChevronRight,
  ExternalLink,
  ListChecks,
  Settings,
  Plus,
  PartyPopper,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, colorForName, fmtDate, isHR } from '@/utils/helpers'
import type { OnboardingVideo } from '@/types'

type Tab = 'videos' | 'checklist' | 'admin'

interface NewVideoDraft {
  title: string
  section: string
  description: string
  youtubeUrl: string
  duration: string
}

const emptyDraft: NewVideoDraft = {
  title: '',
  section: 'Welcome & Culture',
  description: '',
  youtubeUrl: '',
  duration: '',
}

export function OnboardingPage() {
  const { user } = useAuth()
  const {
    onboardingVideos,
    onboardingChecklist,
    onboardingProgress,
    users,
    toggleVideoWatched,
    toggleChecklistItem,
    addOnboardingVideo,
  } = useData()

  const canSeeAdmin = isHR(user)

  const [tab, setTab] = useState<Tab>('videos')
  const sortedVideos = useMemo(
    () => [...onboardingVideos].sort((a, b) => a.order - b.order),
    [onboardingVideos],
  )
  const [activeVideoId, setActiveVideoId] = useState<string>(
    () => sortedVideos[0]?.id ?? '',
  )
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<NewVideoDraft>(emptyDraft)

  const myProgress = useMemo(
    () => (user ? onboardingProgress.find((p) => p.userId === user.id) : undefined),
    [onboardingProgress, user],
  )

  const watchedIds = useMemo(() => new Set(myProgress?.watchedVideoIds ?? []), [myProgress])
  const checkedIds = useMemo(
    () => new Set(myProgress?.completedChecklistIds ?? []),
    [myProgress],
  )

  const totals = useMemo(() => {
    const totalVideos = sortedVideos.length
    const watched = sortedVideos.filter((v) => watchedIds.has(v.id)).length
    const totalChecklist = onboardingChecklist.length
    const checked = onboardingChecklist.filter((c) => checkedIds.has(c.id)).length
    const overall =
      totalVideos + totalChecklist === 0
        ? 0
        : Math.round(((watched + checked) / (totalVideos + totalChecklist)) * 100)
    return {
      videos: { total: totalVideos, watched, pct: totalVideos ? Math.round((watched / totalVideos) * 100) : 0 },
      checklist: { total: totalChecklist, checked, pct: totalChecklist ? Math.round((checked / totalChecklist) * 100) : 0 },
      overall,
    }
  }, [sortedVideos, watchedIds, onboardingChecklist, checkedIds])

  const grouped = useMemo(() => {
    const map = new Map<string, OnboardingVideo[]>()
    sortedVideos.forEach((v) => {
      const arr = map.get(v.section) ?? []
      arr.push(v)
      map.set(v.section, arr)
    })
    return Array.from(map.entries())
  }, [sortedVideos])

  const activeVideo = sortedVideos.find((v) => v.id === activeVideoId) ?? sortedVideos[0]

  const playNext = () => {
    if (!activeVideo) return
    const idx = sortedVideos.findIndex((v) => v.id === activeVideo.id)
    const next = sortedVideos[idx + 1]
    if (next) setActiveVideoId(next.id)
  }

  const submitNewVideo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim() || !draft.youtubeUrl.trim()) return
    addOnboardingVideo({
      title: draft.title.trim(),
      section: draft.section.trim() || 'Other',
      description: draft.description.trim(),
      youtubeUrl: draft.youtubeUrl.trim(),
      duration: draft.duration.trim() || '\u2014',
      order: onboardingVideos.length + 1,
    })
    setDraft(emptyDraft)
    setAddOpen(false)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        description="Get up to speed with AfriVate — your first steps on the journey."
        actions={
          <Badge tone={totals.overall === 100 ? 'success' : 'brand'}>
            {totals.overall}% complete
          </Badge>
        }
      />

      {/* Overall progress */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-fg">
              {totals.videos.watched + totals.checklist.checked} of {totals.videos.total + totals.checklist.total} items complete
            </p>
            <p className="text-xs text-muted">
              {totals.videos.watched}/{totals.videos.total} videos &middot;{' '}
              {totals.checklist.checked}/{totals.checklist.total} checklist
            </p>
          </div>
          {totals.overall === 100 ? (
            <Badge tone="success">
              <PartyPopper className="h-3 w-3" /> All done!
            </Badge>
          ) : null}
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${totals.overall}%` }}
          />
        </div>
      </Card>

      {/* Completion banner at 100% */}
      {totals.overall === 100 ? (
        <Card padding="lg" className="border-l-4 border-l-emerald-500 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-fg">Onboarding complete</h3>
              <p className="mt-1 text-sm text-muted">
                Great work! You\u2019ve finished every onboarding video and checklist item. Reach out to your team lead if you have any open questions.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <TabButton active={tab === 'videos'} onClick={() => setTab('videos')}>
          <PlayCircle className="h-4 w-4" /> Videos
        </TabButton>
        <TabButton active={tab === 'checklist'} onClick={() => setTab('checklist')}>
          <ListChecks className="h-4 w-4" /> Checklist
        </TabButton>
        {canSeeAdmin ? (
          <TabButton active={tab === 'admin'} onClick={() => setTab('admin')}>
            <Settings className="h-4 w-4" /> Admin
          </TabButton>
        ) : null}
      </div>

      {/* VIDEOS */}
      {tab === 'videos' ? (
        sortedVideos.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No onboarding videos yet"
            description={
              canSeeAdmin
                ? 'Add the first video from the Admin tab.'
                : 'When HR or admin adds onboarding videos, they\u2019ll appear here.'
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            {/* Player */}
            <div className="space-y-4 lg:order-1">
              {activeVideo ? (
                <Card padding="none" className="overflow-hidden">
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      key={activeVideo.id}
                      className="h-full w-full"
                      src={ytEmbedUrl(activeVideo.youtubeUrl)}
                      title={activeVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-accent">
                      {activeVideo.section}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-fg">{activeVideo.title}</h2>
                    <p className="mt-1 text-xs text-muted">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {activeVideo.duration}
                    </p>
                    {activeVideo.description ? (
                      <p className="mt-3 text-sm text-fg/90">{activeVideo.description}</p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                      <Button
                        variant={watchedIds.has(activeVideo.id) ? 'secondary' : 'primary'}
                        onClick={() => toggleVideoWatched(user.id, activeVideo.id)}
                      >
                        {watchedIds.has(activeVideo.id) ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Watched
                          </>
                        ) : (
                          <>
                            <Circle className="h-4 w-4" />
                            Mark as watched
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={playNext}
                        disabled={
                          sortedVideos.findIndex((v) => v.id === activeVideo.id) >=
                          sortedVideos.length - 1
                        }
                      >
                        Next video
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}
            </div>

            {/* Playlist */}
            <Card padding="none" className="overflow-hidden lg:order-2 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:scrollbar-thin">
              <div className="border-b border-border bg-surface-2/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Playlist</p>
                <p className="mt-1 text-sm font-semibold text-fg">
                  {totals.videos.watched}/{totals.videos.total} watched
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${totals.videos.pct}%` }}
                  />
                </div>
              </div>
              <div className="divide-y divide-border">
                {grouped.map(([section, videos]) => (
                  <div key={section} className="py-2">
                    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                      {section}
                    </p>
                    <ul>
                      {videos.map((v) => {
                        const active = v.id === activeVideo?.id
                        const watched = watchedIds.has(v.id)
                        return (
                          <li key={v.id}>
                            <button
                              onClick={() => setActiveVideoId(v.id)}
                              className={cn(
                                'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ring-focus',
                                active
                                  ? 'bg-accent/10'
                                  : 'hover:bg-surface-2',
                              )}
                            >
                              <span
                                className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md text-white/90"
                                style={{ background: colorForName(v.title) }}
                              >
                                <PlayCircle className="h-5 w-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    'truncate text-sm font-medium',
                                    active ? 'text-accent' : 'text-fg',
                                  )}
                                >
                                  {v.title}
                                </p>
                                <p className="text-[11px] text-muted">{v.duration}</p>
                              </div>
                              {watched ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted/40" />
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      ) : null}

      {/* CHECKLIST */}
      {tab === 'checklist' ? (
        onboardingChecklist.length === 0 ? (
          <EmptyState icon={ListChecks} title="No checklist items" />
        ) : (
          <Card padding="md">
            <ul className="divide-y divide-border">
              {onboardingChecklist
                .sort((a, b) => a.order - b.order)
                .map((item) => {
                  const done = checkedIds.has(item.id)
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => toggleChecklistItem(user.id, item.id)}
                        className="flex w-full items-center gap-3 py-3 text-left ring-focus"
                      >
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                            done
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-border bg-surface',
                          )}
                        >
                          {done ? <CheckCircle2 className="h-4 w-4" /> : null}
                        </span>
                        <span
                          className={cn(
                            'flex-1 text-sm',
                            done ? 'text-muted line-through' : 'text-fg',
                          )}
                        >
                          {item.label}
                        </span>
                        {item.link ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
            </ul>
          </Card>
        )
      ) : null}

      {/* ADMIN */}
      {tab === 'admin' && canSeeAdmin ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add video
            </Button>
          </div>

          <Card padding="none" className="overflow-hidden">
            <CardHeader className="border-b border-border p-4">
              <CardTitle>Staff progress</CardTitle>
            </CardHeader>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-2/60 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="p-3 font-medium">Person</th>
                    <th className="p-3 font-medium">Department</th>
                    <th className="p-3 font-medium">Joined</th>
                    <th className="p-3 font-medium">Videos</th>
                    <th className="p-3 font-medium">Checklist</th>
                    <th className="p-3 font-medium">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) => u.active)
                    .map((u) => {
                      const prog = onboardingProgress.find((p) => p.userId === u.id)
                      const watched = prog?.watchedVideoIds.length ?? 0
                      const checked = prog?.completedChecklistIds.length ?? 0
                      const overall =
                        totals.videos.total + totals.checklist.total === 0
                          ? 0
                          : Math.round(
                              ((watched + checked) /
                                (totals.videos.total + totals.checklist.total)) *
                                100,
                            )
                      return (
                        <tr key={u.id} className="border-t border-border hover:bg-surface-2/40">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-fg">{u.name}</p>
                                <p className="text-xs text-muted">{u.jobTitle}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-muted">{u.department}</td>
                          <td className="p-3 text-sm text-muted">{fmtDate(u.joinedAt)}</td>
                          <td className="p-3 text-sm text-fg">
                            {watched}/{totals.videos.total}
                          </td>
                          <td className="p-3 text-sm text-fg">
                            {checked}/{totals.checklist.total}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                                <div
                                  className={cn(
                                    'h-full',
                                    overall === 100 ? 'bg-emerald-500' : 'bg-accent',
                                  )}
                                  style={{ width: `${overall}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-fg">{overall}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-border lg:hidden">
              {users
                .filter((u) => u.active)
                .map((u) => {
                  const prog = onboardingProgress.find((p) => p.userId === u.id)
                  const watched = prog?.watchedVideoIds.length ?? 0
                  const checked = prog?.completedChecklistIds.length ?? 0
                  const overall =
                    totals.videos.total + totals.checklist.total === 0
                      ? 0
                      : Math.round(
                          ((watched + checked) /
                            (totals.videos.total + totals.checklist.total)) *
                            100,
                        )
                  return (
                    <li key={u.id} className="space-y-2 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fg">{u.name}</p>
                          <p className="truncate text-xs text-muted">
                            {u.department} \u00b7 joined {fmtDate(u.joinedAt)}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-fg">{overall}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn(
                            'h-full',
                            overall === 100 ? 'bg-emerald-500' : 'bg-accent',
                          )}
                          style={{ width: `${overall}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted">
                        <span>
                          Videos {watched}/{totals.videos.total}
                        </span>
                        <span>
                          Checklist {checked}/{totals.checklist.total}
                        </span>
                      </div>
                    </li>
                  )
                })}
            </ul>
          </Card>
        </div>
      ) : null}

      {/* Add Video modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add onboarding video"
        description="Paste any YouTube URL \u2014 watch, embed or short link."
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitNewVideo}>
              Add video
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitNewVideo}>
          <Input
            label="Title"
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="e.g. Tools we use day-to-day"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Section"
              required
              value={draft.section}
              onChange={(e) => setDraft({ ...draft, section: e.target.value })}
              placeholder="e.g. Tools & Processes"
            />
            <Input
              label="Duration"
              value={draft.duration}
              onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
              placeholder="e.g. 6:42"
            />
          </div>
          <Input
            label="YouTube URL"
            required
            value={draft.youtubeUrl}
            onChange={(e) => setDraft({ ...draft, youtubeUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <Textarea
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Optional context for the video"
          />
        </form>
      </Modal>
    </div>
  )
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
        active ? 'text-accent' : 'text-muted hover:text-fg',
      )}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
      ) : null}
    </button>
  )
}

function ytEmbedUrl(url: string): string {
  if (!url) return ''
  if (url.includes('/embed/')) return url
  const watch = url.match(/[?&]v=([^&]+)/)
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`
  const short = url.match(/youtu\.be\/([^?]+)/)
  if (short) return `https://www.youtube.com/embed/${short[1]}`
  // Looks like a raw video id
  if (/^[\w-]{6,15}$/.test(url)) return `https://www.youtube.com/embed/${url}`
  return url
}
