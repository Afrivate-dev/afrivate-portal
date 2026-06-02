import { useMemo, useState } from 'react'
import {
  CalendarCheck,
  CheckCircle2,
  Pencil,
  Download,
  Users as UsersIcon,
  History,
  ChevronRight,
} from 'lucide-react'
import { format, parseISO, startOfWeek } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, fmtDate, isLead, relativeTime, weekLabel } from '@/utils/helpers'
import type { User, WeeklyCheckIn } from '@/types'

type Tab = 'this-week' | 'history' | 'team'

interface FormState {
  completed: string
  nextWeek: string
  blockers: string
  hoursWorked: string
}

const emptyForm: FormState = {
  completed: '',
  nextWeek: '',
  blockers: '',
  hoursWorked: '',
}

const formFromCheckIn = (c: WeeklyCheckIn): FormState => ({
  completed: c.completed,
  nextWeek: c.nextWeek,
  blockers: c.blockers ?? '',
  hoursWorked: c.hoursWorked.toString(),
})

export function WeeklyCheckInPage() {
  const { user } = useAuth()
  const { checkIns, users, submitCheckIn, updateCheckIn } = useData()
  const [tab, setTab] = useState<Tab>('this-week')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  const canSeeTeam = isLead(user)

  const currentWeekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
    [],
  )

  const mySubmissionThisWeek = useMemo(
    () =>
      user
        ? checkIns.find(
            (c) => c.userId === user.id && isSameWeekISO(c.weekStart, currentWeekStart),
          )
        : undefined,
    [checkIns, user, currentWeekStart],
  )

  const myHistory = useMemo(() => {
    if (!user) return []
    return checkIns
      .filter((c) => c.userId === user.id)
      .sort((a, b) => (a.weekStart > b.weekStart ? -1 : 1))
      .slice(0, 4)
  }, [checkIns, user])

  const teamThisWeek = useMemo(() => {
    if (!canSeeTeam) return []
    const submissions = checkIns.filter((c) => isSameWeekISO(c.weekStart, currentWeekStart))
    if (departmentFilter === 'all') return submissions
    return submissions.filter((c) => {
      const u = users.find((x) => x.id === c.userId)
      return u?.department === departmentFilter
    })
  }, [checkIns, currentWeekStart, canSeeTeam, departmentFilter, users])

  const departments = useMemo(() => {
    const set = new Set(users.map((u) => u.department))
    return ['all', ...Array.from(set).sort()]
  }, [users])

  const teamCoverage = useMemo(() => {
    const activeStaff = users.filter((u) => u.active).length
    const submitted = new Set(
      checkIns
        .filter((c) => isSameWeekISO(c.weekStart, currentWeekStart))
        .map((c) => c.userId),
    ).size
    return { submitted, total: activeStaff }
  }, [users, checkIns, currentWeekStart])

  if (!user) return null

  const startEdit = () => {
    if (mySubmissionThisWeek) {
      setForm(formFromCheckIn(mySubmissionThisWeek))
      setEditing(true)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setForm(emptyForm)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.completed.trim() || !form.nextWeek.trim() || !form.hoursWorked) return
    const payload = {
      completed: form.completed.trim(),
      nextWeek: form.nextWeek.trim(),
      blockers: form.blockers.trim() || undefined,
      hoursWorked: Number(form.hoursWorked),
    }
    if (mySubmissionThisWeek) {
      updateCheckIn(mySubmissionThisWeek.id, payload)
    } else {
      submitCheckIn({
        userId: user.id,
        weekStart: currentWeekStart,
        ...payload,
      })
    }
    setEditing(false)
    setForm(emptyForm)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly check-in"
        description={weekLabel(currentWeekStart)}
        actions={
          mySubmissionThisWeek && !editing && tab === 'this-week' ? (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> Submitted{' '}
              {relativeTime(mySubmissionThisWeek.submittedAt)}
            </Badge>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border">
        <TabButton active={tab === 'this-week'} onClick={() => setTab('this-week')}>
          <CalendarCheck className="h-4 w-4" /> This week
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          <History className="h-4 w-4" /> History
        </TabButton>
        {canSeeTeam ? (
          <TabButton active={tab === 'team'} onClick={() => setTab('team')}>
            <UsersIcon className="h-4 w-4" /> Team submissions
          </TabButton>
        ) : null}
      </div>

      {/* THIS WEEK */}
      {tab === 'this-week' ? (
        mySubmissionThisWeek && !editing ? (
          <SubmittedView checkIn={mySubmissionThisWeek} onEdit={startEdit} />
        ) : (
          <CheckInForm
            form={form}
            setForm={setForm}
            onSubmit={submit}
            onCancel={editing ? cancelEdit : undefined}
            isEdit={!!mySubmissionThisWeek}
          />
        )
      ) : null}

      {/* HISTORY */}
      {tab === 'history' ? (
        myHistory.length === 0 ? (
          <EmptyState
            icon={History}
            title="No history yet"
            description="Once you submit a few weekly check-ins, they'll show up here."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myHistory.map((c) => (
              <HistoryCard key={c.id} checkIn={c} />
            ))}
          </div>
        )
      ) : null}

      {/* TEAM SUBMISSIONS */}
      {tab === 'team' && canSeeTeam ? (
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-52">
                  <Select
                    label="Department"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    options={departments.map((d) => ({
                      value: d,
                      label: d === 'all' ? 'All departments' : d,
                    }))}
                  />
                </div>
                <div className="text-sm text-muted">
                  <p className="font-semibold text-fg">
                    {teamCoverage.submitted}/{teamCoverage.total}
                  </p>
                  <p className="text-xs">submitted this week</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => downloadCsv(teamThisWeek, users, currentWeekStart)}
                disabled={teamThisWeek.length === 0}
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </Card>

          {teamThisWeek.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No team submissions yet"
              description={
                departmentFilter === 'all'
                  ? 'When your team submits check-ins this week, they\u2019ll appear here.'
                  : 'No one in this department has submitted this week.'
              }
            />
          ) : (
            <Card padding="none" className="overflow-hidden">
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-2/60 text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="p-3 font-medium">Person</th>
                      <th className="p-3 font-medium">Completed</th>
                      <th className="p-3 font-medium">Next week</th>
                      <th className="p-3 font-medium">Blockers</th>
                      <th className="p-3 font-medium">Hours</th>
                      <th className="p-3 font-medium">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamThisWeek.map((c) => (
                      <TeamRow key={c.id} checkIn={c} users={users} />
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="divide-y divide-border lg:hidden">
                {teamThisWeek.map((c) => (
                  <TeamMobileRow key={c.id} checkIn={c} users={users} />
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  )
}

function isSameWeekISO(a: string, b: string) {
  return startOfWeek(parseISO(a), { weekStartsOn: 1 }).toISOString() ===
    startOfWeek(parseISO(b), { weekStartsOn: 1 }).toISOString()
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

function SubmittedView({ checkIn, onEdit }: { checkIn: WeeklyCheckIn; onEdit: () => void }) {
  return (
    <Card padding="lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Check-in submitted</CardTitle>
            <p className="mt-0.5 text-xs text-muted">
              {relativeTime(checkIn.submittedAt)} \u00b7 {checkIn.hoursWorked}h worked
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </CardHeader>

      <div className="mt-2 space-y-5">
        <Field label="What I completed">{checkIn.completed}</Field>
        <Field label="What's next week">{checkIn.nextWeek}</Field>
        {checkIn.blockers ? (
          <Field label="Blockers" tone="warning">
            {checkIn.blockers}
          </Field>
        ) : null}
      </div>
    </Card>
  )
}

function Field({
  label,
  children,
  tone = 'default',
}: {
  label: string
  children: React.ReactNode
  tone?: 'default' | 'warning'
}) {
  return (
    <div>
      <p
        className={cn(
          'mb-1 text-xs font-semibold uppercase tracking-wide',
          tone === 'warning' ? 'text-warning' : 'text-muted',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'whitespace-pre-line text-sm text-fg/90',
          tone === 'warning' &&
            'rounded-md border border-warning/20 bg-warning/5 p-3 text-fg',
        )}
      >
        {children}
      </p>
    </div>
  )
}

function CheckInForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  isEdit,
}: {
  form: FormState
  setForm: (f: FormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel?: () => void
  isEdit: boolean
}) {
  return (
    <Card padding="lg">
      <form className="space-y-5" onSubmit={onSubmit}>
        <Textarea
          label="What did I complete this week?"
          placeholder="Ship details, decisions made, problems solved \u2014 keep it specific."
          value={form.completed}
          onChange={(e) => setForm({ ...form, completed: e.target.value })}
          rows={5}
          required
        />
        <Textarea
          label="What's coming up next week?"
          placeholder="The 2\u20133 things you intend to land next week."
          value={form.nextWeek}
          onChange={(e) => setForm({ ...form, nextWeek: e.target.value })}
          rows={4}
          required
        />
        <Textarea
          label="Any blockers? (optional)"
          placeholder="Anything in the way \u2014 dependencies, decisions you need, missing access."
          value={form.blockers}
          onChange={(e) => setForm({ ...form, blockers: e.target.value })}
          rows={3}
        />
        <div className="grid gap-4 sm:max-w-xs">
          <Input
            type="number"
            min="0"
            max="80"
            step="0.5"
            label="Hours worked"
            value={form.hoursWorked}
            onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })}
            required
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit">
            {isEdit ? 'Save changes' : 'Submit check-in'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  )
}

function HistoryCard({ checkIn }: { checkIn: WeeklyCheckIn }) {
  return (
    <Card padding="md">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-fg">{weekLabel(checkIn.weekStart)}</p>
        <Badge tone="muted">{checkIn.hoursWorked}h</Badge>
      </div>
      <p className="mb-3 text-xs text-muted">Submitted {fmtDate(checkIn.submittedAt)}</p>

      <div className="space-y-3 text-sm">
        <div>
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Completed
          </p>
          <p className="line-clamp-3 text-fg/90">{checkIn.completed}</p>
        </div>
        <div>
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Next week
          </p>
          <p className="line-clamp-3 text-fg/90">{checkIn.nextWeek}</p>
        </div>
        {checkIn.blockers ? (
          <div>
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
              Blockers
            </p>
            <p className="line-clamp-2 text-fg/90">{checkIn.blockers}</p>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function TeamRow({ checkIn, users }: { checkIn: WeeklyCheckIn; users: User[] }) {
  const u = users.find((x) => x.id === checkIn.userId)
  if (!u) return null
  return (
    <tr className="border-t border-border align-top hover:bg-surface-2/40">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <Avatar name={u.name} src={u.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{u.name}</p>
            <p className="truncate text-xs text-muted">{u.department}</p>
          </div>
        </div>
      </td>
      <td className="max-w-[280px] p-3 text-sm text-fg/90">
        <p className="line-clamp-3 whitespace-pre-line">{checkIn.completed}</p>
      </td>
      <td className="max-w-[260px] p-3 text-sm text-fg/90">
        <p className="line-clamp-3 whitespace-pre-line">{checkIn.nextWeek}</p>
      </td>
      <td className="max-w-[220px] p-3 text-sm">
        {checkIn.blockers ? (
          <p className="line-clamp-3 whitespace-pre-line text-fg/90">{checkIn.blockers}</p>
        ) : (
          <span className="text-muted">\u2014</span>
        )}
      </td>
      <td className="p-3 text-sm font-semibold text-fg">{checkIn.hoursWorked}h</td>
      <td className="p-3 text-xs text-muted">{relativeTime(checkIn.submittedAt)}</td>
    </tr>
  )
}

function TeamMobileRow({ checkIn, users }: { checkIn: WeeklyCheckIn; users: User[] }) {
  const u = users.find((x) => x.id === checkIn.userId)
  if (!u) return null
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={u.name} src={u.avatarUrl} size="sm" />
          <div>
            <p className="text-sm font-semibold text-fg">{u.name}</p>
            <p className="text-xs text-muted">{u.department}</p>
          </div>
        </div>
        <Badge tone="muted">{checkIn.hoursWorked}h</Badge>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Completed</p>
          <p className="text-fg/90">{checkIn.completed}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Next week</p>
          <p className="text-fg/90">{checkIn.nextWeek}</p>
        </div>
        {checkIn.blockers ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-warning">Blockers</p>
            <p className="text-fg/90">{checkIn.blockers}</p>
          </div>
        ) : null}
      </div>
      <p className="text-[11px] text-muted">Submitted {relativeTime(checkIn.submittedAt)}</p>
    </div>
  )
}

function downloadCsv(rows: WeeklyCheckIn[], users: User[], weekStartIso: string) {
  const header = ['Name', 'Department', 'Role', 'Completed', 'Next week', 'Blockers', 'Hours', 'Submitted at']
  const lines = [header.join(',')]
  rows.forEach((c) => {
    const u = users.find((x) => x.id === c.userId)
    if (!u) return
    lines.push(
      [
        u.name,
        u.department,
        u.role,
        c.completed,
        c.nextWeek,
        c.blockers ?? '',
        c.hoursWorked.toString(),
        c.submittedAt,
      ]
        .map(csvCell)
        .join(','),
    )
  })

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `weekly-checkins-${format(parseISO(weekStartIso), 'yyyy-MM-dd')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvCell(v: string) {
  const needsQuote = /[",\n]/.test(v)
  const escaped = v.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}
