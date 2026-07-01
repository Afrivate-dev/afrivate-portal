import { useMemo, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, FileText, MessageSquare, Flag, Award, ShieldAlert, Plus, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useHr } from '@/context/HrContext'
import { IdpReviewPanel } from '@/components/admin/IdpReviewPanel'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { TabBar } from '@/components/ui/TabBar'
import { Badge } from '@/components/ui/Badge'
import { notifySuccess } from '@/lib/notify'
import { isHR, isLead, uid } from '@/utils/helpers'
import {
  AWARD_CATEGORY_LABELS,
  GRIEVANCE_CATEGORIES,
  GRIEVANCE_CATEGORY_LABELS,
  type AwardCategory,
  type FeedbackRelationship,
  type GrievanceCategory,
  type Okr,
  type OkrKeyResult,
} from '@/types/hr'

type GrowthTab = 'okrs' | 'one_on_one' | 'idp' | 'feedback' | 'milestones' | 'awards' | 'grievance'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const
const GROWTH_TABS: GrowthTab[] = ['okrs', 'one_on_one', 'idp', 'feedback', 'milestones', 'awards', 'grievance']

const RELATIONSHIP_LABELS: Record<FeedbackRelationship, string> = {
  self: 'Self-assessment',
  manager: 'Manager review',
  peer: 'Peer feedback',
  report: 'Upward feedback',
}

function tabFromParams(params: URLSearchParams): GrowthTab {
  const t = params.get('tab')
  return t && GROWTH_TABS.includes(t as GrowthTab) ? (t as GrowthTab) : 'okrs'
}

export function PeopleGrowthPage() {
  const { user } = useAuth()
  const { users } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabFromParams(searchParams)
  const setTab = (next: GrowthTab) => setSearchParams({ tab: next }, { replace: true })

  const {
    okrs,
    saveOkr,
    deleteOkr,
    oneOnOneLogs,
    setOneOnOneCompleted,
    idps,
    saveIdp,
    feedbackCycles,
    feedbackEntries,
    submitFeedback,
    onboardingMilestones,
    setMilestoneCompleted,
    seedOnboardingMilestones,
    quarterlyAwards,
    submitGrievance,
    grievances,
    createFeedbackCycle,
    updateFeedbackCycle,
  } = useHr()

  const [objective, setObjective] = useState('')
  const [krDrafts, setKrDrafts] = useState<string[]>([''])
  const [idpContent, setIdpContent] = useState('')
  const [grievanceBody, setGrievanceBody] = useState('')
  const [grievanceCategory, setGrievanceCategory] = useState<GrievanceCategory>('workplace')
  const [activeFeedbackKey, setActiveFeedbackKey] = useState<string | null>(null)
  const [feedbackAnswers, setFeedbackAnswers] = useState<Record<string, number>>({})
  const [peerSubjectId, setPeerSubjectId] = useState('')
  const seededRef = useRef(false)

  useEffect(() => {
    if (!user || seededRef.current) return
    seededRef.current = true
    seedOnboardingMilestones(user.id)
  }, [user, seedOnboardingMilestones])

  const year = new Date().getFullYear()
  const quarter = QUARTERS[Math.floor(new Date().getMonth() / 3)]
  const month = new Date().toISOString().slice(0, 7)

  const myOkrs = useMemo(() => (user ? okrs.filter((o) => o.userId === user.id && o.year === year) : []), [okrs, user, year])
  const myIdp = useMemo(() => (user ? idps.find((i) => i.userId === user.id) : undefined), [idps, user])
  const myMilestones = useMemo(
    () => (user ? onboardingMilestones.filter((m) => m.userId === user.id) : []),
    [onboardingMilestones, user],
  )
  const myGrievances = useMemo(
    () => (user ? grievances.filter((g) => g.userId === user.id) : []),
    [grievances, user],
  )
  const openCycle = feedbackCycles.find((c) => c.status === 'open')
  const reports = useMemo(() => users.filter((u) => u.active && u.reportsToId === user?.id), [users, user])
  const manager = useMemo(() => users.find((u) => u.id === user?.reportsToId), [users, user?.reportsToId])

  const feedbackTasks = useMemo(() => {
    if (!user || !openCycle) return []
    const hasEntry = (subjectUserId: string, relationship: FeedbackRelationship) =>
      feedbackEntries.some(
        (e) =>
          e.cycleId === openCycle.id &&
          e.reviewerId === user.id &&
          e.subjectUserId === subjectUserId &&
          e.relationship === relationship,
      )
    const tasks: Array<{
      key: string
      subjectUserId: string
      subjectName: string
      relationship: FeedbackRelationship
    }> = []
    if (!hasEntry(user.id, 'self')) {
      tasks.push({ key: 'self', subjectUserId: user.id, subjectName: user.name, relationship: 'self' })
    }
    reports.forEach((r) => {
      if (!hasEntry(r.id, 'manager')) {
        tasks.push({ key: `mgr-${r.id}`, subjectUserId: r.id, subjectName: r.name, relationship: 'manager' })
      }
    })
    if (manager && !hasEntry(manager.id, 'report')) {
      tasks.push({
        key: `rep-${manager.id}`,
        subjectUserId: manager.id,
        subjectName: manager.name,
        relationship: 'report',
      })
    }
    return tasks
  }, [user, openCycle, reports, manager, feedbackEntries])

  const peerCandidates = useMemo(() => {
    if (!user) return []
    return users.filter((u) => u.active && u.id !== user.id)
  }, [users, user])

  const completedPeerSubjectIds = useMemo(() => {
    if (!user || !openCycle) return new Set<string>()
    return new Set(
      feedbackEntries
        .filter(
          (e) =>
            e.cycleId === openCycle.id &&
            e.reviewerId === user.id &&
            e.relationship === 'peer',
        )
        .map((e) => e.subjectUserId),
    )
  }, [user, openCycle, feedbackEntries])

  if (!user) return null

  const addOkr = () => {
    if (!objective.trim()) return
    const krs: OkrKeyResult[] = krDrafts
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ id: 'kr_' + uid(), text, progress: 0 }))
    saveOkr({ userId: user.id, year, quarter, objective: objective.trim(), keyResults: krs })
    setObjective('')
    setKrDrafts([''])
    notifySuccess('OKR saved.')
  }

  const updateKrProgress = (okr: Okr, krId: string, progress: number) => {
    saveOkr({
      id: okr.id,
      userId: okr.userId,
      year: okr.year,
      quarter: okr.quarter,
      objective: okr.objective,
      keyResults: okr.keyResults.map((kr) => (kr.id === krId ? { ...kr, progress } : kr)),
    })
  }

  const saveMyIdp = () => {
    saveIdp({ userId: user.id, content: idpContent || myIdp?.content || '', status: 'submitted' })
    notifySuccess('Development plan submitted.')
  }

  const submitGrievanceForm = () => {
    if (!grievanceBody.trim()) return
    submitGrievance({ userId: user.id, category: grievanceCategory, body: grievanceBody.trim(), confidential: true })
    setGrievanceBody('')
    notifySuccess('Your message was sent to HR confidentially.')
  }

  const activeTask =
    activeFeedbackKey === 'peer'
      ? peerSubjectId
        ? {
            key: `peer-${peerSubjectId}`,
            subjectUserId: peerSubjectId,
            subjectName: users.find((u) => u.id === peerSubjectId)?.name ?? 'Colleague',
            relationship: 'peer' as FeedbackRelationship,
          }
        : null
      : feedbackTasks.find((t) => t.key === activeFeedbackKey) ?? null

  const submitActiveFeedback = () => {
    if (!openCycle || !activeTask) return
    submitFeedback({
      cycleId: openCycle.id,
      subjectUserId: activeTask.subjectUserId,
      reviewerId: user.id,
      relationship: activeTask.relationship,
      answers: feedbackAnswers,
    })
    setFeedbackAnswers({})
    setActiveFeedbackKey(null)
    setPeerSubjectId('')
    notifySuccess(`${RELATIONSHIP_LABELS[activeTask.relationship]} submitted.`)
  }

  const myOneOnOneDone = manager
    ? oneOnOneLogs.some(
        (l) => l.employeeId === user.id && l.managerId === manager.id && l.month === month && l.completed,
      )
    : false

  const idpFieldKey = `${myIdp?.id ?? 'new'}-${myIdp?.updatedAt ?? ''}`

  return (
    <div className="space-y-6">
      <PageHeader title="Growth" description="OKRs, 1:1s, development plans, feedback, and milestones." />

      <TabBar
        variant="chip"
        scrollable
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'okrs', label: 'OKRs' },
          { id: 'one_on_one', label: '1:1s' },
          { id: 'idp', label: 'IDP' },
          { id: 'feedback', label: '360°' },
          { id: 'milestones', label: '30-60-90' },
          { id: 'awards', label: 'Awards' },
          { id: 'grievance', label: 'Speak up' },
        ]}
      />

      {tab === 'okrs' ? (
        <div className="space-y-4">
          <Card padding="md">
            <h3 className="text-sm font-semibold text-fg">{quarter} {year} objective</h3>
            <div className="mt-3 space-y-3">
              <Input label="Objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What will you achieve this quarter?" />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted">Key results</p>
                {krDrafts.map((kr, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={kr}
                      onChange={(e) => setKrDrafts((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                      placeholder={`Key result ${i + 1}`}
                    />
                    {krDrafts.length > 1 ? (
                      <Button type="button" size="sm" variant="ghost" aria-label="Remove key result" onClick={() => setKrDrafts((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                <Button type="button" size="sm" variant="secondary" onClick={() => setKrDrafts((prev) => [...prev, ''])}>
                  <Plus className="h-3.5 w-3.5" /> Add key result
                </Button>
              </div>
              <Button onClick={addOkr}>Save OKR</Button>
            </div>
          </Card>
          {myOkrs.map((o) => (
            <Card key={o.id} padding="md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Badge tone="info">{o.quarter}</Badge>
                  <p className="mt-2 font-medium text-fg">{o.objective}</p>
                  <ul className="mt-3 space-y-3 text-sm">
                    {o.keyResults.map((kr) => (
                      <li key={kr.id}>
                        <p className="text-fg">{kr.text}</p>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={kr.progress}
                          onChange={(e) => updateKrProgress(o, kr.id, Number(e.target.value))}
                          className="mt-1 w-full"
                        />
                        <p className="text-xs text-muted">{kr.progress}% complete</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteOkr(o.id)}>Remove</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'one_on_one' ? (
        <div className="space-y-4">
          {manager ? (
            <Card padding="md">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-fg">Your 1:1 with {manager.name}</h3>
              </div>
              <p className="text-sm text-muted">
                {myOneOnOneDone
                  ? `Your manager marked the ${month} 1:1 complete.`
                  : `Your ${month} 1:1 is pending — schedule in Google Meet and ask your manager to mark it done.`}
              </p>
              <Badge tone={myOneOnOneDone ? 'success' : 'warning'} className="mt-3">
                {myOneOnOneDone ? 'Completed' : 'Pending'}
              </Badge>
            </Card>
          ) : null}
          <Card padding="md">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-fg">Team 1:1 tracker</h3>
            </div>
            <p className="text-sm text-muted">Hold your 1:1 in Google Meet with a shared Doc — then mark complete here.</p>
            {isLead(user) && reports.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {reports.map((r) => {
                  const done = oneOnOneLogs.some(
                    (l) => l.employeeId === r.id && l.managerId === user.id && l.month === month && l.completed,
                  )
                  return (
                    <li key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span>{r.name}</span>
                      <Button size="sm" variant={done ? 'secondary' : 'primary'} onClick={() => setOneOnOneCompleted(r.id, user.id, month, !done)}>
                        {done ? 'Completed ✓' : 'Mark done'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">
                {isLead(user) ? 'No direct reports assigned yet.' : 'Your manager will mark 1:1s for their team.'}
              </p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'idp' ? (
        <div className="space-y-4">
          <Card padding="md">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-fg">Individual development plan</h3>
            </div>
            <Textarea
              key={idpFieldKey}
              label="Your growth goals"
              rows={6}
              value={idpContent || myIdp?.content || ''}
              onChange={(e) => setIdpContent(e.target.value)}
              placeholder="Skills to build, courses to take, experiences to seek…"
            />
            <Button className="mt-3" onClick={saveMyIdp}>Save & submit</Button>
            {myIdp ? (
              <div className="mt-2 space-y-1 text-xs text-muted">
                <p>Status: {myIdp.status}</p>
                {myIdp.managerNote ? <p className="text-fg">Manager note: {myIdp.managerNote}</p> : null}
              </div>
            ) : null}
          </Card>
          <IdpReviewPanel />
        </div>
      ) : null}

      {tab === 'feedback' ? (
        <div className="space-y-4">
          {openCycle ? (
            <>
              <Card padding="md">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-fg">{openCycle.title}</h3>
                  </div>
                  {isHR(user) ? (
                    <Button size="sm" variant="secondary" onClick={() => updateFeedbackCycle(openCycle.id, { status: 'closed' })}>
                      Close cycle
                    </Button>
                  ) : null}
                </div>
                {feedbackTasks.length === 0 && !peerSubjectId ? (
                  <p className="text-sm text-success">You’ve completed all assigned feedback for this cycle.</p>
                ) : (
                  <ul className="space-y-2">
                    {feedbackTasks.map((task) => (
                      <li key={task.key}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFeedbackKey(task.key)
                            setFeedbackAnswers({})
                          }}
                          className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-surface-2 ring-focus"
                        >
                          <span className="font-medium text-fg">{task.subjectName}</span>
                          <Badge tone="info">{RELATIONSHIP_LABELS[task.relationship]}</Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted">Optional peer feedback</p>
                  <Select
                    value={peerSubjectId}
                    onChange={(e) => {
                      setPeerSubjectId(e.target.value)
                      setActiveFeedbackKey(e.target.value ? 'peer' : null)
                      setFeedbackAnswers({})
                    }}
                    options={[
                      { value: '', label: 'Select a colleague…' },
                      ...peerCandidates
                        .filter((u) => !completedPeerSubjectIds.has(u.id))
                        .map((u) => ({ value: u.id, label: u.name })),
                    ]}
                  />
                </div>
              </Card>
              {activeTask && openCycle ? (
                <Card padding="md">
                  <h4 className="text-sm font-semibold text-fg">
                    {RELATIONSHIP_LABELS[activeTask.relationship]} — {activeTask.subjectName}
                  </h4>
                  <div className="mt-4 space-y-4">
                    {openCycle.questions.map((q) => (
                      <div key={q.id}>
                        <p className="text-sm font-medium text-fg">{q.text}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setFeedbackAnswers((prev) => ({ ...prev, [q.id]: n }))}
                              className={`h-9 w-9 rounded text-xs font-semibold ${feedbackAnswers[q.id] === n ? 'bg-accent text-white' : 'border border-border'}`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button
                        onClick={submitActiveFeedback}
                        disabled={openCycle.questions.some((q) => q.type === 'scale' && feedbackAnswers[q.id] == null)}
                      >
                        Submit
                      </Button>
                      <Button variant="ghost" onClick={() => { setActiveFeedbackKey(null); setFeedbackAnswers({}) }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}
            </>
          ) : (
            <Card padding="md">
              <p className="text-sm text-muted">No 360° cycle is open. HR runs these bi-annually.</p>
              {isHR(user) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() =>
                    createFeedbackCycle({
                      title: `${year} H${new Date().getMonth() < 6 ? 1 : 2} — 360° feedback`,
                      year,
                      half: new Date().getMonth() < 6 ? 'H1' : 'H2',
                      status: 'open',
                      questions: [
                        { id: 'values', text: 'Embodies the Afrivate Way', type: 'scale', min: 1, max: 10 },
                        { id: 'collab', text: 'Collaborates effectively', type: 'scale', min: 1, max: 10 },
                      ],
                    })
                  }
                >
                  Open cycle (HR)
                </Button>
              ) : null}
            </Card>
          )}
        </div>
      ) : null}

      {tab === 'milestones' ? (
        <Card padding="md">
          <div className="mb-3 flex items-center gap-2">
            <Flag className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">Onboarding 30 · 60 · 90</h3>
          </div>
          <ul className="space-y-2">
            {myMilestones.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={m.completed}
                  onChange={(e) => setMilestoneCompleted(m.id, e.target.checked)}
                  className="h-4 w-4"
                />
                <span className={m.completed ? 'text-muted line-through' : 'text-fg'}>{m.label}</span>
                <Badge tone="default">{m.phase.replace('_', ' ')}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {tab === 'awards' ? (
        <Card padding="md">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">Afrivate Awards</h3>
          </div>
          {quarterlyAwards.length === 0 ? (
            <p className="text-sm text-muted">Quarterly winners appear here after HR announces awards.</p>
          ) : (
            <ul className="space-y-2">
              {quarterlyAwards.map((a) => {
                const winner = users.find((u) => u.id === a.winnerId)
                return (
                  <li key={a.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <Badge tone="brand">{AWARD_CATEGORY_LABELS[a.category as AwardCategory] ?? a.category}</Badge>
                    <span className="ml-2 font-medium text-fg">{winner?.name ?? 'Team member'}</span>
                    <span className="text-muted"> · {a.quarter} {a.year}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === 'grievance' ? (
        <div className="space-y-4">
          <Card padding="md">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-fg">Speak up safely</h3>
            </div>
            <p className="text-sm text-muted">Raise a concern confidentially. Only HR can view full details.</p>
            <div className="mt-4 space-y-3">
              <Select
                label="Category"
                value={grievanceCategory}
                onChange={(e) => setGrievanceCategory(e.target.value as GrievanceCategory)}
                options={GRIEVANCE_CATEGORIES.map((c) => ({
                  value: c,
                  label: GRIEVANCE_CATEGORY_LABELS[c],
                }))}
              />
              <Textarea label="Describe your concern" rows={4} value={grievanceBody} onChange={(e) => setGrievanceBody(e.target.value)} />
              <Button onClick={submitGrievanceForm}>Submit to HR</Button>
            </div>
          </Card>
          {myGrievances.length > 0 ? (
            <Card padding="md">
              <h3 className="text-sm font-semibold text-fg">Your submissions</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {myGrievances.map((g) => (
                  <li key={g.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="muted">{GRIEVANCE_CATEGORY_LABELS[g.category as GrievanceCategory] ?? g.category}</Badge>
                      <Badge tone={g.status === 'resolved' ? 'success' : g.status === 'reviewing' ? 'info' : 'warning'}>
                        {g.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-muted line-clamp-2">{g.body}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
