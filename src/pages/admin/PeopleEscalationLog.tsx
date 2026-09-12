import { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { notifySuccess } from '@/lib/notify'
import { fmtDate } from '@/utils/helpers'
import type { PeopleEscalationCategory, PeopleEscalationSeverity, PeopleEscalationStatus } from '@/types/hr'

const CATEGORY_OPTIONS: { value: PeopleEscalationCategory; label: string }[] = [
  { value: 'people', label: 'People' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'access', label: 'Access' },
  { value: 'pay_question', label: 'Pay question' },
  { value: 'other', label: 'Other' },
]

const SEVERITY_OPTIONS: { value: PeopleEscalationSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const STATUS_OPTIONS: { value: PeopleEscalationStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'closed', label: 'Closed' },
]

function severityTone(s: PeopleEscalationSeverity): 'muted' | 'info' | 'warning' | 'danger' {
  if (s === 'critical') return 'danger'
  if (s === 'high') return 'warning'
  if (s === 'medium') return 'info'
  return 'muted'
}

export function PeopleEscalationLog() {
  const { user } = useAuth()
  const { users } = useData()
  const { peopleEscalations, addPeopleEscalation, updatePeopleEscalation, deletePeopleEscalation } = useHr()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<PeopleEscalationCategory>('people')
  const [severity, setSeverity] = useState<PeopleEscalationSeverity>('medium')
  const [ownerId, setOwnerId] = useState(user?.id ?? '')
  const [dueAt, setDueAt] = useState('')
  const [relatedLinks, setRelatedLinks] = useState('')
  const [notes, setNotes] = useState('')
  const [showClosed, setShowClosed] = useState(false)

  const ownerOptions = useMemo(
    () =>
      users
        .filter((u) => u.active && (u.role === 'hr' || u.role === 'admin'))
        .map((u) => ({ value: u.id, label: u.name })),
    [users],
  )

  const visible = useMemo(() => {
    return peopleEscalations.filter((e) => (showClosed ? true : e.status !== 'closed'))
  }, [peopleEscalations, showClosed])

  const nameOf = (id?: string) => users.find((u) => u.id === id)?.name ?? '—'

  const add = () => {
    if (!user || !subject.trim()) return
    addPeopleEscalation({
      raisedBy: user.id,
      subject: subject.trim(),
      category,
      severity,
      ownerId: ownerId || user.id,
      status: 'open',
      dueAt: dueAt || undefined,
      relatedLinks: relatedLinks.trim() || undefined,
      resolutionNotes: notes.trim() || undefined,
    })
    setSubject('')
    setRelatedLinks('')
    setNotes('')
    setDueAt('')
    notifySuccess('Escalation logged.')
  }

  return (
    <Card padding="md">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ClipboardList className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold text-fg">People ops escalation log</h3>
        <Badge tone="muted">Not Speak up</Badge>
      </div>
      <p className="mb-4 text-sm text-muted">
        Operational follow-ups (people, delivery, access, pay questions). Confidential grievances stay on{' '}
        <strong>Speak up</strong> and are unchanged.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Short summary"
          className="sm:col-span-2"
        />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as PeopleEscalationCategory)}
          options={CATEGORY_OPTIONS}
        />
        <Select
          label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as PeopleEscalationSeverity)}
          options={SEVERITY_OPTIONS}
        />
        <Select
          label="Owner"
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          options={ownerOptions.length ? ownerOptions : [{ value: user?.id ?? '', label: user?.name ?? 'You' }]}
        />
        <Input label="Due date" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        <Input
          label="Related links"
          value={relatedLinks}
          onChange={(e) => setRelatedLinks(e.target.value)}
          placeholder="Portal task, Slack permalink"
          className="sm:col-span-2"
        />
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="sm:col-span-2"
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={add} disabled={!subject.trim()}>
          Log escalation
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          Show closed
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No open escalations.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => (
            <li key={row.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-fg">{row.subject}</p>
                  <p className="mt-1 text-xs text-muted">
                    Opened {fmtDate(row.openedAt.slice(0, 10))} by {nameOf(row.raisedBy)}
                    {row.dueAt ? ` · due ${fmtDate(row.dueAt)}` : ''}
                    {row.closedAt ? ` · closed ${fmtDate(row.closedAt.slice(0, 10))}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge>{CATEGORY_OPTIONS.find((c) => c.value === row.category)?.label}</Badge>
                  <Badge tone={severityTone(row.severity)}>{row.severity}</Badge>
                </div>
              </div>
              {row.relatedLinks ? (
                <p className="mt-2 break-all text-xs text-muted">{row.relatedLinks}</p>
              ) : null}
              <Textarea
                className="mt-3"
                rows={2}
                placeholder="Resolution notes"
                value={row.resolutionNotes ?? ''}
                onChange={(e) => updatePeopleEscalation(row.id, { resolutionNotes: e.target.value })}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Select
                  value={row.status}
                  onChange={(e) =>
                    updatePeopleEscalation(row.id, { status: e.target.value as PeopleEscalationStatus })
                  }
                  options={STATUS_OPTIONS}
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => deletePeopleEscalation(row.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
