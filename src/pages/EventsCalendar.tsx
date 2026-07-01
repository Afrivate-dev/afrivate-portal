import { useMemo, useRef, useState, type ComponentRef } from 'react'
import {
  Calendar as CalendarIcon,
  Plus,
  List,
  MapPin,
  Clock,
  Users as UsersIcon,
  ExternalLink,
} from 'lucide-react'
import {
  format,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useIsMobileViewport } from '@/hooks/useMediaQuery'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TabBar } from '@/components/ui/TabBar'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, fmtDate, fmtTime } from '@/utils/helpers'
import { departmentSelectOptions } from '@/lib/departments'
import { pages } from '@/content/copy'
import { useExternalCalendarEvents } from '@/hooks/useExternalCalendarEvents'
import {
  externalEventToFc,
  externalToEventItem,
  workspaceEventToFc,
  type FcExtendedProps,
} from '@/utils/calendarAdapters'
import type { EventItem } from '@/types'
import type { ExternalCalendarEvent } from '@/hooks/useExternalCalendarEvents'

const W = pages.whatsOn

type ViewMode = 'list' | 'schedule' | 'google'

interface EventDraft {
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  location: string
  audience: string
}

const emptyDraft: EventDraft = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  audience: 'all',
}

export function EventsCalendarPage() {
  const { user } = useAuth()
  const { events, users, addEvent, departments: orgDepartments } = useData()
  const canManage = Boolean(user)

  const googleEmbed = import.meta.env.VITE_GOOGLE_CALENDAR_EMBED_URL?.trim()
  const icalJsonUrl = import.meta.env.VITE_TEAM_CALENDAR_JSON_URL?.trim()
  const { externalEvents, status: externalStatus } = useExternalCalendarEvents(icalJsonUrl)

  const [view, setView] = useState<ViewMode>('list')
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<EventDraft>(emptyDraft)
  const [picker, setPicker] = useState<
    | { kind: 'workspace'; id: string }
    | { kind: 'external'; ev: ExternalCalendarEvent }
    | null
  >(null)

  const calendarRef = useRef<ComponentRef<typeof FullCalendar> | null>(null)
  const isMobile = useIsMobileViewport()

  const audienceOptions = useMemo(
    () => [
      { value: 'all', label: 'Everyone' },
      ...departmentSelectOptions(orgDepartments, users).map((d) => ({
        value: d.value,
        label: d.label,
      })),
    ],
    [orgDepartments, users],
  )

  const visibleEvents = useMemo(() => {
    if (!user) return []
    return events.filter(
      (e) => e.audience === 'all' || e.audience === user.department,
    )
  }, [events, user])

  const mergedForList = useMemo(() => {
    const extItems = externalEvents.map(externalToEventItem)
    return [...visibleEvents, ...extItems].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      return (a.startTime ?? '').localeCompare(b.startTime ?? '')
    })
  }, [visibleEvents, externalEvents])

  const grouped = useMemo(() => {
    const today = startOfDay(new Date())
    const upcoming = mergedForList
      .filter((e) => !isBefore(parseISO(e.date), today))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    const past = mergedForList
      .filter((e) => isBefore(parseISO(e.date), today))
      .sort((a, b) => (a.date > b.date ? -1 : 1))

    const groupByDate = (list: EventItem[]) => {
      const map = new Map<string, EventItem[]>()
      list.forEach((e) => {
        const arr = map.get(e.date) ?? []
        arr.push(e)
        map.set(e.date, arr)
      })
      return Array.from(map.entries())
    }
    return { upcoming: groupByDate(upcoming), past: groupByDate(past) }
  }, [mergedForList])

  const fcEvents = useMemo(() => {
    const local = visibleEvents.map(workspaceEventToFc)
    const ext = externalEvents.map(externalEventToFc)
    return [...local, ...ext]
  }, [visibleEvents, externalEvents])

  const pickedWorkspace = picker?.kind === 'workspace' ? events.find((e) => e.id === picker.id) ?? null : null
  const pickedExternal = picker?.kind === 'external' ? picker.ev : null

  if (!user) return null

  const openForm = () => {
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim() || !draft.date) return
    addEvent({
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      date: draft.date,
      startTime: draft.startTime || undefined,
      endTime: draft.endTime || undefined,
      location: draft.location.trim() || undefined,
      audience: draft.audience,
      source: 'workspace',
    })
    setFormOpen(false)
  }

  const onFcEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault()
    const raw = info.event.extendedProps as FcExtendedProps
    if (raw.origin === 'workspace') {
      setPicker({ kind: 'workspace', id: raw.item.id })
    } else {
      setPicker({ kind: 'external', ev: raw.item })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={W.title}
        description={W.subtitle}
        actions={
          canManage ? (
            <Button onClick={openForm} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" /> {W.newEvent}
            </Button>
          ) : undefined
        }
      />

      {icalJsonUrl && externalStatus === 'error' ? (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-fg">
          {W.externalSyncError}
        </p>
      ) : null}

      <TabBar
        active={view}
        onChange={setView}
        tabs={[
          {
            id: 'list',
            label: (
              <>
                <List className="h-4 w-4" /> {W.list}
              </>
            ),
          },
          {
            id: 'schedule',
            label: (
              <>
                <CalendarIcon className="h-4 w-4" /> {W.schedule}
              </>
            ),
          },
          ...(googleEmbed
            ? [
                {
                  id: 'google' as const,
                  label: (
                    <>
                      <ExternalLink className="h-4 w-4" /> {W.google}
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />

      {/* LIST VIEW */}
      {view === 'list' ? (
        mergedForList.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="No events yet"
            description={
              canManage
                ? 'Add the first event to get started.'
                : 'Check back later — events will appear here.'
            }
          />
        ) : (
          <div className="space-y-6">
            {grouped.upcoming.length > 0 ? (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  Upcoming
                </h2>
                <div className="space-y-3">
                  {grouped.upcoming.map(([date, items]) => (
                    <DayGroup
                      key={date}
                      date={date}
                      events={items}
                      externalEvents={externalEvents}
                      onPick={setPicker}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {grouped.past.length > 0 ? (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  Past
                </h2>
                <div className="space-y-3 opacity-70">
                  {grouped.past.slice(0, 5).map(([date, items]) => (
                    <DayGroup
                      key={date}
                      date={date}
                      events={items}
                      externalEvents={externalEvents}
                      onPick={setPicker}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )
      ) : null}

      {/* FULLCALENDAR */}
      {view === 'schedule' ? (
        <Card padding="md" className="max-w-full overflow-hidden">
          <div className={cn('av-fullcalendar av-scroll-x text-sm', canManage && 'av-fullcalendar--interactive')}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: isMobile ? 'dayGridMonth,listWeek' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
              }}
              events={fcEvents}
              height="auto"
              contentHeight="auto"
              aspectRatio={1.55}
              dayMaxEvents={5}
              moreLinkClick="popover"
              navLinks
              nowIndicator
              selectable={canManage}
              selectMirror={canManage}
              unselectAuto
              longPressDelay={250}
              eventDisplay="block"
              eventClick={onFcEventClick}
              dateClick={
                canManage
                  ? (info) => {
                      const d = info.dateStr.slice(0, 10)
                      setDraft((prev) => ({ ...prev, date: d, startTime: '', endTime: '' }))
                      setFormOpen(true)
                    }
                  : undefined
              }
              select={
                canManage
                  ? (info: DateSelectArg) => {
                      setDraft((prev) => ({
                        ...prev,
                        date: format(info.start, 'yyyy-MM-dd'),
                        startTime: info.allDay ? '' : format(info.start, 'HH:mm'),
                        endTime: info.allDay ? '' : format(info.end, 'HH:mm'),
                      }))
                      setFormOpen(true)
                      calendarRef.current?.getApi().unselect()
                    }
                  : undefined
              }
              eventDidMount={(info) => {
                const st = info.event.start
                const en = info.event.end
                const title = info.event.title
                let tip = title
                if (st) {
                  tip = info.event.allDay
                    ? `${title} · All day`
                    : en
                      ? `${title} · ${format(st, 'HH:mm')}–${format(en, 'HH:mm')}`
                      : `${title} · ${format(st, 'HH:mm')}`
                }
                info.el.setAttribute('title', tip)
              }}
              buttonText={{
                today: 'Today',
                month: 'Month',
                week: 'Week',
                day: 'Day',
                list: 'Agenda',
              }}
            />
          </div>
          <p className="mt-3 text-xs text-muted">
            {canManage ? W.scheduleInteractHint : W.scheduleViewHint}
          </p>
          {externalEvents.length > 0 ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
              Purple-tinted events are {W.externalBadge.toLowerCase()} from your team calendar feed.
            </p>
          ) : null}
        </Card>
      ) : null}

      {/* Google embed */}
      {view === 'google' && googleEmbed ? (
        <Card padding="md">
          <p className="mb-3 text-sm text-muted">{W.googleTabIntro}</p>
          <div className="aspect-[4/3] max-h-[70dvh] w-full min-h-0 overflow-hidden rounded-md border border-border bg-surface">
            <iframe
              title={W.google}
              src={googleEmbed}
              className="h-full w-full border-0"
              loading="lazy"
            />
          </div>
        </Card>
      ) : null}

      {/* Workspace event detail */}
      <Modal
        open={!!pickedWorkspace}
        onClose={() => setPicker(null)}
        title={pickedWorkspace?.title}
        size="md"
      >
        {pickedWorkspace ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">
                <CalendarIcon className="h-3 w-3" />
                {format(parseISO(pickedWorkspace.date), 'EEEE, d MMM yyyy')}
              </Badge>
              {pickedWorkspace.startTime ? (
                <Badge tone="muted">
                  <Clock className="h-3 w-3" />
                  {pickedWorkspace.startTime}
                  {pickedWorkspace.endTime ? `–${pickedWorkspace.endTime}` : ''}
                </Badge>
              ) : null}
              {pickedWorkspace.audience !== 'all' ? (
                <Badge tone="brand">
                  <UsersIcon className="h-3 w-3" /> {pickedWorkspace.audience}
                </Badge>
              ) : (
                <Badge tone="default">Everyone</Badge>
              )}
            </div>
            {pickedWorkspace.location ? (
              <p className="inline-flex items-center gap-2 text-sm text-fg/90">
                <MapPin className="h-4 w-4 text-muted" /> {pickedWorkspace.location}
              </p>
            ) : null}
            {pickedWorkspace.description ? (
              <p className="whitespace-pre-line text-sm text-fg/90">{pickedWorkspace.description}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* External / synced event detail */}
      <Modal
        open={!!pickedExternal}
        onClose={() => setPicker(null)}
        title={pickedExternal?.title}
        size="md"
      >
        {pickedExternal ? (
          <div className="space-y-4">
            <Badge tone="brand">{W.externalBadge}</Badge>
            <p className="text-sm text-muted">
              {pickedExternal.allDay
                ? fmtDate(pickedExternal.start)
                : `${fmtDate(pickedExternal.start)} · ${fmtTime(pickedExternal.start)}`}
              {pickedExternal.end && !pickedExternal.allDay
                ? ` – ${fmtTime(pickedExternal.end)}`
                : null}
            </p>
            {pickedExternal.location ? (
              <p className="inline-flex items-center gap-2 text-sm text-fg/90">
                <MapPin className="h-4 w-4 text-muted" /> {pickedExternal.location}
              </p>
            ) : null}
            {pickedExternal.description ? (
              <p className="whitespace-pre-line text-sm text-fg/90">{pickedExternal.description}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Add event modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="New event"
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitForm}>
              Create event
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitForm}>
          <Input
            label="Title"
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="e.g. All-hands stand-up"
          />
          <Textarea
            label="Description"
            rows={3}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Agenda or context"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              type="date"
              label="Date"
              required
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
            <Input
              type="time"
              label="Start time"
              value={draft.startTime}
              onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
            />
            <Input
              type="time"
              label="End time"
              value={draft.endTime}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              min={draft.startTime}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Location"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Zoom, Conference room, ..."
            />
            <Select
              label="Audience"
              value={draft.audience}
              onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
              options={audienceOptions}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}

function DayGroup({
  date,
  events: dayEvents,
  externalEvents,
  onPick,
}: {
  date: string
  events: EventItem[]
  externalEvents: ExternalCalendarEvent[]
  onPick: (p: { kind: 'workspace'; id: string } | { kind: 'external'; ev: ExternalCalendarEvent }) => void
}) {
  const d = parseISO(date)
  const isToday = isSameDay(d, new Date())
  return (
    <Card padding="md">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg',
            isToday ? 'bg-accent text-white' : 'bg-surface-2 text-fg',
          )}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide">
            {format(d, 'MMM')}
          </span>
          <span className="text-lg font-bold leading-none">{format(d, 'd')}</span>
        </div>
        <div>
          <p className={cn('text-sm font-semibold', isToday ? 'text-accent' : 'text-fg')}>
            {isToday ? 'Today' : format(d, 'EEEE')}
          </p>
          <p className="text-xs text-muted">{format(d, 'd MMMM yyyy')}</p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {dayEvents.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => {
                if (e.source === 'external') {
                  const raw = externalEvents.find((x) => `ext_${x.id}` === e.id)
                  if (raw) onPick({ kind: 'external', ev: raw })
                } else {
                  onPick({ kind: 'workspace', id: e.id })
                }
              }}
              className="flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left -mx-2 transition-colors hover:bg-surface-2/40 ring-focus"
            >
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                  {e.title}
                  {e.source === 'external' ? (
                    <Badge tone="brand" className="text-[10px]">
                      {W.externalBadge}
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {e.startTime ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {e.startTime}
                      {e.endTime ? `–${e.endTime}` : ''}
                    </span>
                  ) : null}
                  {e.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {e.location}
                    </span>
                  ) : null}
                  {e.audience !== 'all' ? (
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="h-3 w-3" /> {e.audience}
                    </span>
                  ) : null}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
