import { Link } from 'react-router-dom'
import {
  BarChart3,
  GraduationCap,
  Briefcase,
  UserMinus,
  ShieldAlert,
  Award,
  ArrowRight,
} from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useHr, type HrMetrics } from '@/context/HrContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatCard } from '@/components/shared/StatCard'
import { LearningReviewPanel } from '@/components/admin/LearningReviewPanel'
import { PulseSurveyResultsPanel } from '@/components/admin/PulseSurveyResultsPanel'
import { FeedbackCycleSummaryPanel } from '@/components/admin/FeedbackCycleSummaryPanel'
import { IdpReviewPanel } from '@/components/admin/IdpReviewPanel'
import { Badge } from '@/components/ui/Badge'
import { useState } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { AWARD_CATEGORY_LABELS, EXIT_REASON_OPTIONS, type AwardCategory, type CandidateStage, type ExitReason, type QuarterlyAward } from '@/types/hr'

export function HrDashboardSection({ metrics }: { metrics: HrMetrics }) {
  const { users, departments } = useData()
  const {
    addLearningAssignment,
    updateLearningAssignment,
    learningAssignments,
    createPulseSurvey,
    updatePulseSurvey,
    pulseSurveys,
    jobRequisitions,
    jobCandidates,
    addJobRequisition,
    updateJobRequisition,
    addJobCandidate,
    updateJobCandidate,
    exitInterviews,
    addExitInterview,
    grievances,
    updateGrievance,
    quarterlyAwards,
    addQuarterlyAward,
  } = useHr()
  const [courseTitle, setCourseTitle] = useState('')
  const [alisonUrl, setAlisonUrl] = useState('https://alison.com/course/')
  const [awardWinner, setAwardWinner] = useState('')
  const [awardCategory, setAwardCategory] = useState<AwardCategory>('team_spirit')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDept, setJobDept] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [exitName, setExitName] = useState('')
  const [exitNotes, setExitNotes] = useState('')
  const [exitReasons, setExitReasons] = useState<ExitReason[]>([])
  const [exitLastDay, setExitLastDay] = useState('')
  const [grievanceNotes, setGrievanceNotes] = useState<Record<string, string>>({})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">HR dashboard</h2>
        <p className="text-sm text-muted">People metrics and quick actions — aligned to your HR Base of Operations plan.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Headcount" value={String(metrics.headcount)} />
        <StatCard label="Engagement" value={metrics.engagementScore?.toFixed(1) ?? '—'} />
        <StatCard label="eNPS" value={metrics.enpsScore != null ? String(metrics.enpsScore) : '—'} />
        <StatCard label="L&D completion" value={metrics.ldCompletionRate != null ? `${metrics.ldCompletionRate}%` : '—'} />
        <StatCard label="1:1 rate" value={metrics.oneOnOneRate != null ? `${metrics.oneOnOneRate}%` : '—'} />
        <StatCard label="Pending leave" value={String(metrics.pendingLeave)} />
        <StatCard label="Open grievances" value={String(metrics.openGrievances)} />
        <StatCard label="Learning reviews" value={String(metrics.pendingLearningReviews)} />
        <StatCard label="Active surveys" value={String(metrics.activeSurveys)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">Assign Alison course</h3>
          </div>
          <div className="space-y-3">
            <Input label="Course title" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} />
            <Input label="Alison URL" value={alisonUrl} onChange={(e) => setAlisonUrl(e.target.value)} />
            <Button
              size="sm"
              disabled={!courseTitle.trim()}
              onClick={() => {
                addLearningAssignment({
                  title: courseTitle.trim(),
                  alisonUrl: alisonUrl.trim(),
                  active: true,
                  monthLabel: new Date().toLocaleString('en', { month: 'long', year: 'numeric' }),
                  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                })
                setCourseTitle('')
              }}
            >
              Publish assignment
            </Button>
            {learningAssignments.filter((a) => a.active).map((a) => (
              <Button
                key={a.id}
                size="sm"
                variant="ghost"
                onClick={() => updateLearningAssignment(a.id, { active: false })}
              >
                Archive “{a.title.slice(0, 24)}{a.title.length > 24 ? '…' : ''}”
              </Button>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">Pulse survey</h3>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              createPulseSurvey({
                title: 'Monthly pulse check',
                surveyType: 'pulse',
                active: true,
                questions: [
                  { id: 'eng', text: 'Engagement this month (1–10)', type: 'scale', min: 1, max: 10 },
                  { id: 'need', text: 'Do you have what you need? (1–10)', type: 'scale', min: 1, max: 10 },
                  { id: 'note', text: 'Optional comment', type: 'text' },
                ],
              })
            }
          >
            Launch pulse survey
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="ml-2"
            onClick={() =>
              createPulseSurvey({
                title: 'Quarterly eNPS',
                surveyType: 'enps',
                active: true,
                description: 'How likely are you to recommend AfriVate as a place to work?',
                questions: [
                  { id: 'nps', text: 'Recommendation score (0–10)', type: 'scale', min: 0, max: 10 },
                  { id: 'why', text: 'What is the main reason for your score? (optional)', type: 'text' },
                ],
              })
            }
          >
            Launch eNPS survey
          </Button>
          {pulseSurveys.filter((s) => s.active).map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant="ghost"
              className="ml-2"
              onClick={() => updatePulseSurvey(s.id, { active: false })}
            >
              Archive {s.title.slice(0, 20)}…
            </Button>
          ))}
          <Link to="/people/surveys" className="ml-3 text-xs font-medium text-accent hover:underline">
            Open surveys →
          </Link>
          <p className="mt-2 text-xs text-muted">
            Pulse and eNPS can run at the same time — each launch replaces the previous survey of the same type only.
          </p>
        </Card>

        <Card padding="md">
          <div className="mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Recruitment ({jobRequisitions.filter((j) => j.status === 'open').length} open)
            </h3>
          </div>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label="Role title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              <Input
                label="Department"
                value={jobDept}
                onChange={(e) => setJobDept(e.target.value)}
                placeholder={departments[0]?.name ?? 'Engineering'}
              />
            </div>
            <Button
              size="sm"
              disabled={!jobTitle.trim() || !jobDept.trim()}
              onClick={() => {
                addJobRequisition({ title: jobTitle.trim(), department: jobDept.trim(), status: 'open' })
                setJobTitle('')
              }}
            >
              Add requisition
            </Button>
            {jobRequisitions.length > 0 ? (
              <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
                {jobRequisitions.slice(0, 5).map((j) => (
                  <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <span className="font-medium text-fg">{j.title}</span>
                    <select
                      className="rounded border border-border bg-surface px-2 py-1 text-xs"
                      value={j.status}
                      onChange={(e) => updateJobRequisition(j.id, { status: e.target.value as typeof j.status })}
                    >
                      <option value="open">Open</option>
                      <option value="filled">Filled</option>
                      <option value="closed">Closed</option>
                    </select>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted">Add candidate</p>
              <div className="flex flex-wrap gap-2">
                <select
                  className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                >
                  <option value="">Select role…</option>
                  {jobRequisitions.filter((j) => j.status === 'open').map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
                <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Candidate name" />
                <Button
                  size="sm"
                  disabled={!selectedJobId || !candidateName.trim()}
                  onClick={() => {
                    addJobCandidate({
                      requisitionId: selectedJobId,
                      name: candidateName.trim(),
                      stage: 'applied' as CandidateStage,
                    })
                    setCandidateName('')
                  }}
                >
                  Add
                </Button>
              </div>
              {jobCandidates.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {jobCandidates.slice(0, 4).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span>{c.name}</span>
                      <select
                        className="rounded border border-border bg-surface px-1 py-0.5"
                        value={c.stage}
                        onChange={(e) => updateJobCandidate(c.id, { stage: e.target.value as CandidateStage })}
                      >
                        <option value="applied">Applied</option>
                        <option value="screen">Screen</option>
                        <option value="interview">Interview</option>
                        <option value="offer">Offer</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">Quarterly award</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
              value={awardCategory}
              onChange={(e) => setAwardCategory(e.target.value as AwardCategory)}
            >
              {(Object.keys(AWARD_CATEGORY_LABELS) as AwardCategory[]).map((k) => (
                <option key={k} value={k}>{AWARD_CATEGORY_LABELS[k]}</option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
              value={awardWinner}
              onChange={(e) => setAwardWinner(e.target.value)}
            >
              <option value="">Select winner…</option>
              {users.filter((u) => u.active).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!awardWinner}
              onClick={() => {
                const q = Math.ceil((new Date().getMonth() + 1) / 3)
                addQuarterlyAward({
                  year: new Date().getFullYear(),
                  quarter: `Q${q}` as QuarterlyAward['quarter'],
                  category: awardCategory,
                  winnerId: awardWinner,
                })
                setAwardWinner('')
              }}
            >
              Record award
            </Button>
          </div>
        </Card>
      </div>

      <PulseSurveyResultsPanel />
      <FeedbackCycleSummaryPanel />
      <LearningReviewPanel />
      <IdpReviewPanel />

      <Card padding="md">
        <div className="mb-3 flex items-center gap-2">
          <UserMinus className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Exit interview</h3>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              label="Departing employee"
              value={exitName}
              onChange={(e) => setExitName(e.target.value)}
              placeholder="Full name"
            />
            <Input
              label="Last day (optional)"
              type="date"
              value={exitLastDay}
              onChange={(e) => setExitLastDay(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Primary reasons (select all that apply)</p>
            <div className="flex flex-wrap gap-2">
              {EXIT_REASON_OPTIONS.map((reason) => {
                const selected = exitReasons.includes(reason)
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() =>
                      setExitReasons((prev) =>
                        selected ? prev.filter((r) => r !== reason) : [...prev, reason],
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-focus ${
                      selected
                        ? 'bg-accent text-white'
                        : 'border border-border bg-surface text-muted hover:text-fg'
                    }`}
                  >
                    {reason}
                  </button>
                )
              })}
            </div>
          </div>
          <Input
            label="Notes (optional)"
            value={exitNotes}
            onChange={(e) => setExitNotes(e.target.value)}
            placeholder="Key themes from conversation"
          />
          <Button
            size="sm"
            disabled={!exitName.trim()}
            onClick={() => {
              addExitInterview({
                departingName: exitName.trim(),
                reasons: exitReasons,
                lastDay: exitLastDay || undefined,
                notes: exitNotes.trim() || undefined,
              })
              setExitName('')
              setExitNotes('')
              setExitReasons([])
              setExitLastDay('')
            }}
          >
            Log interview
          </Button>
        </div>
        {exitInterviews.length > 0 ? (
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {exitInterviews.map((ex) => (
              <li key={ex.id} className="rounded-md border border-border p-3">
                <p className="font-medium text-fg">{ex.departingName}</p>
                {ex.lastDay ? <p className="text-xs text-muted">Last day: {ex.lastDay}</p> : null}
                {ex.reasons.length > 0 ? (
                  <p className="mt-1 text-xs text-muted">{ex.reasons.join(' · ')}</p>
                ) : null}
                {ex.notes ? <p className="mt-2 text-muted">{ex.notes}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {grievances.filter((g) => g.status !== 'resolved').length > 0 ? (
        <Card padding="md">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-fg">Open grievances</h3>
          </div>
          <ul className="space-y-3 text-sm">
            {grievances.filter((g) => g.status !== 'resolved').map((g) => {
              const submitter = users.find((u) => u.id === g.userId)
              return (
                <li key={g.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Badge tone="warning">{g.category}</Badge>
                      <p className="mt-2 text-fg">{g.body}</p>
                      <p className="mt-1 text-xs text-muted">{submitter?.name ?? 'Confidential submitter'}</p>
                    </div>
                  </div>
                  <Textarea
                    className="mt-3"
                    rows={2}
                    placeholder="HR notes (internal)"
                    value={grievanceNotes[g.id] ?? g.hrNote ?? ''}
                    onChange={(e) => setGrievanceNotes((prev) => ({ ...prev, [g.id]: e.target.value }))}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        updateGrievance(g.id, {
                          hrNote: grievanceNotes[g.id]?.trim() || g.hrNote,
                          status: 'reviewing',
                        })
                      }
                    >
                      Save note
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        updateGrievance(g.id, {
                          hrNote: grievanceNotes[g.id]?.trim() || g.hrNote,
                          status: 'resolved',
                        })
                      }
                    >
                      Mark resolved
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}

      <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <UserMinus className="h-3.5 w-3.5" />
        {exitInterviews.length} exit interview{exitInterviews.length === 1 ? '' : 's'} on record · {quarterlyAwards.length} awards logged
        <Link to="/people" className="inline-flex items-center gap-1 font-medium text-accent hover:underline sm:ml-auto">
          People hub <ArrowRight className="h-3 w-3" />
        </Link>
      </p>
    </div>
  )
}
