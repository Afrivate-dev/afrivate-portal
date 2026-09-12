import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Download, RefreshCw } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  isPeopleOpsEvent,
  peopleMomentKindFromKey,
  peopleMomentKindLabel,
  todayYmd,
  type PeopleMomentKind,
} from '@/lib/peopleMomentEvents'
import { fmtDate } from '@/utils/helpers'
import { notifySuccess } from '@/lib/notify'
import type { EventItem } from '@/types'

function kindTone(kind: PeopleMomentKind): 'brand' | 'success' | 'info' {
  if (kind === 'birthday') return 'brand'
  if (kind === 'anniversary') return 'success'
  return 'info'
}

export function PeopleMomentsWidget() {
  const { events, users, refreshPeopleMomentCalendar, applyPeopleMomentSync } = useData()
  const { employeeProfiles } = useHr()
  const today = todayYmd()
  const horizon = useMemo(() => {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() + 90)
    return d.toISOString().slice(0, 10)
  }, [today])

  const upcoming = useMemo(() => {
    return events
      .filter((e) => isPeopleOpsEvent(e) && e.date >= today && e.date <= horizon)
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
  }, [events, today, horizon])

  const grouped = useMemo(() => {
    const buckets: Record<PeopleMomentKind, EventItem[]> = {
      birthday: [],
      anniversary: [],
      newhire: [],
    }
    for (const event of upcoming) {
      const kind = peopleMomentKindFromKey(event.externalKey)
      if (kind) buckets[kind].push(event)
    }
    return buckets
  }, [upcoming])

  const exportCsv = () => {
    const header = ['Title', 'Date', 'Type', 'Person', 'Role', 'Description']
    const lines = [header, ...upcoming.map((e) => {
      const kind = peopleMomentKindFromKey(e.externalKey)
      const person = users.find((u) => u.id === e.subjectUserId)
      return [
        e.title,
        e.date,
        kind ? peopleMomentKindLabel(kind) : 'People moment',
        person?.name ?? '',
        person?.jobTitle ?? '',
        (e.description ?? '').replace(/\s+/g, ' '),
      ]
    })]
    const csv = lines
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `afrivate-people-calendar-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notifySuccess('Downloaded people calendar CSV for Google Calendar mirroring.')
  }

  const refresh = async () => {
    for (const profile of employeeProfiles) {
      applyPeopleMomentSync(
        profile,
        users.find((u) => u.id === profile.userId),
      )
    }
    await refreshPeopleMomentCalendar()
    notifySuccess('People calendar refreshed from employee files.')
  }

  const section = (kind: PeopleMomentKind) => {
    const items = grouped[kind]
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge tone={kindTone(kind)}>{peopleMomentKindLabel(kind)}</Badge>
          <span className="text-xs text-muted">{items.length} upcoming</span>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted">None in the next 90 days.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {items.slice(0, 8).map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-fg">{e.title}</span>
                <span className="shrink-0 text-xs text-muted">{fmtDate(e.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <Card padding="md">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-semibold text-fg">Upcoming people moments</h3>
          </div>
          <p className="mt-1 text-sm text-muted">
            Birthdays, work anniversaries, and new-hire check-ins autosaved from employee files. Export for
            frank to mirror on AfriVate Google Calendar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw className="h-3.5 w-3.5" /> Rebuild
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={exportCsv} disabled={upcoming.length === 0}>
            <Download className="h-3.5 w-3.5" /> CSV for frank
          </Button>
          <Link
            to="/events"
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-medium text-fg hover:bg-surface-2"
          >
            Open calendar
          </Link>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {section('birthday')}
        {section('anniversary')}
        {section('newhire')}
      </div>
    </Card>
  )
}
