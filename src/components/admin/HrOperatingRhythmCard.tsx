import { useState } from 'react'
import { CalendarClock, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/helpers'

const ROUTING_RULE: { when: string; where: string }[] = [
  { when: 'Needs a record, approval or audit trail', where: 'Portal' },
  { when: 'Needs to reach every inbox', where: 'Gmail (hr@afrivate.org)' },
  { when: 'Teaches a skill', where: 'Alison (assign & track in portal)' },
  { when: 'Is a master document', where: 'Google Drive (staff copy in Resources)' },
]

const MONTHLY_CYCLE: { week: string; task: string }[] = [
  { week: 'Week 1', task: 'Assign the month’s Alison course (HR dashboard) and announce on Gmail. Keep the pulse open.' },
  { week: 'Week 2', task: 'Publish the bi-weekly digest: send on Gmail, then post as a Memo with type “HR digest”.' },
  { week: 'Week 3', task: 'Review learning submissions and approve certificates. Nudge anyone behind.' },
  { week: 'Week 4', task: 'Close the pulse, export KPIs, and chase managers who haven’t logged their 1:1s.' },
]

const CADENCE: { activity: string; frequency: string }[] = [
  { activity: 'HR digest', frequency: 'Bi-weekly' },
  { activity: 'Course of the month', frequency: 'Monthly' },
  { activity: 'Pulse survey', frequency: 'Monthly' },
  { activity: 'Town hall', frequency: 'Monthly' },
  { activity: 'Manager 1:1s', frequency: 'Monthly' },
  { activity: 'OKR setting', frequency: 'Quarterly' },
  { activity: 'AfriVate Awards', frequency: 'Quarterly' },
  { activity: '360° feedback', frequency: 'Bi-annual' },
]

/** In-portal reference of the HR operating rhythm — mirrors the HR team's working guide. */
export function HrOperatingRhythmCard() {
  const [open, setOpen] = useState(false)

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left ring-focus hover:bg-surface-2/50"
      >
        <CalendarClock className="h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">HR operating rhythm</p>
          <p className="text-xs text-muted">The monthly cycle, cadence, and where each thing lives.</p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div className="space-y-5 border-t border-border px-4 py-4">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Where things go
            </h4>
            <ul className="space-y-1.5 text-sm">
              {ROUTING_RULE.map((r) => (
                <li key={r.when} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
                  <span className="text-fg">{r.when}</span>
                  <span className="shrink-0 font-medium text-accent">{r.where}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Monthly HR cycle
            </h4>
            <ul className="space-y-2 text-sm">
              {MONTHLY_CYCLE.map((c) => (
                <li key={c.week} className="rounded-md border border-border p-2.5">
                  <span className="font-medium text-fg">{c.week}</span>
                  <span className="mt-0.5 block text-muted">{c.task}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Cadence at a glance
            </h4>
            <div className="grid grid-cols-1 gap-1.5 min-[400px]:grid-cols-2">
              {CADENCE.map((c) => (
                <div
                  key={c.activity}
                  className="flex items-center justify-between rounded-md bg-surface-2/40 px-2.5 py-1.5 text-sm"
                >
                  <span className="text-fg">{c.activity}</span>
                  <span className="shrink-0 text-xs font-medium text-muted">{c.frequency}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </Card>
  )
}
