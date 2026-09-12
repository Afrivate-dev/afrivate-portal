import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { PeopleActionBanners } from '@/components/people/PeopleActionBanners'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { greeting, firstName, roleLabel } from '@/utils/helpers'
import { brand, pages } from '@/content/copy'
import { useExternalCalendarEvents } from '@/hooks/useExternalCalendarEvents'
import { externalToEventItem } from '@/utils/calendarAdapters'
import { buildThisWeekItems } from '@/lib/thisWeek'

export function DashboardPage() {
  const { user } = useAuth()
  const {
    tasks,
    leaveRequests,
    events,
    announcements,
    users,
    teams,
    departments,
    onboardingVideos,
    onboardingProgress,
    checkIns,
  } = useData()
  const { employeeProfiles } = useHr()
  const { externalEvents } = useExternalCalendarEvents(import.meta.env.VITE_TEAM_CALENDAR_JSON_URL)

  const mergedEvents = useMemo(
    () => [...events, ...externalEvents.map(externalToEventItem)],
    [events, externalEvents],
  )

  const onboarding = useMemo(() => {
    if (!user) return { watched: 0, total: 0 }
    const progress = onboardingProgress.find((p) => p.userId === user.id)
    return {
      watched: progress?.watchedVideoIds.length ?? 0,
      total: onboardingVideos.length,
    }
  }, [user, onboardingProgress, onboardingVideos])

  const weekItems = useMemo(() => {
    if (!user) return []
    return buildThisWeekItems({
      user,
      users,
      teams,
      departments,
      tasks,
      leaveRequests,
      events: mergedEvents,
      announcements,
      checkIns,
      onboardingVideoTotal: onboarding.total,
      onboardingWatched: onboarding.watched,
      employeeProfiles,
    })
  }, [
    user,
    users,
    teams,
    departments,
    tasks,
    leaveRequests,
    mergedEvents,
    announcements,
    checkIns,
    onboarding.total,
    onboarding.watched,
    employeeProfiles,
  ])

  if (!user) return null

  const clearWeek = weekItems.length === 0

  return (
    <div className="av-contain space-y-4 sm:space-y-6">
      <Card padding="lg" className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(135deg, rgba(62, 140, 255, 0.10) 0%, rgba(62, 140, 255, 0) 60%)',
          }}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">
              {greeting()}, {firstName(user.name)}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {roleLabel[user.role]} · {user.department}
            </p>
            <p className="mt-2 text-xs font-medium tracking-wide text-muted/90">{brand.tagline}</p>
          </div>
          <div className="av-action-row">
            <Link
              to="/tasks"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover sm:w-auto"
            >
              <Plus className="h-4 w-4" /> {pages.home.quickAddTask}
            </Link>
            <Link
              to="/people/leave"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-transparent px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-2 sm:w-auto"
            >
              {pages.home.quickTimeOff}
            </Link>
          </div>
        </div>
      </Card>

      <PeopleActionBanners />

      {clearWeek ? (
        <EmptyState
          icon={CheckCircle2}
          title={pages.home.emptyWeekTitle}
          description={pages.home.emptyWeekBody}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                to="/tasks"
                className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Open My work
              </Link>
              <Link
                to="/notes"
                className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-fg hover:bg-surface-2"
              >
                Write a note
              </Link>
            </div>
          }
        />
      ) : (
        <Card padding="md">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-fg">{pages.home.thisWeek}</h2>
            <p className="text-xs text-muted">{pages.home.thisWeekHint}</p>
          </div>
          <ul className="divide-y divide-border">
            {weekItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className="flex min-h-[52px] items-center gap-3 py-3 first:pt-0 last:pb-0 ring-focus hover:bg-surface-2/50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">{item.detail}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
