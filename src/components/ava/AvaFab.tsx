import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Send, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { askAva, isAvaEnabled } from '@/lib/ava/avaClient'
import { applyAvaSuggestedActions, getAvaPageDraft, isComposerSavedDraftKind } from '@/lib/ava/avaDrafts'
import { notifySuccess } from '@/lib/notify'
import { normalizeAvaDisplayText } from '@/lib/ava/parseResponse'
import { buildAvaUserContext } from '@/lib/ava/buildContext'
import { AVA_SUGGESTED_PROMPTS } from '@/lib/ava/knowledge'
import type { AvaChatMessage, AvaInsertDraftAction, AvaResponse, AvaSuggestedAction } from '@/lib/ava/types'
import { computeProfileCompleteness } from '@/lib/hrPeopleOps'
import { managedReportIds } from '@/utils/hrMetrics'
import { cn, isHR, isLead, uid } from '@/utils/helpers'
import { isSuspended } from '@/lib/dutyStatus'
import { Button } from '@/components/ui/Button'
import { usersAwaitingApproval } from '@/context/dataContextShared'
import { AvaAvatar, AvaTypingBubble } from '@/components/ava/AvaAvatar'
import { AvaMarkdown } from '@/components/ava/AvaMarkdown'

type UiMessage = AvaChatMessage & {
  id: string
  citations?: string[]
  links?: AvaResponse['links']
  suggestedActions?: AvaSuggestedAction[]
  source?: AvaResponse['source']
}

const CLOSE_MS = 260
const NUDGE_DWELL_MS = 90_000
const NUDGE_IDLE_MS = 35_000
const NUDGE_LONG_DWELL_MS = 150_000
const NUDGE_SNOOZE_MS = 30 * 60_000
const NUDGE_STORAGE_KEY = 'ava-nudge-snooze-until'

function nudgeSnoozed(): boolean {
  try {
    const until = Number(sessionStorage.getItem(NUDGE_STORAGE_KEY) || 0)
    return Number.isFinite(until) && until > Date.now()
  } catch {
    return false
  }
}

function snoozeNudge() {
  try {
    sessionStorage.setItem(NUDGE_STORAGE_KEY, String(Date.now() + NUDGE_SNOOZE_MS))
  } catch {
    /* ignore */
  }
}

function pageLabel(pathname: string): string {
  if (pathname.startsWith('/people/leave')) return 'Time Off'
  if (pathname.startsWith('/people/check-ins') || pathname.startsWith('/check-ins'))
    return 'Weekly Check-ins'
  if (pathname.startsWith('/checkin')) return 'Weekly update'
  if (pathname.startsWith('/tasks')) return 'Tasks'
  if (pathname.startsWith('/admin')) return 'Admin'
  if (pathname.startsWith('/people')) return 'People'
  if (pathname.startsWith('/learning')) return 'Learning'
  if (pathname.startsWith('/resources')) return 'Resources'
  return 'this page'
}

export function AvaFab() {
  const enabled = isAvaEnabled()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    users,
    teams,
    departments,
    tasks,
    leaveRequests,
    checkIns,
  } = useData()
  const hr = useHr()
  const [mounted, setMounted] = useState(false)
  const [panelIn, setPanelIn] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello — I am AVA, the AfriVate Virtual Assistant. I can explain Team Space, take you to the right page, and insert or refine drafts for you. I never submit or complete anything — you review and send it yourself. What do you need?',
    },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const routeEnteredAt = useRef(Date.now())
  const lastActivityAt = useRef(Date.now())
  const nudgeShownForRoute = useRef<string | null>(null)

  const openPanel = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setNudgeOpen(false)
    setMounted(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPanelIn(true))
    })
  }, [])

  const closePanel = useCallback(() => {
    setPanelIn(false)
    closeTimer.current = window.setTimeout(() => {
      setMounted(false)
      closeTimer.current = null
    }, CLOSE_MS)
  }, [])

  const dismissNudge = useCallback(() => {
    setNudgeOpen(false)
    snoozeNudge()
  }, [])

  const askFromNudge = useCallback(() => {
    const label = pageLabel(location.pathname)
    setNudgeOpen(false)
    snoozeNudge()
    openPanel()
    window.setTimeout(() => {
      setInput(`I'm a bit stuck on ${label}. Can you help me with what I should do next?`)
    }, 340)
  }, [location.pathname, openPanel])

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    routeEnteredAt.current = Date.now()
    lastActivityAt.current = Date.now()
    setNudgeOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!enabled || !user || mounted) return
    const mark = () => {
      lastActivityAt.current = Date.now()
    }
    const opts = { passive: true } as const
    window.addEventListener('pointerdown', mark, opts)
    window.addEventListener('keydown', mark, opts)
    window.addEventListener('scroll', mark, opts)
    window.addEventListener('mousemove', mark, opts)
    return () => {
      window.removeEventListener('pointerdown', mark)
      window.removeEventListener('keydown', mark)
      window.removeEventListener('scroll', mark)
      window.removeEventListener('mousemove', mark)
    }
  }, [enabled, user, mounted])

  useEffect(() => {
    if (!enabled || !user) return
    const tick = () => {
      if (mounted || nudgeSnoozed()) {
        setNudgeOpen(false)
        return
      }
      const path = location.pathname
      if (path.startsWith('/login') || path.startsWith('/auth') || path.startsWith('/invite')) {
        setNudgeOpen(false)
        return
      }
      const dwell = Date.now() - routeEnteredAt.current
      const idle = Date.now() - lastActivityAt.current
      const stuck =
        dwell >= NUDGE_LONG_DWELL_MS || (dwell >= NUDGE_DWELL_MS && idle >= NUDGE_IDLE_MS)
      if (stuck && nudgeShownForRoute.current !== path) {
        nudgeShownForRoute.current = path
        setNudgeOpen(true)
      }
    }
    const id = window.setInterval(tick, 4000)
    return () => window.clearInterval(id)
  }, [enabled, user, mounted, location.pathname])

  useEffect(() => {
    if (!panelIn) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 320)
    return () => window.clearTimeout(t)
  }, [panelIn])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, closePanel])

  useEffect(() => {
    if (!mounted) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, mounted, busy])

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
      currentPath: location.pathname,
      pageDraft: getAvaPageDraft() ?? undefined,
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
  }, [user, users, teams, departments, tasks, leaveRequests, checkIns, hr, location.pathname])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !context || busy) return
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
        const suggestedActions = applyAvaSuggestedActions(res.suggestedActions)
        const draftActions = (suggestedActions ?? []).filter(
          (a): a is AvaInsertDraftAction => a.type === 'insert_draft',
        )
        if (draftActions.length) {
          const saved = draftActions.filter(
            (a) => a.mode !== 'refine' && isComposerSavedDraftKind(a.kind),
          )
          const n = saved.length || draftActions.length
          notifySuccess(
            n === 1
              ? saved.length
                ? 'AVA saved a draft. Open it from Drafts when you are ready, then submit it yourself.'
                : 'AVA filled a draft for you. Review it, then submit it yourself.'
              : `AVA saved ${n} drafts. Review them, then submit them yourself.`,
          )
          closePanel()
          const dest = (saved[0] ?? draftActions[0]).path.split('?')[0]
          if (location.pathname !== dest) {
            navigate(dest)
          }
        }
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: res.reply,
            citations: res.citations,
            links: res.links,
            suggestedActions,
            source: res.source,
          },
        ])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content:
              'I could not answer that right now. Please try again, or open Resources for the Portal User Guide.',
          },
        ])
      } finally {
        setBusy(false)
      }
    },
    [busy, context, messages, closePanel, location.pathname, navigate],
  )

  if (!enabled || !user || isSuspended(user)) return null

  const showFab = !mounted
  const nudgeLabel = pageLabel(location.pathname)

  return (
    <>
      {showFab && nudgeOpen ? (
        <div
          className={cn(
            'fixed z-40 w-[min(calc(100vw-2rem),300px)]',
            'bottom-[calc(8.25rem+env(safe-area-inset-bottom))] right-4 lg:bottom-[5.5rem] lg:right-6',
            'animate-ava-msg-in motion-reduce:animate-none',
          )}
          role="status"
          aria-live="polite"
        >
          <div className="relative rounded-2xl border border-brand/25 bg-surface p-3.5 shadow-elevated">
            <div className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 border-b border-r border-brand/25 bg-surface" />
            <div className="flex items-start gap-2.5">
              <AvaAvatar size="sm" thinking />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-xs font-semibold text-fg">Need a hand?</p>
                <p className="mt-1 text-[12px] leading-snug text-muted">
                  Still on {nudgeLabel}? Ask AVA if you are unsure or stuck on something.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button size="sm" onClick={askFromNudge}>
                    Ask AVA
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissNudge}>
                    Not now
                  </Button>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissNudge}
                className="rounded-full p-1 text-muted hover:bg-surface-2 hover:text-fg ring-focus"
                aria-label="Dismiss AVA tip"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Open AVA"
        onClick={openPanel}
        className={cn(
          'group fixed z-40 flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2',
          'bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white',
          'shadow-elevated animate-ava-fab-pulse ring-focus',
          'transition-all duration-300 ease-spring hover:scale-[1.03] active:scale-[0.98]',
          'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 lg:bottom-6 lg:right-6',
          'motion-reduce:animate-none motion-reduce:transition-none',
          !showFab && 'pointer-events-none translate-y-3 scale-90 opacity-0',
        )}
      >
        <AvaAvatar size="sm" className="shadow-none ring-0" thinking={nudgeOpen} />
        <span className="font-heading text-sm font-semibold tracking-wide">AVA</span>
      </button>

      {mounted ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end sm:items-end sm:justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="AVA — AfriVate Virtual Assistant"
        >
          <button
            type="button"
            className={cn(
              'absolute inset-0 bg-ink-950/45 backdrop-blur-[2px] motion-reduce:backdrop-blur-none',
              panelIn ? 'animate-ava-backdrop-in' : 'animate-ava-backdrop-out',
              'motion-reduce:animate-none',
            )}
            aria-label="Close AVA"
            onClick={closePanel}
          />

          <div
            className={cn(
              'relative flex h-[min(92vh,740px)] w-full flex-col overflow-hidden',
              'border border-brand/20 bg-surface shadow-elevated',
              'sm:m-5 sm:h-auto sm:max-h-[min(88vh,740px)] sm:w-[420px] sm:rounded-2xl',
              panelIn ? 'animate-ava-panel-in' : 'animate-ava-panel-out',
              'motion-reduce:animate-none',
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand/15 via-brand/5 to-transparent" />

            <header className="relative z-[1] flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <AvaAvatar size="md" thinking={busy} />
                <div>
                  <p className="font-heading text-sm font-semibold tracking-wide text-fg">AVA</p>
                  <p className="text-[11px] text-muted">
                    {busy ? (
                      <span className="inline-flex items-center gap-1.5 text-brand">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/60 motion-reduce:animate-none" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
                        </span>
                        Thinking…
                      </span>
                    ) : (
                      'AfriVate Virtual Assistant'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-full p-2 text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-fg ring-focus"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div
              ref={listRef}
              className="relative z-[1] min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4"
            >
              {messages.map((m, i) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex gap-2 animate-ava-msg-in motion-reduce:animate-none',
                    m.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                  style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                >
                  {m.role === 'assistant' ? <AvaAvatar size="sm" /> : null}
                  <div
                    className={cn(
                      'max-w-[82%] px-3.5 py-2.5 shadow-sm',
                      m.role === 'user'
                        ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-brand-500 to-brand-700 text-white'
                        : 'rounded-2xl rounded-bl-md border border-brand/10 bg-surface-2 text-fg',
                    )}
                  >
                    <AvaMarkdown
                      text={
                        m.role === 'assistant' ? normalizeAvaDisplayText(m.content) : m.content
                      }
                      tone={m.role === 'user' ? 'user' : 'assistant'}
                    />
                    {m.links?.length ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.links.map((l) => (
                          <Link
                            key={l.path + l.label}
                            to={l.path}
                            onClick={closePanel}
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-medium transition-transform duration-200 hover:scale-[1.03]',
                              m.role === 'user'
                                ? 'bg-white/15 text-white'
                                : 'bg-brand/10 text-brand hover:bg-brand/15',
                            )}
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                    {m.citations?.length ? (
                      <p
                        className={cn(
                          'mt-2 text-[10px]',
                          m.role === 'user' ? 'text-white/70' : 'text-muted',
                        )}
                      >
                        Sources: {m.citations.join(' · ')}
                      </p>
                    ) : null}
                    {m.role === 'assistant' && m.suggestedActions?.length ? (
                      <div className="mt-2.5 flex flex-col gap-1.5">
                        {m.suggestedActions.map((a, i) => (
                          <Link
                            key={`${a.type}-${a.path}-${a.label}-${i}`}
                            to={a.path}
                            onClick={closePanel}
                            className={cn(
                              'inline-flex items-center justify-center rounded-xl px-3 py-2',
                              'bg-brand text-white text-xs font-semibold shadow-sm',
                              'transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]',
                            )}
                          >
                            {a.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {busy ? <AvaTypingBubble /> : null}
            </div>

            <div className="relative z-[1] border-t border-border/80 bg-surface/95 px-3 py-3 backdrop-blur-sm">
              <div className="mb-2.5 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {AVA_SUGGESTED_PROMPTS.map((p, idx) => (
                  <button
                    key={p}
                    type="button"
                    disabled={busy}
                    onClick={() => void send(p)}
                    style={{ animationDelay: `${120 + idx * 50}ms` }}
                    className={cn(
                      'shrink-0 rounded-full border border-brand/20 bg-brand/[0.06] px-3 py-1.5',
                      'text-[11px] font-medium text-fg/80',
                      'transition-all duration-200 hover:border-brand/40 hover:bg-brand/10 hover:text-fg',
                      'disabled:opacity-50 animate-ava-chip-in motion-reduce:animate-none',
                    )}
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
                  ref={inputRef}
                  id="ava-input"
                  rows={2}
                  value={input}
                  disabled={busy}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AVA…"
                  className={cn(
                    'min-h-[48px] flex-1 resize-none rounded-xl border border-border bg-surface-2/80',
                    'px-3.5 py-2.5 text-sm text-fg shadow-inner ring-focus',
                    'transition-colors duration-200 focus:border-brand/40 focus:bg-surface',
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void send(input)
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={busy || !input.trim()}
                  aria-label="Send"
                  className="rounded-xl transition-transform duration-200 hover:scale-105 active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="mt-2 text-center text-[10px] text-muted">
                AVA guides you to the right page. You complete every action in the Portal.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
