import { useEffect, useState } from 'react'

export interface ExternalCalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  allDay?: boolean
  description?: string
  location?: string
}

type Status = 'idle' | 'ok' | 'error'

export function useExternalCalendarEvents(jsonUrl: string | undefined) {
  const cleanUrl = jsonUrl?.trim() ?? ''
  const [events, setEvents] = useState<ExternalCalendarEvent[]>([])
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (!cleanUrl) return

    let cancelled = false

    fetch(cleanUrl)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<{ events?: ExternalCalendarEvent[] }>
      })
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.events) ? data.events : []
        setEvents(list.filter((e) => e.id && e.title && e.start))
        setStatus('ok')
      })
      .catch(() => {
        if (cancelled) return
        setEvents([])
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [cleanUrl])

  if (!cleanUrl) {
    return { externalEvents: [] as ExternalCalendarEvent[], status: 'idle' as const }
  }

  return { externalEvents: events, status }
}
