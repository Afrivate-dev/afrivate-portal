import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, Sparkles, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { askAva, isAvaEnabled } from '@/lib/ava/avaClient'
import { buildAvaUserContext } from '@/lib/ava/buildContext'
import { AVA_SUGGESTED_PROMPTS } from '@/lib/ava/knowledge'
import type { AvaChatMessage, AvaResponse, AvaSuggestedAction } from '@/lib/ava/types'
import { computeProfileCompleteness } from '@/lib/hrPeopleOps'
import { managedReportIds } from '@/utils/hrMetrics'
import { cn, isHR, isLead, uid, weekLabel } from '@/utils/helpers'
import { Button } from '@/components/ui/Button'
import { usersAwaitingApproval } from '@/context/dataContextShared'

type UiMessage = AvaChatMessage & {
  id: string
  citations?: string[]
  links?: AvaResponse['links']
  suggestedActions?: AvaSuggestedAction[]
  source?: AvaResponse['source']
}

function mondayIso(d = new Date()) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x.toISOString().slice(0, 10)
}

export function AvaFab() {
  const enabled = isAvaEnabled()
  const { user } = useAuth()
  const {
    users,
    teams,
    departments,
    tasks,
    leaveRequests,
    checkIns,
    submitLeave,
    submitCheckIn,
  } = useData()
  const hr = useHr()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello — I am AVA, the AfriVate Virtual Assistant. I can help you use Team Space, explain policies, and guide you through leave, learning, tasks, and more. What do you need?',
    },
  ])
  const [pendingAction, setPendingAction] = useState<AvaSuggestedAction | null>(null)
  const [actionNote, setActionNote] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, pendingAction])

  const context = useMemo(() => {
    if (!user) return null
    const managed = isLead(user)
      ? [...managedReportIds(user, users, teams, departments)]
      : []
    const mySubs = hr.learningSubmissions.filter((s) => s.userId === user.id && s.status === 'pending')
    const openSurveys = hr.pulseSurveys.filter((s) => s.active).length
    const myProfile = hr.employeeProfiles.find((p) => p.userId === user.id)
    const metrics = isHR(user) ? hr.getMetrics() : null
    return buildAvaUserContext({
      user,
      tasks,
      leaveRequests,
      checkIns,
      managedUserIds: managed,
      learningPendingForUser: mySubs.length,
      openSurveysForUser: openSurveys,
      myInfoCompleteness: myProfile ? computeProfileCompleteness(myProfile) : undefined,
      hrStats: metrics
        ? {
            pendingApprovals: usersAwaitingApproval(users).length,
            pendingLeaveOrg: metrics.pendingLeave,
            activePips: metrics.activePips,
            pendingDiscipline: metrics.pendingDiscipline,
            pendingLearningReviews: metrics.pendingLearningReviews,
          }
        : undefined,
    })
  }, [user, users, teams, departments, tasks, leaveRequests, checkIns, hr])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !context || busy) return
      setActionNote(null)
      setPendingAction(null)
      const userMsg: UiMessage = { id: uid(), role: 'user', content: trimmed }
      const nextHistory = [...messages, userMsg]
      setMessages(nextHistory)
      setInput('')
      setBusy(true)
      try {
        const apiMessages: AvaChatMessage[] = nextHistory
          .filter((m) => m.id !== 'welcome' || nextHistory.length === 2)
          .map((m) => ({ role: m.role, content: m.content }))
        const res = await askAva({ messages: apiMessages, context })
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: res.reply,
            citations: res.citations,
            links: res.links,
            suggestedActions: res.suggestedActions,
            source: res.source,
          },
        ])
        const actionable = res.suggestedActions?.find(
          (a) => a.type === 'draft_leave' || a.type === 'draft_checkin',
        )
        if (actionable) setPendingAction(actionable)
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content:
              'I could not complete that request right now. Please try again, or open Resources for the Portal User Guide.',
          },
        ])
      } finally {
        setBusy(false)
      }
    },
    [busy, context, messages],
  )

  const confirmPending = useCallback(() => {
    if (!user || !pendingAction) return
    if (pendingAction.type === 'draft_leave') {
      const p = pendingAction.payload
      submitLeave({
        userId: user.id,
        type: p.leaveType,
        startDate: p.startDate,
        endDate: p.endDate,
        reason: p.reason,
      })
      setActionNote('Leave request submitted to the Portal for review.')
      setPendingAction(null)
      return
    }
    if (pendingAction.type === 'draft_checkin') {
      const p = pendingAction.payload
      submitCheckIn({
        userId: user.id,
        weekStart: mondayIso(),
        completed: p.completed,
        nextWeek: p.nextWeek,
        blockers: p.blockers,
        hoursWorked: p.hoursWorked,
        visibility: 'department',
      })
      setActionNote(`Weekly update submitted for week of ${weekLabel(mondayIso())}.`)
      setPendingAction(null)
    }
  }, [pendingAction, submitCheckIn, submitLeave, user])

  if (!enabled || !user) return null

  return (
    <>
      <button
        type="button"
        aria-label="Open AVA"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg ring-focus',
          'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 lg:bottom-6 lg:right-6',
          open && 'pointer-events-none opacity-0',
        )}
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        AVA
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch"
          role="dialog"
          aria-modal="true"
          aria-label="AVA — AfriVate Virtual Assistant"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close AVA"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-[min(92vh,720px)] w-full flex-col border border-border bg-surface shadow-xl sm:m-4 sm:h-auto sm:max-h-[min(90vh,720px)] sm:w-[420px] sm:rounded-xl">
            <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Bot className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-fg">AVA</p>
                  <p className="text-xs text-muted">AfriVate Virtual Assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-muted hover:bg-surface-2 ring-focus"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                      m.role === 'user'
                        ? 'bg-accent text-white'
                        : 'bg-surface-2 text-fg border border-border',
                    )}
                  >
                    {m.content}
                    {m.links?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.links.map((l) => (
                          <Link
                            key={l.path + l.label}
                            to={l.path}
                            onClick={() => setOpen(false)}
                            className="rounded-md bg-surface px-2 py-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                    {m.citations?.length ? (
                      <p className="mt-2 text-[11px] text-muted">
                        Sources: {m.citations.join(' · ')}
                      </p>
                    ) : null}
                    {m.suggestedActions
                      ?.filter((a) => a.type === 'navigate')
                      .map((a) =>
                        a.type === 'navigate' ? (
                          <div key={a.path} className="mt-2">
                            <Link
                              to={a.path}
                              onClick={() => setOpen(false)}
                              className="text-xs font-medium text-accent underline"
                            >
                              {a.label}
                            </Link>
                          </div>
                        ) : null,
                      )}
                  </div>
                </div>
              ))}
              {busy ? (
                <p className="text-xs text-muted" role="status">
                  AVA is thinking…
                </p>
              ) : null}
            </div>

            {pendingAction &&
            (pendingAction.type === 'draft_leave' || pendingAction.type === 'draft_checkin') ? (
              <div className="border-t border-border bg-surface-2 px-4 py-3 text-sm">
                <p className="font-medium text-fg">{pendingAction.label}</p>
                {pendingAction.type === 'draft_leave' ? (
                  <p className="mt-1 text-xs text-muted">
                    {pendingAction.payload.leaveType} · {pendingAction.payload.startDate} →{' '}
                    {pendingAction.payload.endDate}
                    <br />
                    {pendingAction.payload.reason}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted whitespace-pre-wrap">
                    Completed: {pendingAction.payload.completed}
                    {'\n'}Next: {pendingAction.payload.nextWeek}
                    {'\n'}Hours: {pendingAction.payload.hoursWorked}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={confirmPending}>
                    Confirm &amp; submit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingAction(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}

            {actionNote ? (
              <p className="border-t border-border px-4 py-2 text-xs text-accent" role="status">
                {actionNote}
              </p>
            ) : null}

            <div className="border-t border-border px-3 py-2">
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {AVA_SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={busy}
                    onClick={() => void send(p)}
                    className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted hover:bg-surface-2"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void send(input)
                }}
              >
                <label className="sr-only" htmlFor="ava-input">
                  Message AVA
                </label>
                <textarea
                  id="ava-input"
                  rows={2}
                  value={input}
                  disabled={busy}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AVA…"
                  className="min-h-[44px] flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg ring-focus"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void send(input)
                    }
                  }}
                />
                <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="mt-2 text-[10px] text-muted">
                AVA guides you. The Portal remains the system of record.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
