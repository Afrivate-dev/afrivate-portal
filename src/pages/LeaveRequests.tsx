import { useMemo, useState } from 'react'
import {
  Plus,
  Calendar as CalendarIcon,
  Plane,
  Stethoscope,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Paperclip,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, fmtDate, isLead, relativeTime } from '@/utils/helpers'
import type { LeaveRequest, LeaveStatus, LeaveType, User } from '@/types'

type Tab = 'my' | 'all' | 'calendar'

const ANNUAL_ALLOWANCE: Record<LeaveType, number> = {
  annual: 20,
  sick: 10,
  compassionate: 5,
}

const TYPE_META: Record<
  LeaveType,
  { label: string; icon: typeof Plane; color: string; chipBg: string; chipText: string }
> = {
  annual: {
    label: 'Annual',
    icon: Plane,
    color: '#3e8cff',
    chipBg: 'bg-blue-500/15',
    chipText: 'text-blue-600 dark:text-blue-300',
  },
  sick: {
    label: 'Sick',
    icon: Stethoscope,
    color: '#f59e0b',
    chipBg: 'bg-amber-500/15',
    chipText: 'text-amber-600 dark:text-amber-300',
  },
  compassionate: {
    label: 'Compassionate',
    icon: HeartHandshake,
    color: '#ec4899',
    chipBg: 'bg-pink-500/15',
    chipText: 'text-pink-600 dark:text-pink-300',
  },
}

const STATUS_META: Record<
  LeaveStatus,
  { label: string; tone: 'warning' | 'success' | 'danger'; icon: typeof Clock }
> = {
  pending: { label: 'Pending', tone: 'warning', icon: Clock },
  approved: { label: 'Approved', tone: 'success', icon: CheckCircle2 },
  declined: { label: 'Declined', tone: 'danger', icon: XCircle },
}

interface RequestDraft {
  type: LeaveType
  startDate: string
  endDate: string
  reason: string
  supportingDocName: string
}

const emptyDraft: RequestDraft = {
  type: 'annual',
  startDate: '',
  endDate: '',
  reason: '',
  supportingDocName: '',
}

function dayCount(startISO: string, endISO: string) {
  return differenceInCalendarDays(parseISO(endISO), parseISO(startISO)) + 1
}

export function LeaveRequestsPage() {
  const { user } = useAuth()
  const { users, leaveRequests, submitLeave, reviewLeave } = useData()

  const canManage = isLead(user)
  const [tab, setTab] = useState<Tab>('my')
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<RequestDraft>(emptyDraft)
  const [reviewing, setReviewing] = useState<{ request: LeaveRequest; status: 'approved' | 'declined' } | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))

  const myRequests = useMemo(
    () =>
      user
        ? leaveRequests
            .filter((l) => l.userId === user.id)
            .sort((a, b) => (a.submittedAt > b.submittedAt ? -1 : 1))
        : [],
    [leaveRequests, user],
  )

  const balances = useMemo(() => {
    if (!user) return {} as Record<LeaveType, { used: number; left: number; total: number }>
    const thisYear = new Date().getFullYear()
    const out = {} as Record<LeaveType, { used: number; left: number; total: number }>
    ;(Object.keys(ANNUAL_ALLOWANCE) as LeaveType[]).forEach((t) => {
      const used = leaveRequests
        .filter(
          (l) =>
            l.userId === user.id &&
            l.type === t &&
            l.status === 'approved' &&
            parseISO(l.startDate).getFullYear() === thisYear,
        )
        .reduce((sum, l) => sum + dayCount(l.startDate, l.endDate), 0)
      const total = ANNUAL_ALLOWANCE[t]
      out[t] = { used, left: Math.max(0, total - used), total }
    })
    return out
  }, [leaveRequests, user])

  const pendingCount = useMemo(
    () => leaveRequests.filter((l) => l.status === 'pending').length,
    [leaveRequests],
  )

  if (!user) return null

  const openForm = () => {
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setDraft(emptyDraft)
  }

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.startDate || !draft.endDate || !draft.reason.trim()) return
    if (draft.endDate < draft.startDate) return
    submitLeave({
      userId: user.id,
      type: draft.type,
      startDate: draft.startDate,
      endDate: draft.endDate,
      reason: draft.reason.trim(),
      supportingDocName: draft.supportingDocName.trim() || undefined,
    })
    closeForm()
  }

  const startReview = (r: LeaveRequest, status: 'approved' | 'declined') => {
    setReviewing({ request: r, status })
    setReviewNote('')
  }

  const confirmReview = () => {
    if (!reviewing) return
    reviewLeave(reviewing.request.id, reviewing.status, user.id, reviewNote.trim() || undefined)
    setReviewing(null)
    setReviewNote('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        description="Request, track and manage time off."
        actions={
          <Button onClick={openForm}>
            <Plus className="h-4 w-4" /> Request leave
          </Button>
        }
      />

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        {(Object.keys(ANNUAL_ALLOWANCE) as LeaveType[]).map((t) => {
          const meta = TYPE_META[t]
          const b = balances[t]
          const Icon = meta.icon
          return (
            <Card key={t} padding="md">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    meta.chipBg,
                    meta.chipText,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {meta.label}
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-fg">
                    {b.left}
                    <span className="ml-1 text-sm font-normal text-muted">days left</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full"
                      style={{
                        width: `${b.total === 0 ? 0 : (b.used / b.total) * 100}%`,
                        background: meta.color,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {b.used} of {b.total} used this year
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-border">
        <TabButton active={tab === 'my'} onClick={() => setTab('my')}>
          <Inbox className="h-4 w-4" /> My requests
        </TabButton>
        {canManage ? (
          <>
            <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
              <Inbox className="h-4 w-4" /> All requests
              {pendingCount > 0 ? <Badge tone="warning">{pendingCount}</Badge> : null}
            </TabButton>
            <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')}>
              <CalendarIcon className="h-4 w-4" /> Calendar
            </TabButton>
          </>
        ) : null}
      </div>

      {/* MY REQUESTS */}
      {tab === 'my' ? (
        myRequests.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No leave requests yet"
            description="Submit a leave request to get started."
            action={
              <Button onClick={openForm}>
                <Plus className="h-4 w-4" /> Request leave
              </Button>
            }
          />
        ) : (
          <RequestsList requests={myRequests} users={users} showWho={false} />
        )
      ) : null}

      {/* ALL REQUESTS (Lead/HR/Admin) */}
      {tab === 'all' && canManage ? (
        leaveRequests.length === 0 ? (
          <EmptyState icon={Inbox} title="Nothing to review" />
        ) : (
          <RequestsList
            requests={[...leaveRequests].sort((a, b) =>
              a.status === 'pending' && b.status !== 'pending'
                ? -1
                : a.status !== 'pending' && b.status === 'pending'
                  ? 1
                  : a.submittedAt > b.submittedAt
                    ? -1
                    : 1,
            )}
            users={users}
            showWho
            onApprove={(r) => startReview(r, 'approved')}
            onDecline={(r) => startReview(r, 'declined')}
          />
        )
      ) : null}

      {/* CALENDAR */}
      {tab === 'calendar' && canManage ? (
        <Card padding="md">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setCalendarMonth((m) => addMonths(m, -1))}
              className="rounded-md p-2 text-fg hover:bg-surface-2 ring-focus"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-fg">
              {format(calendarMonth, 'MMMM yyyy')}
            </p>
            <button
              onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
              className="rounded-md p-2 text-fg hover:bg-surface-2 ring-focus"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <LeaveCalendar
            month={calendarMonth}
            requests={leaveRequests.filter((r) => r.status !== 'declined')}
            users={users}
          />

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            {(Object.keys(TYPE_META) as LeaveType[]).map((t) => (
              <span key={t} className="inline-flex items-center gap-2 text-muted">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: TYPE_META[t].color }}
                />
                {TYPE_META[t].label}
              </span>
            ))}
            <span className="ml-auto text-muted">Pending requests shown at 50% opacity</span>
          </div>
        </Card>
      ) : null}

      {/* Request modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title="Request leave"
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="button" onClick={submitForm}>
              Submit request
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitForm}>
          <Select
            label="Leave type"
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as LeaveType })}
            options={(Object.keys(TYPE_META) as LeaveType[]).map((t) => ({
              value: t,
              label: TYPE_META[t].label,
            }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="date"
              label="Start date"
              required
              value={draft.startDate}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
            />
            <Input
              type="date"
              label="End date"
              required
              value={draft.endDate}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
              min={draft.startDate}
            />
          </div>
          {draft.startDate && draft.endDate && draft.endDate >= draft.startDate ? (
            <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2 text-xs text-muted">
              <strong className="text-fg">
                {dayCount(draft.startDate, draft.endDate)} day
                {dayCount(draft.startDate, draft.endDate) === 1 ? '' : 's'}
              </strong>{' '}
              of {TYPE_META[draft.type].label.toLowerCase()} leave
              {balances[draft.type] ? (
                <>
                  {' '}
                  &middot; {balances[draft.type].left} days remaining in your balance
                </>
              ) : null}
            </div>
          ) : null}
          <Textarea
            label="Reason"
            required
            rows={3}
            value={draft.reason}
            onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
            placeholder="Brief context for HR / your team lead"
          />
          <Input
            label="Supporting document (optional)"
            value={draft.supportingDocName}
            onChange={(e) => setDraft({ ...draft, supportingDocName: e.target.value })}
            placeholder="e.g. medical-cert.pdf"
            hint="Type a filename for your records. Attaching files directly will be available in a later update."
          />
        </form>
      </Modal>

      {/* Review modal */}
      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        title={reviewing?.status === 'approved' ? 'Approve leave request' : 'Decline leave request'}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={reviewing?.status === 'declined' ? 'danger' : 'primary'}
              onClick={confirmReview}
            >
              {reviewing?.status === 'approved' ? 'Approve' : 'Decline'}
            </Button>
          </>
        }
      >
        {reviewing ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-surface-2/40 p-3 text-sm">
              <p className="font-semibold text-fg">
                {users.find((u) => u.id === reviewing.request.userId)?.name}
              </p>
              <p className="mt-1 text-muted">
                {TYPE_META[reviewing.request.type].label} \u00b7{' '}
                {fmtDate(reviewing.request.startDate)} \u2192{' '}
                {fmtDate(reviewing.request.endDate)} \u00b7{' '}
                {dayCount(reviewing.request.startDate, reviewing.request.endDate)} days
              </p>
              <p className="mt-2 text-fg/90">{reviewing.request.reason}</p>
            </div>
            <Textarea
              label="Note (optional)"
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={
                reviewing.status === 'approved'
                  ? 'e.g. Enjoy your trip!'
                  : 'Reason for declining \u2014 this is sent to the requester.'
              }
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
        active ? 'text-accent' : 'text-muted hover:text-fg',
      )}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
      ) : null}
    </button>
  )
}

function RequestsList({
  requests,
  users,
  showWho,
  onApprove,
  onDecline,
}: {
  requests: LeaveRequest[]
  users: User[]
  showWho: boolean
  onApprove?: (r: LeaveRequest) => void
  onDecline?: (r: LeaveRequest) => void
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <ul className="divide-y divide-border">
        {requests.map((r) => {
          const u = users.find((x) => x.id === r.userId)
          const typeMeta = TYPE_META[r.type]
          const statusMeta = STATUS_META[r.status]
          const days = dayCount(r.startDate, r.endDate)
          const TypeIcon = typeMeta.icon
          const StatusIcon = statusMeta.icon
          return (
            <li key={r.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      typeMeta.chipBg,
                      typeMeta.chipText,
                    )}
                  >
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {showWho && u ? (
                      <div className="mb-1 flex items-center gap-2">
                        <Avatar name={u.name} src={u.avatarUrl} size="xs" />
                        <p className="truncate text-sm font-semibold text-fg">{u.name}</p>
                        <span className="text-xs text-muted">\u00b7 {u.department}</span>
                      </div>
                    ) : null}
                    <p className="text-sm font-medium text-fg">
                      {typeMeta.label} leave \u00b7 {days} day{days === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-muted">
                      {fmtDate(r.startDate)} \u2192 {fmtDate(r.endDate)} \u00b7 submitted{' '}
                      {relativeTime(r.submittedAt)}
                    </p>
                    <p className="mt-2 text-sm text-fg/90">{r.reason}</p>
                    {r.supportingDocName ? (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted">
                        <Paperclip className="h-3 w-3" />
                        {r.supportingDocName}
                      </p>
                    ) : null}
                    {r.reviewerNote ? (
                      <p className="mt-2 rounded-md bg-surface-2 px-2.5 py-1.5 text-xs text-fg/80">
                        <span className="font-semibold">Note from reviewer:</span>{' '}
                        {r.reviewerNote}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <Badge tone={statusMeta.tone}>
                    <StatusIcon className="h-3 w-3" /> {statusMeta.label}
                  </Badge>
                  {onApprove && onDecline && r.status === 'pending' ? (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="primary" onClick={() => onApprove(r)}>
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDecline(r)}>
                        <X className="h-3.5 w-3.5" /> Decline
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function LeaveCalendar({
  month,
  requests,
  users,
}: {
  month: Date
  requests: LeaveRequest[]
  users: User[]
}) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const requestsOnDay = (d: Date) =>
    requests.filter((r) =>
      isWithinInterval(d, { start: parseISO(r.startDate), end: parseISO(r.endDate) }),
    )

  return (
    <div>
      {/* Desktop grid */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-7 border border-border bg-surface text-[11px] uppercase tracking-wide text-muted">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="border-b border-border px-2 py-2 font-medium">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-x border-b border-border bg-surface">
          {days.map((d) => {
            const inMonth = isSameMonth(d, monthStart)
            const reqs = requestsOnDay(d)
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  'min-h-[96px] border-b border-r border-border p-1.5 last:border-r-0',
                  !inMonth && 'bg-surface-2/30',
                )}
              >
                <p
                  className={cn(
                    'mb-1 text-xs font-medium',
                    !inMonth && 'text-muted/60',
                    inMonth && 'text-fg',
                  )}
                >
                  {format(d, 'd')}
                </p>
                <div className="space-y-1">
                  {reqs.slice(0, 3).map((r) => {
                    const u = users.find((x) => x.id === r.userId)
                    if (!u) return null
                    return (
                      <div
                        key={r.id}
                        title={`${u.name} \u2014 ${TYPE_META[r.type].label} (${r.status})`}
                        className={cn(
                          'flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px]',
                          r.status === 'pending' && 'opacity-50',
                        )}
                        style={{ background: `${TYPE_META[r.type].color}25`, color: TYPE_META[r.type].color }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: TYPE_META[r.type].color }}
                        />
                        <span className="truncate font-medium">
                          {u.name.split(' ')[0]}
                        </span>
                      </div>
                    )
                  })}
                  {reqs.length > 3 ? (
                    <p className="px-1 text-[10px] text-muted">+{reqs.length - 3} more</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile list */}
      <div className="space-y-2 lg:hidden">
        {days
          .filter((d) => isSameMonth(d, monthStart))
          .map((d) => {
            const reqs = requestsOnDay(d)
            if (reqs.length === 0) return null
            return (
              <div key={d.toISOString()} className="rounded-md border border-border bg-surface p-3">
                <p className="text-xs font-semibold text-fg">{format(d, 'EEE d MMM')}</p>
                <ul className="mt-2 space-y-1">
                  {reqs.map((r) => {
                    const u = users.find((x) => x.id === r.userId)
                    if (!u) return null
                    return (
                      <li
                        key={r.id}
                        className={cn(
                          'flex items-center gap-2 rounded px-2 py-1 text-xs',
                          r.status === 'pending' && 'opacity-60',
                        )}
                        style={{ background: `${TYPE_META[r.type].color}20`, color: TYPE_META[r.type].color }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: TYPE_META[r.type].color }}
                        />
                        <span className="font-medium">{u.name}</span>
                        <span className="ml-auto">{TYPE_META[r.type].label}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        {days.filter((d) => isSameMonth(d, monthStart) && requestsOnDay(d).length > 0).length ===
        0 ? (
          <EmptyState icon={CalendarIcon} title="No leave booked this month" />
        ) : null}
      </div>
    </div>
  )
}

