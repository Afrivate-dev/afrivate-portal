import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search as SearchIcon,
  Users,
  Megaphone,
  ListChecks,
  FileText,
  BookOpen,
  CalendarDays,
  Heart,
  BarChart3,
  GraduationCap,
  TrendingUp,
  Briefcase,
  ShieldAlert,
  Award,
  MessageSquare,
  UserSearch,
  UserMinus,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useCollab } from '@/context/CollabContext'
import { useHr } from '@/context/HrContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { userSeesAnnouncement, userCanSeeTask, isHR, isLead } from '@/utils/helpers'
import { directReportIds } from '@/utils/hrMetrics'
import { leaveRequestsForManager } from '@/utils/leaveScope'
import { labelForConfigId } from '@/lib/portalConfig'
import { canUserViewNote } from '@/utils/noteModel'
import { pages } from '@/content/copy'

const S = pages.search

export function SearchPage() {
  const { user } = useAuth()
  const { users, teams, announcements, tasks, documents, events, leaveRequests, recognition, awardCategories, grievanceCategories, exitReasons } = useData()
  const { notes } = useCollab()
  const { pulseSurveys, okrs, learningAssignments, idps, jobRequisitions, grievances, quarterlyAwards, feedbackCycles, jobCandidates, exitInterviews } = useHr()
  const [params, setParams] = useSearchParams()
  const qRaw = params.get('q') ?? ''
  const setQ = (value: string) => {
    if (value) setParams({ q: value }, { replace: true })
    else setParams({}, { replace: true })
  }

  const q = qRaw.trim().toLowerCase()

  const personHits = useMemo(() => {
    if (!user || !q) return []
    return users.filter((u) => {
      if (!u.active) return false
      const hay = `${u.name} ${u.email} ${u.department} ${u.jobTitle}`.toLowerCase()
      return hay.includes(q)
    })
  }, [users, user, q])

  const announcementHits = useMemo(() => {
    if (!user || !q) return []
    return announcements.filter((a) => {
      if (!userSeesAnnouncement(user, a)) return false
      const hay = `${a.title} ${a.body}`.toLowerCase()
      return hay.includes(q)
    })
  }, [announcements, user, q])

  const taskHits = useMemo(() => {
    if (!user || !q) return []
    return tasks.filter((t) => {
      if (!userCanSeeTask(t, user.id)) return false
      const hay = `${t.title} ${t.description ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [tasks, user, q])

  const documentHits = useMemo(() => {
    if (!user || !q) return []
    return documents.filter((d) => {
      if (d.hrOnly && user.role !== 'hr' && user.role !== 'admin') return false
      if (d.managementOnly && user.role === 'staff') return false
      const hay = `${d.title} ${d.description ?? ''} ${d.fileName}`.toLowerCase()
      return hay.includes(q)
    })
  }, [documents, user, q])

  const noteHits = useMemo(() => {
    if (!user || !q) return []
    return notes
      .filter((n) => canUserViewNote(user, n, teams))
      .filter((n) => {
        const blockText = n.blocks.map((b) => b.text).join(' ')
        const hay = `${n.title} ${blockText}`.toLowerCase()
        return hay.includes(q)
      })
  }, [notes, user, teams, q])

  const eventHits = useMemo(() => {
    if (!user || !q) return []
    return events.filter((e) => {
      const hay = `${e.title} ${e.description ?? ''} ${e.location ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [events, user, q])

  const leaveHits = useMemo(() => {
    if (!user || !q) return []
    const managed = leaveRequestsForManager(leaveRequests, user, users)
    const own = leaveRequests.filter((l) => l.userId === user.id)
    const visible = new Map<string, typeof leaveRequests[0]>()
    for (const l of managed) visible.set(l.id, l)
    for (const l of own) visible.set(l.id, l)
    return [...visible.values()].filter((l) => {
      const requester = users.find((u) => u.id === l.userId)
      const hay = `${l.reason ?? ''} ${l.type} ${requester?.name ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [leaveRequests, users, user, q])

  const recognitionHits = useMemo(() => {
    if (!user || !q) return []
    return recognition.filter((r) => {
      const giver = users.find((u) => u.id === r.giverId)
      const receiver = users.find((u) => u.id === r.receiverId)
      const hay = `${r.message} ${giver?.name ?? ''} ${receiver?.name ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [recognition, users, user, q])

  const surveyHits = useMemo(() => {
    if (!user || !q) return []
    return pulseSurveys.filter((s) => {
      const hay = `${s.title} ${s.description ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [pulseSurveys, user, q])

  const okrHits = useMemo(() => {
    if (!user || !q) return []
    const reportIds = isLead(user) && !isHR(user) ? directReportIds(users, user.id) : null
    return okrs.filter((o) => {
      if (user.role === 'staff' && o.userId !== user.id) return false
      if (reportIds && o.userId !== user.id && !reportIds.has(o.userId)) return false
      const krs = o.keyResults.map((kr) => kr.text).join(' ')
      const hay = `${o.objective} ${krs}`.toLowerCase()
      return hay.includes(q)
    })
  }, [okrs, user, users, q])

  const learningHits = useMemo(() => {
    if (!user || !q) return []
    return learningAssignments.filter((a) => {
      const hay = `${a.title} ${a.description ?? ''} ${a.monthLabel ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [learningAssignments, user, q])

  const idpHits = useMemo(() => {
    if (!user || !q) return []
    const reportIds = isLead(user) && !isHR(user) ? directReportIds(users, user.id) : null
    return idps.filter((i) => {
      if (user.role === 'staff' && i.userId !== user.id) return false
      if (reportIds && i.userId !== user.id && !reportIds.has(i.userId)) return false
      return i.content.toLowerCase().includes(q)
    })
  }, [idps, user, users, q])

  const jobHits = useMemo(() => {
    if (!user || !q) return []
    if (user.role !== 'hr' && user.role !== 'admin') return []
    return jobRequisitions.filter((j) => {
      const hay = `${j.title} ${j.department} ${j.description ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [jobRequisitions, user, q])

  const grievanceHits = useMemo(() => {
    if (!user || !q) return []
    if (!isHR(user)) return []
    return grievances.filter((g) => {
      const submitter = users.find((u) => u.id === g.userId)
      const categoryLabel = labelForConfigId(g.category, grievanceCategories)
      const hay = `${categoryLabel} ${g.body} ${g.confidential ? '' : submitter?.name ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [grievances, users, user, q, grievanceCategories])

  const awardHits = useMemo(() => {
    if (!user || !q) return []
    return quarterlyAwards.filter((a) => {
      const winner = users.find((u) => u.id === a.winnerId)
      const categoryLabel = labelForConfigId(a.category, awardCategories)
      const hay = `${categoryLabel} ${a.quarter} ${a.year} ${winner?.name ?? ''} ${a.note ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [quarterlyAwards, users, user, q, awardCategories])

  const feedbackCycleHits = useMemo(() => {
    if (!user || !q) return []
    return feedbackCycles.filter((c) => {
      const hay = `${c.title} ${c.year} ${c.half} ${c.status}`.toLowerCase()
      return hay.includes(q)
    })
  }, [feedbackCycles, user, q])

  const candidateHits = useMemo(() => {
    if (!user || !q) return []
    if (!isHR(user)) return []
    return jobCandidates.filter((c) => {
      const role = jobRequisitions.find((j) => j.id === c.requisitionId)
      const hay = `${c.name} ${c.email ?? ''} ${c.stage} ${role?.title ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [jobCandidates, jobRequisitions, user, q])

  const exitInterviewHits = useMemo(() => {
    if (!user || !q) return []
    if (!isHR(user)) return []
    return exitInterviews.filter((ex) => {
      const reasonLabels = ex.reasons.map((r) => labelForConfigId(r, exitReasons)).join(' ')
      const hay = `${ex.departingName} ${ex.notes ?? ''} ${reasonLabels}`.toLowerCase()
      return hay.includes(q)
    })
  }, [exitInterviews, user, q, exitReasons])

  const totalHits =
    personHits.length +
    announcementHits.length +
    taskHits.length +
    documentHits.length +
    noteHits.length +
    eventHits.length +
    leaveHits.length +
    recognitionHits.length +
    surveyHits.length +
    okrHits.length +
    learningHits.length +
    idpHits.length +
    jobHits.length +
    grievanceHits.length +
    awardHits.length +
    feedbackCycleHits.length +
    candidateHits.length +
    exitInterviewHits.length

  if (!user) return null

  return (
    <div className="space-y-6">
      <PageHeader title={S.title} description={S.subtitle} />
      <Card padding="md">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={qRaw}
            onChange={(e) => setQ(e.target.value)}
            placeholder={S.placeholder}
            className="pl-9"
            aria-label={S.placeholder}
          />
        </div>
      </Card>

      {!q ? (
        <p className="text-center text-sm text-muted">{S.hint}</p>
      ) : totalHits === 0 ? (
        <EmptyState icon={SearchIcon} title={S.noResults} description={S.hint} />
      ) : (
        <div className="space-y-8">
          {personHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Users className="h-4 w-4 text-muted" /> {S.people}
                <Badge tone="muted">{personHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {personHits.map((p) => (
                  <li key={p.id}>
                    <Link to={`/people/directory?open=${p.id}`}>
                      <Card padding="md" className="flex items-center gap-3 transition-colors hover:border-accent/40">
                        <Avatar name={p.name} src={p.avatarUrl} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-fg">{p.name}</p>
                          <p className="truncate text-xs text-muted">
                            {p.jobTitle} · {p.department}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {announcementHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Megaphone className="h-4 w-4 text-muted" /> {S.updates}
                <Badge tone="muted">{announcementHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {announcementHits.map((a) => (
                  <li key={a.id}>
                    <Link to={`/announcements?open=${a.id}`}>
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{a.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {taskHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <ListChecks className="h-4 w-4 text-muted" /> {S.tasks}
                <Badge tone="muted">{taskHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {taskHits.map((t) => (
                  <li key={t.id}>
                    <Link to={`/tasks?open=${t.id}`}>
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{t.title}</p>
                        {t.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{t.description}</p>
                        ) : null}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {documentHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <FileText className="h-4 w-4 text-muted" /> Documents
                <Badge tone="muted">{documentHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {documentHits.map((d) => (
                  <li key={d.id}>
                    <Link to={`/documents?doc=${d.id}`}>
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{d.title}</p>
                        {d.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{d.description}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted">{d.fileName}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {eventHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <CalendarDays className="h-4 w-4 text-muted" /> Events
                <Badge tone="muted">{eventHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {eventHits.map((e) => (
                  <li key={e.id}>
                    <Link to="/events">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{e.title}</p>
                        {e.description ? <p className="mt-1 text-sm text-muted">{e.description}</p> : null}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {leaveHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <CalendarDays className="h-4 w-4 text-muted" /> Time off
                <Badge tone="muted">{leaveHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {leaveHits.map((l) => (
                  <li key={l.id}>
                    <Link to="/people/leave">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg capitalize">{l.type} leave</p>
                        <p className="mt-1 text-sm text-muted">{l.reason ?? 'No reason given'}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {recognitionHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Heart className="h-4 w-4 text-muted" /> Shout-outs
                <Badge tone="muted">{recognitionHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {recognitionHits.map((r) => (
                  <li key={r.id}>
                    <Link to={`/people/shout-outs?open=${r.id}`}>
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="line-clamp-2 text-sm text-fg">{r.message}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {surveyHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <BarChart3 className="h-4 w-4 text-muted" /> Surveys
                <Badge tone="muted">{surveyHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {surveyHits.map((s) => (
                  <li key={s.id}>
                    <Link to="/people/surveys">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{s.title}</p>
                        {s.description ? <p className="mt-1 text-sm text-muted">{s.description}</p> : null}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {learningHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <GraduationCap className="h-4 w-4 text-muted" /> Learning
                <Badge tone="muted">{learningHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {learningHits.map((a) => (
                  <li key={a.id}>
                    <Link to="/people/learning">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{a.title}</p>
                        {a.description ? <p className="mt-1 text-sm text-muted">{a.description}</p> : null}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {okrHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <TrendingUp className="h-4 w-4 text-muted" /> OKRs
                <Badge tone="muted">{okrHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {okrHits.map((o) => (
                  <li key={o.id}>
                    <Link to="/people/growth?tab=okrs">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{o.objective}</p>
                        <p className="mt-1 text-xs text-muted">{o.quarter} {o.year}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {idpHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <TrendingUp className="h-4 w-4 text-muted" /> Development plans
                <Badge tone="muted">{idpHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {idpHits.map((i) => (
                  <li key={i.id}>
                    <Link to="/people/growth?tab=idp">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="line-clamp-2 text-sm text-fg">{i.content}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {jobHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Briefcase className="h-4 w-4 text-muted" /> Open roles
                <Badge tone="muted">{jobHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {jobHits.map((j) => (
                  <li key={j.id}>
                    <Link to="/admin">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{j.title}</p>
                        <p className="mt-1 text-xs text-muted">{j.department}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {candidateHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <UserSearch className="h-4 w-4 text-muted" /> Candidates
                <Badge tone="muted">{candidateHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {candidateHits.map((c) => (
                  <li key={c.id}>
                    <Link to="/admin">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{c.name}</p>
                        <p className="mt-1 text-xs capitalize text-muted">{c.stage}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {feedbackCycleHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <MessageSquare className="h-4 w-4 text-muted" /> 360° cycles
                <Badge tone="muted">{feedbackCycleHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {feedbackCycleHits.map((c) => (
                  <li key={c.id}>
                    <Link to="/people/growth?tab=feedback">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{c.title}</p>
                        <p className="mt-1 text-xs text-muted">{c.half} {c.year} · {c.status}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {awardHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Award className="h-4 w-4 text-muted" /> Awards
                <Badge tone="muted">{awardHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {awardHits.map((a) => {
                  const winner = users.find((u) => u.id === a.winnerId)
                  return (
                    <li key={a.id}>
                      <Link to="/people/growth?tab=awards">
                        <Card padding="md" className="transition-colors hover:border-accent/40">
                          <p className="font-medium text-fg">{winner?.name ?? 'Team member'}</p>
                          <p className="mt-1 text-xs text-muted capitalize">{labelForConfigId(a.category, awardCategories)} · {a.quarter} {a.year}</p>
                        </Card>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {grievanceHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <ShieldAlert className="h-4 w-4 text-muted" /> Grievances
                <Badge tone="muted">{grievanceHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {grievanceHits.map((g) => (
                  <li key={g.id}>
                    <Link to="/admin">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium capitalize text-fg">{labelForConfigId(g.category, grievanceCategories)}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{g.body}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {exitInterviewHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <UserMinus className="h-4 w-4 text-muted" /> Exit interviews
                <Badge tone="muted">{exitInterviewHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {exitInterviewHits.map((ex) => (
                  <li key={ex.id}>
                    <Link to="/admin">
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{ex.departingName}</p>
                        {ex.reasons.length > 0 ? (
                          <p className="mt-1 text-xs text-muted">{ex.reasons.map((r) => labelForConfigId(r, exitReasons)).join(' · ')}</p>
                        ) : null}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {noteHits.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <BookOpen className="h-4 w-4 text-muted" /> Notes
                <Badge tone="muted">{noteHits.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {noteHits.map((n) => (
                  <li key={n.id}>
                    <Link to={`/notes?open=${n.id}`}>
                      <Card padding="md" className="transition-colors hover:border-accent/40">
                        <p className="font-medium text-fg">{n.title || 'Untitled'}</p>
                        {n.blocks[0]?.text ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{n.blocks[0].text}</p>
                        ) : null}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
