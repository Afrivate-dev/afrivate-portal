import type { EventInput } from '@fullcalendar/core'
import { format, parseISO } from 'date-fns'
import type { ExternalCalendarEvent } from '@/hooks/useExternalCalendarEvents'
import type { EventItem } from '@/types'

export function workspaceEventToFc(e: EventItem): EventInput {
  const hasTime = Boolean(e.startTime?.trim())
  if (hasTime) {
    return {
      id: e.id,
      title: e.title,
      start: `${e.date}T${e.startTime}:00`,
      end: e.endTime ? `${e.date}T${e.endTime}:00` : undefined,
      extendedProps: { origin: 'workspace' as const, item: e },
    }
  }
  return {
    id: e.id,
    title: e.title,
    allDay: true,
    start: e.date,
    extendedProps: { origin: 'workspace' as const, item: e },
  }
}

export function externalEventToFc(e: ExternalCalendarEvent): EventInput {
  return {
    id: `ext_${e.id}`,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: Boolean(e.allDay),
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366f1',
    textColor: '#4338ca',
    extendedProps: { origin: 'external' as const, item: e },
  }
}

/** Flatten external feed items into the same shape as workspace events for list grouping. */
export function externalToEventItem(e: ExternalCalendarEvent): EventItem {
  const start = parseISO(e.start)
  return {
    id: `ext_${e.id}`,
    title: e.title,
    description: e.description,
    date: format(start, 'yyyy-MM-dd'),
    startTime: e.allDay ? undefined : format(start, 'HH:mm'),
    endTime:
      e.end && !e.allDay
        ? format(parseISO(e.end), 'HH:mm')
        : undefined,
    location: e.location,
    audience: 'all',
    source: 'external',
  }
}

export type FcExtendedProps =
  | { origin: 'workspace'; item: EventItem }
  | { origin: 'external'; item: ExternalCalendarEvent }
