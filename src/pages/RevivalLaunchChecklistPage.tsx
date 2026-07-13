import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FilePenLine,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn, relativeTime } from '@/utils/helpers'
import { canAccessRevivalLaunchChecklist, REVIVAL_LAUNCH_PEOPLE } from '@/lib/revivalLaunchAccess'
import {
  REVIVAL_ALISON_COURSE,
  REVIVAL_LAUNCH_PHASES,
  REVIVAL_LAUNCH_UNITS,
  taskMatchesPersonFilter,
  type RevivalLaunchTask,
  type RevivalPerson,
} from '@/content/revivalLaunchChecklist'
import { useRevivalLaunchChecklist } from '@/hooks/useRevivalLaunchChecklist'
import { useComposerDrafts } from '@/hooks/useComposerDrafts'
import { isMessagePayload, isMemoPayload, type MessageDraftPayload } from '@/lib/composerDrafts'
import { notifySuccess } from '@/lib/notify'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'

type PersonFilter = RevivalPerson | 'all'

const PERSON_STYLES: Record<
  RevivalPerson,
  { badge: 'info' | 'warning' | 'brand'; label: string }
> = {
  e: { badge: 'brand', label: 'Emmanuel' },
  d: { badge: 'info', label: 'Daniel' },
  o: { badge: 'warning', label: 'Opemipo' },
}

const TAG_TONES: Record<string, 'danger' | 'success' | 'warning' | 'info' | 'muted'> = {
  critical: 'danger',
  portal: 'success',
  email: 'warning',
  whatsapp: 'success',
  approval: 'info',
  time: 'muted',
}

function copyText(text: string, label: string) {
  void navigator.clipboard.writeText(text)
  notifySuccess(`${label} copied`)
}

function TaskRow({
  task,
  done,
  autoDone,
  onToggle,
}: {
  task: RevivalLaunchTask
  done: boolean
  autoDone: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full touch-manipulation items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60',
          done && 'bg-emerald-500/5',
        )}
        aria-pressed={done}
      >
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
            done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-surface',
          )}
        >
          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm leading-snug',
              done ? 'text-muted line-through decoration-emerald-500/40' : 'text-fg',
            )}
          >
            {task.title}
          </span>
          {task.subtitle ? (
            <span className="mt-1 block text-xs leading-relaxed text-muted">{task.subtitle}</span>
          ) : null}
          <span className="mt-2 flex flex-wrap gap-1.5">
            {task.people.map((p) => (
              <Badge key={p} tone={PERSON_STYLES[p].badge}>
                {PERSON_STYLES[p].label}
              </Badge>
            ))}
            {task.tags.map((tag) => (
              <Badge key={tag} tone={TAG_TONES[tag] ?? 'muted'}>
                {tag}
              </Badge>
            ))}
            {task.timeLabel ? <Badge tone="muted">{task.timeLabel}</Badge> : null}
            {autoDone ? (
              <Badge tone="success">
                <Sparkles className="h-3 w-3" /> Auto
              </Badge>
            ) : null}
          </span>
          {task.link ? (
            <Link
              to={task.link}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Open in portal <ExternalLink className="h-3 w-3" />
            </Link>
          ) : null}
        </span>
      </button>
    </li>
  )
}

export function RevivalLaunchChecklistPage() {
  const { user } = useAuth()
  const { progress, completedIds, loading, toggleTask } = useRevivalLaunchChecklist()
  const { byKind, deleteDraft, saveDraft } = useComposerDrafts()
  const [personFilter, setPersonFilter] = useState<PersonFilter>('all')
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())
  const [memoOpen, setMemoOpen] = useState<string | null>(null)
  const [messageEdits, setMessageEdits] = useState<
    Record<string, { subject: string; body: string }>
  >({})

  const launchDrafts = useMemo(() => {
    const revival = [...byKind.memo, ...byKind.message].filter((d) =>
      d.sourceId?.startsWith('revival:'),
    )
    return revival.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
  }, [byKind.memo, byKind.message])

  const visibleTasks = useMemo(() => {
    return REVIVAL_LAUNCH_UNITS.flatMap((u) =>
      u.tasks.filter((t) => taskMatchesPersonFilter(t, personFilter)),
    )
  }, [personFilter])

  const stats = useMemo(() => {
    const total = visibleTasks.length
    const done = visibleTasks.filter((t) => completedIds.has(t.id)).length
    const pct = total ? Math.round((done / total) * 100) : 0
    return { total, done, remaining: total - done, pct }
  }, [visibleTasks, completedIds])

  if (!user || !canAccessRevivalLaunchChecklist(user)) {
    return <Navigate to="/" replace />
  }

  const filterButtons: { id: PersonFilter; label: string }[] = [
    { id: 'all', label: '🌍 Everyone' },
    { id: 'e', label: `🟣 ${REVIVAL_LAUNCH_PEOPLE.e.label}` },
    { id: 'd', label: `🔵 ${REVIVAL_LAUNCH_PEOPLE.d.label}` },
    { id: 'o', label: `🟡 ${REVIVAL_LAUNCH_PEOPLE.o.label}` },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <PageHeader
        title="Revival launch checklist"
        description="Day 1 launch tasks for Emmanuel, Daniel, and Opemipo. Check off manually — portal actions auto-complete where detected."
      />

      <Card padding="md" accentBorder="info" className="border-l-4 border-l-brand">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Recommended Alison course (all staff)</p>
            <p className="mt-1 text-sm text-muted">{REVIVAL_ALISON_COURSE.title}</p>
            <p className="mt-1 text-xs text-muted">
              {REVIVAL_ALISON_COURSE.duration} · Free certificate · Assign via Admin → HR → Learning
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => copyText(REVIVAL_ALISON_COURSE.url, 'Course link')}
          >
            <Copy className="h-3.5 w-3.5" /> Copy link
          </Button>
        </div>
        <a
          href={REVIVAL_ALISON_COURSE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          Open on Alison <ExternalLink className="h-3 w-3" />
        </a>
      </Card>

      <Card padding="md">
        <h2 className="mb-3 text-sm font-semibold text-fg">Launch drafts (saved on this device)</h2>
        <p className="mb-4 text-xs text-muted">
          Templates are saved as drafts on this device. Portal memos open in Memos; email and
          WhatsApp drafts can be edited here, saved, then copied to send. Daniel needs portal access
          before Unit 1 tasks can auto-complete for him.
        </p>
        {launchDrafts.length === 0 ? (
          <p className="text-sm text-muted">Seeding drafts… refresh if this stays empty.</p>
        ) : (
          <div className="space-y-2">
            {launchDrafts.map((draft) => {
              const open = memoOpen === draft.id
              const memoPayload = isMemoPayload(draft.payload) ? draft.payload : null
              const messagePayload = isMessagePayload(draft.payload) ? draft.payload : null
              const edit = messageEdits[draft.id]
              const previewBody =
                edit?.body ?? memoPayload?.body ?? messagePayload?.body ?? ''
              const previewSubject =
                edit?.subject ?? memoPayload?.title ?? messagePayload?.subject ?? draft.label
              const copyBody =
                messagePayload?.channel === 'whatsapp'
                  ? previewBody
                  : `Subject: ${previewSubject}\n\n${previewBody}`
              return (
                <div key={draft.id} className="rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setMemoOpen(open ? null : draft.id)
                      if (!open && messagePayload && !messageEdits[draft.id]) {
                        setMessageEdits((prev) => ({
                          ...prev,
                          [draft.id]: {
                            subject: messagePayload.subject,
                            body: messagePayload.body,
                          },
                        }))
                      }
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-fg hover:bg-surface-2/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{draft.label}</span>
                      <span className="block text-[11px] font-normal text-muted">
                        {draft.kind === 'memo' ? 'Portal memo draft' : 'Message draft'} · Updated{' '}
                        {relativeTime(draft.updatedAt)}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
                    />
                  </button>
                  {open ? (
                    <div className="border-t border-border px-3 py-3">
                      {messagePayload ? (
                        <div className="space-y-3">
                          {messagePayload.channel === 'email' ? (
                            <Input
                              label="Subject"
                              value={previewSubject}
                              onChange={(e) =>
                                setMessageEdits((prev) => ({
                                  ...prev,
                                  [draft.id]: {
                                    subject: e.target.value,
                                    body: prev[draft.id]?.body ?? messagePayload.body,
                                  },
                                }))
                              }
                            />
                          ) : (
                            <p className="text-xs font-medium text-muted">WhatsApp message</p>
                          )}
                          <Textarea
                            label={messagePayload.channel === 'email' ? 'Body' : 'Message'}
                            rows={10}
                            value={previewBody}
                            onChange={(e) =>
                              setMessageEdits((prev) => ({
                                ...prev,
                                [draft.id]: {
                                  subject: prev[draft.id]?.subject ?? messagePayload.subject,
                                  body: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <p className="mb-2 text-xs font-medium text-muted">
                            Subject: {previewSubject}
                          </p>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-surface-2 p-3 text-xs leading-relaxed text-fg">
                            {previewBody}
                          </pre>
                        </>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {draft.kind === 'memo' ? (
                          <Link
                            to={`/announcements?draft=${encodeURIComponent(draft.id)}`}
                            className="inline-flex h-9 min-h-[36px] items-center justify-center gap-2 rounded-md bg-accent px-3 text-xs font-medium text-white shadow-sm hover:bg-accent-hover sm:text-sm"
                          >
                            <FilePenLine className="h-3.5 w-3.5" /> Open in Memos
                          </Link>
                        ) : null}
                        {messagePayload ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const payload: MessageDraftPayload = {
                                subject: previewSubject,
                                body: previewBody,
                                channel: messagePayload.channel,
                              }
                              saveDraft({
                                id: draft.id,
                                kind: 'message',
                                label: draft.label,
                                payload,
                                sourceId: draft.sourceId,
                              })
                              notifySuccess('Message draft saved')
                            }}
                          >
                            Save draft
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyText(copyBody, draft.label)}
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDraft(draft.id)}
                          aria-label={`Delete ${draft.label}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          All memo drafts also appear under{' '}
          <Link to="/announcements" className="font-medium text-accent hover:underline">
            Memos → Memo drafts
          </Link>
          .
        </p>
      </Card>

      <div className="overflow-hidden rounded-xl bg-brand text-white">
        <div className="px-5 py-6 text-center">
          <Badge tone="success" className="mb-3 border-emerald-400/30 bg-emerald-500/20 text-emerald-100">
            Revival starts now
          </Badge>
          <h2 className="text-xl font-bold sm:text-2xl">
            The AfriVate <span className="text-emerald-300">Day 1</span> launch checklist
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
            Filter by person. Check off as you go. Auto-detection ticks portal tasks when the action
            is done.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setPersonFilter(btn.id)}
                className={cn(
                  'rounded-full border px-4 py-2 text-xs font-semibold transition-colors',
                  personFilter === btn.id
                    ? 'border-emerald-300 bg-white/15 text-white'
                    : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white',
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Done', value: stats.done, accent: 'text-emerald-600' },
          { label: 'Remaining', value: stats.remaining, accent: 'text-brand' },
          { label: 'Complete', value: `${stats.pct}%`, accent: 'text-accent' },
        ].map((s) => (
          <Card key={s.label} padding="sm" className="text-center">
            <p className={cn('text-xl font-bold tabular-nums', s.accent ?? 'text-fg')}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${stats.pct}%` }}
        />
      </div>
      {loading ? <p className="text-center text-xs text-muted">Loading shared progress…</p> : null}

      {REVIVAL_LAUNCH_PHASES.map((phase) => {
        const phaseUnits = REVIVAL_LAUNCH_UNITS.filter((u) => u.phaseId === phase.id)
        const phaseTasks = phaseUnits.flatMap((u) =>
          u.tasks.filter((t) => taskMatchesPersonFilter(t, personFilter)),
        )
        if (phaseTasks.length === 0) return null

        return (
          <section key={phase.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="shrink-0 rounded-full border border-border bg-surface-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                {phase.label}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {phaseUnits.map((unit) => {
              const unitTasks = unit.tasks.filter((t) => taskMatchesPersonFilter(t, personFilter))
              if (unitTasks.length === 0) return null
              const unitDone = unitTasks.filter((t) => completedIds.has(t.id)).length
              const collapsed = collapsedUnits.has(unit.id)
              const unitPct = unitTasks.length
                ? Math.round((unitDone / unitTasks.length) * 100)
                : 0

              return (
                <Card key={unit.id} padding="none" className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedUnits((prev) => {
                        const next = new Set(prev)
                        if (next.has(unit.id)) next.delete(unit.id)
                        else next.add(unit.id)
                        return next
                      })
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/40"
                  >
                    <span className="text-lg">{unit.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg">{unit.title}</span>
                      <span className="block text-xs text-muted">{unit.meta}</span>
                    </span>
                    <span className="hidden w-16 shrink-0 overflow-hidden rounded-full bg-surface-2 sm:block">
                      <span
                        className="block h-1 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${unitPct}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                      {unitDone}/{unitTasks.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted transition-transform',
                        !collapsed && 'rotate-180',
                      )}
                    />
                  </button>
                  {!collapsed ? (
                    <ul className="divide-y divide-border border-t border-border">
                      {unitTasks.map((task) => {
                        const entry = progress[task.id]
                        return (
                          <TaskRow
                            key={task.id}
                            task={task}
                            done={completedIds.has(task.id)}
                            autoDone={Boolean(entry?.autoCompleted)}
                            onToggle={() => void toggleTask(task.id)}
                          />
                        )
                      })}
                    </ul>
                  ) : null}
                </Card>
              )
            })}
          </section>
        )
      })}

      {visibleTasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No tasks for this filter.</p>
      ) : null}

      {stats.total > 0 && stats.done === stats.total ? (
        <Card padding="lg" className="text-center">
          <p className="text-3xl">🎉</p>
          <p className="mt-2 text-lg font-bold text-fg">All visible tasks complete!</p>
          <p className="mt-1 text-sm text-muted">
            The revival is running on systems. Keep the rhythm going.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
