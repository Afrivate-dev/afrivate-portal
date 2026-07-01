import { useMemo } from 'react'
import { MessageSquare } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { FeedbackRelationship } from '@/types/hr'

const REL_LABELS: Record<FeedbackRelationship, string> = {
  self: 'Self',
  manager: 'Manager',
  peer: 'Peer',
  report: 'Upward',
}

/** HR summary of 360° feedback for the open or latest cycle. */
export function FeedbackCycleSummaryPanel() {
  const { users } = useData()
  const { feedbackCycles, feedbackEntries } = useHr()

  const cycle = useMemo(() => {
    const open = feedbackCycles.find((c) => c.status === 'open')
    if (open) return open
    return [...feedbackCycles].sort((a, b) => (a.year > b.year || a.half > b.half ? -1 : 1))[0]
  }, [feedbackCycles])

  const stats = useMemo(() => {
    if (!cycle) return []
    const entries = feedbackEntries.filter((e) => e.cycleId === cycle.id)
    const bySubject = new Map<string, typeof entries>()
    for (const e of entries) {
      const list = bySubject.get(e.subjectUserId) ?? []
      list.push(e)
      bySubject.set(e.subjectUserId, list)
    }
    return [...bySubject.entries()].map(([subjectId, list]) => {
      const subject = users.find((u) => u.id === subjectId)
      const avg =
        list.length > 0
          ? list.reduce((sum, e) => {
              const nums = Object.values(e.answers).filter((v): v is number => typeof v === 'number')
              const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
              return sum + mean
            }, 0) / list.length
          : null
      return { subjectId, subjectName: subject?.name ?? subjectId, count: list.length, avg, list }
    })
  }, [cycle, feedbackEntries, users])

  if (!cycle) return null

  return (
    <Card padding="md">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">360° — {cycle.title}</h3>
        <Badge tone={cycle.status === 'open' ? 'success' : 'muted'}>{cycle.status}</Badge>
      </div>
      {stats.length === 0 ? (
        <p className="text-sm text-muted">No feedback submitted for this cycle yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {stats.map(({ subjectId, subjectName, count, avg, list }) => (
            <li key={subjectId} className="rounded-md border border-border p-3">
              <p className="font-medium text-fg">{subjectName}</p>
              <p className="text-xs text-muted">
                {count} response{count === 1 ? '' : 's'}
                {avg != null ? ` · avg ${avg.toFixed(1)}/10` : ''}
              </p>
              <p className="mt-1 text-xs text-muted">
                {list.map((e) => REL_LABELS[e.relationship]).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
