import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ListChecks,
  CalendarDays,
  Megaphone,
  Calendar as CalendarIcon,
  Plus,
  ArrowRight,
  PlayCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  fmtDate,
  fmtTime,
  greeting,
  isDueToday,
  relativeTime,
  roleLabel,
} from '@/utils/helpers'
import { brand } from '@/content/copy'
import { format, isSameDay, parseISO } from 'date-fns'
import { AnnouncementMediaGallery } from '@/components/shared/AnnouncementAttachments'
import { useExternalCalendarEvents } from '@/hooks/useExternalCalendarEvents'
import { externalToEventItem } from '@/utils/calendarAdapters'

export function DashboardPage() {
  const { user } = useAuth()
  const {
    tasks,
    leaveRequests,
    events,
    announcements,
    onboardingVideos,
    onboardingProgress,
    markAnnouncementRead,
  } = useData()
  const { externalEvents } = useExternalCalendarEvents(import.meta.env.VITE_TEAM_CALENDAR_JSON_URL)
  const [readingId, setReadingId] = useState<string | null>(null)

  const stats = useMemo(() => {
    if (!user) return { dueToday: 0, pendingLeave: 0, upcomingEvents: 0, unread: 0 }
    const myTasks = tasks.filter((t) => t.ownerId === user.id)
    return {
      dueToday: myTasks.filter((t) => isDueToday(t.dueDate) && t.status !== 'done').length,
      pendingLeave: leaveRequests.filter(
        (l) => l.status === 'pending' && (user.role === 'staff' ? l.userId === user.id : true),
      ).length,
      upcomingEvents: events.filter((e) => {
        const d = new Date(e.date)
        const now = new Date()
        const in7 = new Date()
        in7.setDate(in7.getDate() + 7)
        return d >= now && d <= in7
      }).length,
      unread: announcements.filter((a) => !a.readBy.includes(user.id)).length,
    }
  }, [user, tasks, leaveRequests, events, announcements])

  const todaysEvents = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const local = events.filter((e) => e.date === todayStr)
    const ext = externalEvents
      .filter((e) => isSameDay(parseISO(e.start), new Date()))
      .map(externalToEventItem)
    return [...local, ...ext]
  }, [events, externalEvents])

  const recentAnnouncements = useMemo(() => announcements.slice(0, 3), [announcements])

  const onboardingStats = useMemo(() => {
    if (!user) return null
    const joinedAt = new Date(user.joinedAt)
    const days = (new Date().getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (days > 30) return null
    const progress = onboardingProgress.find((p) => p.userId === user.id)
    const watched = progress?.watchedVideoIds.length ?? 0
    const total = onboardingVideos.length
    return { watched, total, pct: total === 0 ? 0 : Math.round((watched / total) * 100) }
  }, [user, onboardingProgress, onboardingVideos])

  if (!user) return null

  const currentAnnouncement = recentAnnouncements.find((a) => a.id === readingId)

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Card padding="lg" className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-100 dark:opacity-100"
          style={{
            background:
              'linear-gradient(135deg, rgba(62, 140, 255, 0.10) 0%, rgba(62, 140, 255, 0) 60%)',
          }}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">
              {greeting()}, {user.name.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {roleLabel[user.role]} &middot; {user.department}
            </p>
            <p className="mt-2 text-xs font-medium tracking-wide text-muted/90">{brand.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/tasks"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" /> New task
            </Link>
            <Link
              to="/leave"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-transparent px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
            >
              Request leave
            </Link>
            <Link
              to="/checkin"
              className="inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
            >
              Submit check-in
            </Link>
          </div>
        </div>
      </Card>

      {/* Onboarding progress (new staff only) */}
      {onboardingStats ? (
        <Card padding="md" accentBorder="info" className="border-l-4 border-l-accent">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-accent" />
                <p className="text-sm font-semibold text-fg">
                  You've watched {onboardingStats.watched} of {onboardingStats.total} onboarding videos
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${onboardingStats.pct}%` }}
                />
              </div>
            </div>
            <Link
              to="/onboarding"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      ) : null}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Tasks due today" value={stats.dueToday} icon={ListChecks} tone="brand" />
        <StatCard
          label="Pending leave"
          value={stats.pendingLeave}
          icon={CalendarDays}
          tone="warning"
        />
        <StatCard
          label="Events this week"
          value={stats.upcomingEvents}
          icon={CalendarIcon}
          tone="success"
        />
        <StatCard
          label="Unread announcements"
          value={stats.unread}
          icon={Megaphone}
          tone={stats.unread > 0 ? 'danger' : 'muted'}
        />
      </div>

      {/* Two-column area */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent announcements */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Recent announcements</CardTitle>
            <Link to="/announcements" className="text-xs font-medium text-accent hover:underline">
              View all
            </Link>
          </CardHeader>

          {recentAnnouncements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No announcements yet"
              description="When HR or admin posts something, you'll see it here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentAnnouncements.map((a) => {
                const unread = !a.readBy.includes(user.id)
                return (
                  <li
                    key={a.id}
                    className="flex cursor-pointer items-start gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-90"
                    onClick={() => {
                      setReadingId(a.id)
                      markAnnouncementRead(a.id, user.id)
                    }}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? 'bg-accent' : 'bg-transparent'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`truncate text-sm ${unread ? 'font-semibold text-fg' : 'font-medium text-fg/90'}`}>
                          {a.title}
                        </p>
                        <Badge
                          tone={
                            a.priority === 'urgent'
                              ? 'danger'
                              : a.priority === 'important'
                                ? 'warning'
                                : 'info'
                          }
                        >
                          {a.priority}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.body}</p>
                      <p className="mt-1 text-[11px] text-muted">{relativeTime(a.postedAt)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Today's events */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <Link to="/events" className="text-xs font-medium text-accent hover:underline">
              All events
            </Link>
          </CardHeader>

          <p className="mb-3 text-xs text-muted">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>

          {todaysEvents.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="Nothing on today"
              description="Your calendar is clear."
            />
          ) : (
            <ul className="space-y-2.5">
              {todaysEvents.map((e) => (
                <li key={e.id} className="rounded-md border border-border bg-surface-2/40 p-3">
                  <p className="text-sm font-semibold text-fg">{e.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {e.startTime}
                    {e.endTime ? `\u2013${e.endTime}` : ''} &middot; {e.location ?? '\u2014'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Announcement reader modal (lightweight inline) */}
      {currentAnnouncement ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onClick={() => setReadingId(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <Card
            padding="lg"
            className="relative w-full max-w-lg animate-slide-up sm:animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-fg">{currentAnnouncement.title}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  Posted {fmtDate(currentAnnouncement.postedAt)} at {fmtTime(currentAnnouncement.postedAt)}
                </p>
              </div>
              <Badge
                tone={
                  currentAnnouncement.priority === 'urgent'
                    ? 'danger'
                    : currentAnnouncement.priority === 'important'
                      ? 'warning'
                      : 'info'
                }
              >
                {currentAnnouncement.priority}
              </Badge>
            </div>
            <p className="whitespace-pre-line text-sm text-fg/90">{currentAnnouncement.body}</p>
            <AnnouncementMediaGallery media={currentAnnouncement.media} />
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setReadingId(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
