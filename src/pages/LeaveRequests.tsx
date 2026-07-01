import { useMemo, useState } from 'react'
import {
  Plus,
  Calendar as CalendarIcon,
  Plane,
  Stethoscope,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
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
import { TabBar } from '@/components/ui/TabBar'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeaveSupportingDoc } from '@/components/shared/LeaveSupportingDoc'
import { cn, fmtDate, firstName, isHR, isLead, relativeTime } from '@/utils/helpers'
import { leaveRequestsForManager } from '@/utils/leaveScope'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import { uploadPortalFile } from '@/lib/supabase/fileStorage'
import { useConfirm } from '@/context/useConfirm'
import { notifyError } from '@/lib/notify'
import { confirms } from '@/content/copy'
import type { LeaveComment, LeaveRequest, LeaveStatus, LeaveType, User } from '@/types'

type Tab = 'my' | 'all' | 'calendar'

const ANNUAL_ALLOWANCE: Record<LeaveType, number> = {
  annual: 20,
  sick: 10,
  emergency: 7,
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
  emergency: {
    label: 'Emergency',
    icon: AlertTriangle,
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
  const confirm = useConfirm()
  const { users, leaveRequests, leaveComments, submitLeave, reviewLeave, addLeaveComment } = useData()

  const canManage = isLead(user)
  const [tab, setTab] = useState<Tab>('my')
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState<RequestDraft>(emptyDraft)
  const [supportingFile, setSupportingFile] = useState<File | null>(null)
  const [reviewing, setReviewing] = useState<{ request: LeaveRequest; status: 'approved' | 'declined' } | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [approvedDays, setApprovedDays] = useState('')
  const [threadComment, setThreadComment] = useState('')
  const [detailRequest, setDetailRequest] = useState<LeaveRequest | null>(null)
  const [detailReply, setDetailReply] = useState('')
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
    if (!user) return {} as Record<
      LeaveType,
      { used: number; pending: number; left: number; total: number }
    >
    const thisYear = new Date().getFullYear()
    const out = {} as Record<
      LeaveType,
      { used: number; pending: number; left: number; total: number }
    >
    ;(Object.keys(ANNUAL_ALLOWANCE) as LeaveType[]).forEach((t) => {
      const mine = leaveRequests.filter(
        (l) => l.userId === user.id && l.type === t && parseISO(l.startDate).getFullYear() === thisYear,
      )
      const used = mine
        .filter((l) => l.status === 'approved')
        .reduce(
          (sum, l) => sum + (l.approvedDays ?? dayCount(l.startDate, l.endDate)),
          0,
        )
      const pending = mine
        .filter((l) => l.status === 'pending')
        .reduce((sum, l) => sum + dayCount(l.startDate, l.endDate), 0)
      const total = ANNUAL_ALLOWANCE[t]
      out[t] = { used, pending, left: Math.max(0, total - used - pending), total }
    })
    return out
  }, [leaveRequests, user])

  const manageRequests = useMemo(
    () => (user && canManage ? leaveRequestsForManager(leaveRequests, user, users) : []),
    [leaveRequests, user, users, canManage],
  )

  const pendingCount = useMemo(
    () => manageRequests.filter((l) => l.status === 'pending').length,
    [manageRequests],
  )

  if (!user) return null

  const openForm = () => {
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setDraft(emptyDraft)
    setSubmitting(false)
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!draft.startDate || !draft.endDate || !draft.reason.trim()) return
    if (draft.endDate < draft.startDate) return
    const requestedDays = dayCount(draft.startDate, draft.endDate)
    const balance = balances[draft.type]
    if (balance && requestedDays > balance.left) {
      notifyError(`Not enough ${draft.type.replace('_', ' ')} leave remaining (${balance.left} days left).`)
      return
    }
    const ok = await confirm({
      title: confirms.submitLeaveTitle,
      message: confirms.submitLeave,
      confirmLabel: 'Send request',
    })
    if (!ok) return
    setSubmitting(true)
    let supportingDocPath: string | undefined
    let supportingDocName = draft.supportingDocName.trim() || undefined
    if (supportingFile) {
      if (!isSupabaseAuthEnabled() || !supabase) {
        notifyError('File upload requires Supabase. Connect your portal or ask an administrator.')
        setSubmitting(false)
        return
      }
      const uploaded = await uploadPortalFile(supabase, 'leave', supportingFile, user.id)
      if ('error' in uploaded) {
        notifyError(uploaded.error)
        setSubmitting(false)
        return
      }
      supportingDocPath = uploaded.path
      supportingDocName = supportingFile.name
    }
    submitLeave({
      userId: user.id,
      type: draft.type,
      startDate: draft.startDate,
      endDate: draft.endDate,
      reason: draft.reason.trim(),
      supportingDocName,
      supportingDocPath,
    })
    closeForm()
    setSupportingFile(null)
  }

  const startReview = (r: LeaveRequest, status: 'approved' | 'declined') => {
    setReviewing({ request: r, status })
    setReviewNote('')
    setApprovedDays(String(dayCount(r.startDate, r.endDate)))
  }

  const confirmReview = async () => {
    if (!reviewing) return
    const ok = await confirm({
      title: reviewing.status === 'approved' ? confirms.approveLeaveTitle : confirms.declineLeaveTitle,
      message: reviewing.status === 'approved' ? confirms.approveLeave : confirms.declineLeave,
      confirmLabel: reviewing.status === 'approved' ? 'Approve' : 'Decline',
      destructive: reviewing.status === 'declined',
    })
    if (!ok) return
    const days =
      reviewing.status === 'approved' && approvedDays.trim()
        ? Number(approvedDays)
        : undefined
    reviewLeave(
      reviewing.request.id,
      reviewing.status,
      user.id,
      reviewNote.trim() || undefined,
      days,
    )
    setReviewing(null)
    setReviewNote('')
    setApprovedDays('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time off"
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

      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'my',
            label: (
              <>
                <Inbox className="h-4 w-4" /> My requests
              </>
            ),
          },
          ...(canManage
            ? [
                {
                  id: 'all' as const,
                  label: (
                    <>
                      <Inbox className="h-4 w-4" /> {isHR(user) ? 'All requests' : 'Team requests'}
                    </>
                  ),
                  count: pendingCount > 0 ? pendingCount : undefined,
                },
                {
                  id: 'calendar' as const,
                  label: (
                    <>
                      <CalendarIcon className="h-4 w-4" /> Calendar
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />

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
          <RequestsList
            requests={myRequests}
            users={users}
            showWho={false}
            viewer={user}
            leaveComments={leaveComments}
            currentUserId={user.id}
            onViewConversation={setDetailRequest}
          />
        )
      ) : null}

      {/* ALL REQUESTS (Lead/HR/Admin) */}
      {tab === 'all' && canManage ? (
        manageRequests.length === 0 ? (
          <EmptyState icon={Inbox} title="Nothing to review" />
        ) : (
          <RequestsList
            requests={[...manageRequests].sort((a, b) =>
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
            viewer={user}
            leaveComments={leaveComments}
            currentUserId={user.id}
            onViewConversation={setDetailRequest}
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
            requests={manageRequests.filter((r) => r.status !== 'declined')}
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
            <Button type="button" onClick={submitForm} loading={submitting} disabled={submitting}>
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
                  · {balances[draft.type].left} days remaining
                  {balances[draft.type].pending > 0
                    ? ` (${balances[draft.type].pending} pending approval)`
                    : ''}
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
            placeholder={
              draft.type === 'emergency'
                ? 'Describe the emergency (e.g. family bereavement, medical crisis, urgent travel)…'
                : 'Brief context for HR / your team lead'
            }
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-fg">
              Supporting document (optional)
            </label>
            <input
              type="file"
              className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-fg"
              onChange={(e) => setSupportingFile(e.target.files?.[0] ?? null)}
            />
            {!supportingFile ? (
              <Input
                className="mt-2"
                value={draft.supportingDocName}
                onChange={(e) => setDraft({ ...draft, supportingDocName: e.target.value })}
                placeholder="e.g. medical-cert.pdf"
                hint="Or attach a file above when storage is configured."
              />
            ) : null}
          </div>
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
              onClick={() => void confirmReview()}
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
                {TYPE_META[reviewing.request.type].label} ·{' '}
                {fmtDate(reviewing.request.startDate)} →{' '}
                {fmtDate(reviewing.request.endDate)} ·{' '}
                {dayCount(reviewing.request.startDate, reviewing.request.endDate)} days
              </p>
              <p className="mt-2 text-fg/90">{reviewing.request.reason}</p>
              <LeaveSupportingDoc request={reviewing.request} viewer={user} />
            </div>
            {reviewing.status === 'approved' ? (
              <Input
                type="number"
                min={1}
                label="Days to approve"
                value={approvedDays}
                onChange={(e) => setApprovedDays(e.target.value)}
                hint="You can approve fewer days than requested if needed."
              />
            ) : null}
            <LeaveCommentThread
              leaveId={reviewing.request.id}
              comments={leaveComments}
              users={users}
              currentUserId={user.id}
              canReply
              replyValue={threadComment}
              onReplyChange={setThreadComment}
              onSendReply={() => {
                addLeaveComment(reviewing.request.id, threadComment)
                setThreadComment('')
              }}
            />
            <Textarea
              label="Note (optional)"
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={
                reviewing.status === 'approved'
                  ? 'e.g. Approved for the dates requested.'
                  : 'Reason for declining — this is sent to the requester.'
              }
            />
          </div>
        ) : null}
      </Modal>

      {/* Requester / conversation detail */}
      <Modal
        open={!!detailRequest}
        onClose={() => {
          setDetailRequest(null)
          setDetailReply('')
        }}
        title="Leave request"
        size="lg"
        footer={
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setDetailRequest(null)
              setDetailReply('')
            }}
          >
            Close
          </Button>
        }
      >
        {detailRequest ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-surface-2/40 p-3 text-sm">
              <p className="font-semibold text-fg">
                {TYPE_META[detailRequest.type].label} leave ·{' '}
                {dayCount(detailRequest.startDate, detailRequest.endDate)} day
                {dayCount(detailRequest.startDate, detailRequest.endDate) === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-xs text-muted">
                {fmtDate(detailRequest.startDate)} → {fmtDate(detailRequest.endDate)} ·{' '}
                {STATUS_META[detailRequest.status].label}
              </p>
              <p className="mt-2 text-fg/90">{detailRequest.reason}</p>
              <LeaveSupportingDoc request={detailRequest} viewer={user} />
              {detailRequest.reviewerNote ? (
                <p className="mt-2 rounded-md bg-surface px-2.5 py-1.5 text-xs text-fg/80">
                  <span className="font-semibold">Note from reviewer:</span>{' '}
                  {detailRequest.reviewerNote}
                </p>
              ) : null}
            </div>
            <LeaveCommentThread
              leaveId={detailRequest.id}
              comments={leaveComments}
              users={users}
              currentUserId={user.id}
              canReply
              replyValue={detailReply}
              onReplyChange={setDetailReply}
              onSendReply={() => {
                addLeaveComment(detailRequest.id, detailReply)
                setDetailReply('')
              }}
              emptyHint="No messages yet. HR or your lead may ask questions here — you can reply below."
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function LeaveCommentThread({
  leaveId,
  comments,
  users,
  currentUserId,
  canReply,
  replyValue = '',
  onReplyChange,
  onSendReply,
  emptyHint,
}: {
  leaveId: string
  comments: LeaveComment[]
  users: User[]
  currentUserId: string
  canReply?: boolean
  replyValue?: string
  onReplyChange?: (value: string) => void
  onSendReply?: () => void
  emptyHint?: string
}) {
  const rows = comments.filter((c) => c.leaveId === leaveId)
  return (
    <div className="space-y-3 rounded-md border border-border bg-surface-2/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Conversation</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{emptyHint ?? 'No messages yet.'}</p>
      ) : (
        <ul className="max-h-48 space-y-3 overflow-y-auto text-sm">
          {rows.map((c) => {
            const author = users.find((u) => u.id === c.userId)
            const mine = c.userId === currentUserId
            return (
              <li
                key={c.id}
                className={cn('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}
              >
                {author ? (
                  <Avatar name={author.name} src={author.avatarUrl} size="xs" className="mt-0.5 shrink-0" />
                ) : null}
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2',
                    mine ? 'bg-accent/15 text-fg' : 'bg-surface text-fg',
                  )}
                >
                  <p className="text-[11px] font-medium text-muted">{author?.name ?? 'User'}</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
                  <p className="mt-1 text-[10px] text-muted">{relativeTime(c.createdAt)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {canReply && onReplyChange && onSendReply ? (
        <div className="space-y-2 border-t border-border pt-3">
          <Textarea
            label="Your reply"
            rows={2}
            value={replyValue}
            onChange={(e) => onReplyChange(e.target.value)}
            placeholder="Reply to HR or your team lead…"
          />
          <Button
            type="button"
            size="sm"
            disabled={!replyValue.trim()}
            onClick={onSendReply}
          >
            Send reply
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function RequestsList({
  requests,
  users,
  showWho,
  viewer,
  leaveComments,
  currentUserId,
  onViewConversation,
  onApprove,
  onDecline,
}: {
  requests: LeaveRequest[]
  users: User[]
  showWho: boolean
  viewer: User
  leaveComments?: LeaveComment[]
  currentUserId?: string
  onViewConversation?: (r: LeaveRequest) => void
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
          const messageCount = leaveComments?.filter((c) => c.leaveId === r.id).length ?? 0
          const canConversation =
            onViewConversation &&
            (r.userId === currentUserId || onApprove != null)
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
                        <span className="text-xs text-muted">· {u.department}</span>
                      </div>
                    ) : null}
                    <p className="text-sm font-medium text-fg">
                      {typeMeta.label} leave · {days} day{days === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-muted">
                      {fmtDate(r.startDate)} → {fmtDate(r.endDate)} · submitted{' '}
                      {relativeTime(r.submittedAt)}
                    </p>
                    <p className="mt-2 text-sm text-fg/90">{r.reason}</p>
                    <LeaveSupportingDoc request={r} viewer={viewer} />
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
                  {canConversation ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onViewConversation(r)}
                    >
                      {messageCount > 0 ? `${messageCount} message${messageCount === 1 ? '' : 's'}` : 'View / Reply'}
                    </Button>
                  ) : null}
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
                        title={`${u.name} — ${TYPE_META[r.type].label} (${r.status})`}
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
                          {firstName(u.name)}
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

