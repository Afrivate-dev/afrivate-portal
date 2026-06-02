import { useMemo, useState } from 'react'
import {
  Plus,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ListChecks,
  Loader2,
  Ban,
  Trash2,
  Search,
  LayoutList,
} from 'lucide-react'
import {
  addDays,
  format,
  isPast,
  isSameDay,
  isThisWeek,
  isToday,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { cn, fmtShortDate, isOverdue, relativeTime } from '@/utils/helpers'
import { pages, actions } from '@/content/copy'
import type { Task, TaskCategory, TaskPriority, TaskStatus, User } from '@/types'

type ViewMode = 'board' | 'week' | 'list'

type ScopeMode = 'related' | 'owned' | 'assigned'

type SortMode = 'dueSoon' | 'dueLater' | 'updated'

const T = pages.tasks

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done', 'blocked']

const STATUS_UI: Record<
  TaskStatus,
  { tone: 'muted' | 'info' | 'success' | 'danger'; icon: typeof ListChecks }
> = {
  todo: { tone: 'muted', icon: ListChecks },
  in_progress: { tone: 'info', icon: Loader2 },
  done: { tone: 'success', icon: CheckCircle2 },
  blocked: { tone: 'danger', icon: Ban },
}

const PRIORITY_TONE: Record<TaskPriority, 'danger' | 'warning' | 'muted'> = {
  high: 'danger',
  medium: 'warning',
  low: 'muted',
}

function statusLabel(s: TaskStatus): string {
  return {
    todo: T.statusUpNext,
    in_progress: T.statusInProgress,
    done: T.statusComplete,
    blocked: T.statusStuck,
  }[s]
}

function priorityLabel(p: TaskPriority): string {
  return { high: T.priorityUrgent, medium: T.priorityNormal, low: T.priorityLater }[p]
}

const CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'react', label: 'React / Frontend' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'performance', label: 'Performance' },
  { value: 'nodejs', label: 'Node.js' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'admin', label: 'Operations' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<
  TaskCategory,
  string
>

type DueBucket = 'overdue' | 'today' | 'this_week' | 'later' | 'none'

function dueBucket(task: Task): DueBucket {
  if (!task.dueDate) return 'none'
  const d = parseISO(task.dueDate)
  if (isPast(d) && !isToday(d)) return 'overdue'
  if (isToday(d)) return 'today'
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'this_week'
  return 'later'
}

interface TaskDraft {
  id?: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  category: TaskCategory
  dueDate: string
  hoursLogged: string
  estimatedHours: string
  blockers: string
  assigneeId: string
}

const emptyDraft: TaskDraft = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  category: 'react',
  dueDate: '',
  hoursLogged: '',
  estimatedHours: '',
  blockers: '',
  assigneeId: '',
}

const draftFromTask = (t: Task): TaskDraft => ({
  id: t.id,
  title: t.title,
  description: t.description ?? '',
  status: t.status,
  priority: t.priority,
  category: t.category,
  dueDate: t.dueDate ? format(parseISO(t.dueDate), 'yyyy-MM-dd') : '',
  hoursLogged: t.hoursLogged?.toString() ?? '',
  estimatedHours: t.estimatedHours?.toString() ?? '',
  blockers: t.blockers ?? '',
  assigneeId: t.assigneeId ?? '',
})

export function TasksPage() {
  const { user } = useAuth()
  const { tasks, users, createTask, updateTask, deleteTask } = useData()
  const [view, setView] = useState<ViewMode>('board')
  const [scope, setScope] = useState<ScopeMode>('related')
  const [weekOffset, setWeekOffset] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')
  const [sort, setSort] = useState<SortMode>('dueSoon')

  const relatedTasks = useMemo(
    () =>
      user
        ? tasks.filter((t) => t.ownerId === user.id || t.assigneeId === user.id)
        : [],
    [tasks, user],
  )

  const scopedTasks = useMemo(() => {
    if (!user) return []
    if (scope === 'owned') return relatedTasks.filter((t) => t.ownerId === user.id)
    if (scope === 'assigned')
      return relatedTasks.filter((t) => t.assigneeId != null && t.assigneeId === user.id)
    return relatedTasks
  }, [relatedTasks, user, scope])

  const assigneeOptions = useMemo(
    () => users.filter((u) => u.active).sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  )

  const myTasks = scopedTasks

  const filteredTasks = useMemo(() => {
    const list = myTasks.filter((t) => {
      const q = search.trim().toLowerCase()
      if (q) {
        const inTitle = t.title.toLowerCase().includes(q)
        const inDesc = t.description?.toLowerCase().includes(q) ?? false
        if (!inTitle && !inDesc) return false
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      return true
    })
    const copy = [...list]
    if (sort === 'dueSoon') {
      copy.sort((a, b) => {
        const ad = a.dueDate ? parseISO(a.dueDate).getTime() : Number.POSITIVE_INFINITY
        const bd = b.dueDate ? parseISO(b.dueDate).getTime() : Number.POSITIVE_INFINITY
        if (ad !== bd) return ad - bd
        return b.updatedAt.localeCompare(a.updatedAt)
      })
    } else if (sort === 'dueLater') {
      copy.sort((a, b) => {
        const ad = a.dueDate ? parseISO(a.dueDate).getTime() : Number.NEGATIVE_INFINITY
        const bd = b.dueDate ? parseISO(b.dueDate).getTime() : Number.NEGATIVE_INFINITY
        if (ad !== bd) return bd - ad
        return b.updatedAt.localeCompare(a.updatedAt)
      })
    } else {
      copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
    return copy
  }, [myTasks, search, statusFilter, priorityFilter, sort])

  const filtersActive =
    !!search.trim() || statusFilter !== 'all' || priorityFilter !== 'all' || scope !== 'related'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setScope('related')
  }

  const stats = useMemo(
    () => ({
      total: myTasks.length,
      inProgress: myTasks.filter((t) => t.status === 'in_progress').length,
      done: myTasks.filter((t) => t.status === 'done').length,
      overdue: myTasks.filter((t) => t.status !== 'done' && isOverdue(t.dueDate)).length,
    }),
    [myTasks],
  )

  const grouped = useMemo(() => {
    const out: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
      blocked: [],
    }
    filteredTasks.forEach((t) => out[t.status].push(t))
    return out
  }, [filteredTasks])

  const listSections = useMemo(() => {
    const order: DueBucket[] = ['overdue', 'today', 'this_week', 'later', 'none']
    const labels: Record<DueBucket, string> = {
      overdue: T.listOverdue,
      today: T.listDueToday,
      this_week: T.listThisWeek,
      later: T.listLater,
      none: T.listNoDue,
    }
    const buckets: Record<DueBucket, Task[]> = {
      overdue: [],
      today: [],
      this_week: [],
      later: [],
      none: [],
    }
    filteredTasks.forEach((t) => buckets[dueBucket(t)].push(t))
    return order.map((key) => ({ key, label: labels[key], tasks: buckets[key] }))
  }, [filteredTasks])

  const weekStart = useMemo(
    () => startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 }),
    [weekOffset],
  )

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const tasksByDay = useMemo(() => {
    return weekDays.map((d) => ({
      date: d,
      tasks: filteredTasks.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), d)),
    }))
  }, [filteredTasks, weekDays])

  const openCreate = () => {
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  const openEdit = (t: Task) => {
    setDraft(draftFromTask(t))
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setDraft(emptyDraft)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const basePayload = {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      status: draft.status,
      priority: draft.priority,
      category: draft.category,
      dueDate: draft.dueDate ? new Date(draft.dueDate + 'T12:00:00').toISOString() : undefined,
      hoursLogged: draft.hoursLogged ? Number(draft.hoursLogged) : 0,
      estimatedHours: draft.estimatedHours ? Number(draft.estimatedHours) : undefined,
      blockers: draft.blockers.trim() || undefined,
    }
    if (!basePayload.title) return
    if (draft.id) {
      updateTask(
        draft.id,
        {
          ...basePayload,
          assigneeId: draft.assigneeId || undefined,
        },
        user.id,
      )
    } else {
      createTask({
        ...basePayload,
        ownerId: user.id,
        assigneeId: draft.assigneeId || undefined,
      })
    }
    closeForm()
  }

  const detailTask = detailId ? relatedTasks.find((t) => t.id === detailId) ?? null : null

  const showingFilteredHint =
    filtersActive && myTasks.length > 0
      ? T.showingCount
          .replace('{n}', String(filteredTasks.length))
          .replace('{total}', String(myTasks.length))
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={T.title}
        description={T.subtitle}
        actions={
          <>
            <div className="hidden rounded-md border border-border bg-surface p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => setView('board')}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-sm font-medium',
                  view === 'board' ? 'bg-accent text-white' : 'text-muted hover:text-fg',
                )}
              >
                {T.board}
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-sm font-medium',
                  view === 'list' ? 'bg-accent text-white' : 'text-muted hover:text-fg',
                )}
              >
                {T.list}
              </button>
              <button
                type="button"
                onClick={() => setView('week')}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-sm font-medium',
                  view === 'week' ? 'bg-accent text-white' : 'text-muted hover:text-fg',
                )}
              >
                {T.week}
              </button>
            </div>
            <Button onClick={openCreate} variant="primary">
              <Plus className="h-4 w-4" />
              {T.newTask}
            </Button>
          </>
        }
      />

      {/* Mobile view toggle */}
      <div className="flex sm:hidden">
        <div className="grid w-full grid-cols-3 rounded-md border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setView('board')}
            className={cn(
              'rounded-sm py-1.5 text-sm font-medium',
              view === 'board' ? 'bg-accent text-white' : 'text-muted',
            )}
          >
            {T.board}
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'rounded-sm py-1.5 text-sm font-medium',
              view === 'list' ? 'bg-accent text-white' : 'text-muted',
            )}
          >
            {T.list}
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={cn(
              'rounded-sm py-1.5 text-sm font-medium',
              view === 'week' ? 'bg-accent text-white' : 'text-muted',
            )}
          >
            {T.week}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={T.statTotal} value={stats.total} icon={ListChecks} tone="muted" />
        <StatCard label={T.statInProgress} value={stats.inProgress} icon={Loader2} tone="brand" />
        <StatCard label={T.statDone} value={stats.done} icon={CheckCircle2} tone="success" />
        <StatCard label={T.statOverdue} value={stats.overdue} icon={AlertCircle} tone="danger" />
      </div>

      {showingFilteredHint ? (
        <p className="text-center text-xs text-muted sm:text-left">{showingFilteredHint}</p>
      ) : null}

      <Card padding="md" className="border-border">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={T.searchPlaceholder}
              className="pl-9"
              aria-label={T.searchPlaceholder}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label={T.filterScope}
              value={scope}
              onChange={(e) => setScope(e.target.value as ScopeMode)}
              options={[
                { value: 'related', label: T.scopeRelated },
                { value: 'owned', label: T.scopeOwned },
                { value: 'assigned', label: T.scopeAssigned },
              ]}
            />
            <Select
              label={T.filterStatus}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              options={[
                { value: 'all', label: T.statusAll },
                ...STATUS_ORDER.map((s) => ({ value: s, label: statusLabel(s) })),
              ]}
            />
            <Select
              label={T.filterPriority}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
              options={[
                { value: 'all', label: T.priorityAll },
                ...(['high', 'medium', 'low'] as TaskPriority[]).map((p) => ({
                  value: p,
                  label: priorityLabel(p),
                })),
              ]}
            />
            <Select
              label={T.sortBy}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              options={[
                { value: 'dueSoon', label: T.sortDueSoon },
                { value: 'dueLater', label: T.sortDueLater },
                { value: 'updated', label: T.sortUpdated },
              ]}
            />
            <div className="flex items-end">
              {filtersActive ? (
                <Button type="button" variant="ghost" className="w-full" onClick={clearFilters}>
                  {T.clearFilters}
                </Button>
              ) : (
                <p className="w-full pb-3 text-xs text-muted">&nbsp;</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Board view */}
      {view === 'board' ? (
        filteredTasks.length === 0 && myTasks.length > 0 ? (
          <EmptyState
            icon={Search}
            title={T.filteredEmptyTitle}
            description={T.filteredEmptyBody}
            action={
              <Button type="button" variant="secondary" onClick={clearFilters}>
                {T.clearFilters}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STATUS_ORDER.map((status) => {
              const meta = STATUS_UI[status]
              const items = grouped[status]
              const Icon = meta.icon
              return (
                <div key={status} className="flex flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted" />
                      <h3 className="text-sm font-semibold text-fg">{statusLabel(status)}</h3>
                      <Badge tone="muted">{items.length}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2.5 rounded-lg bg-surface-2/40 p-2.5">
                    {items.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-muted">{T.columnEmpty}</p>
                    ) : (
                      items.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          users={assigneeOptions}
                          onClick={() => setDetailId(t.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : null}

      {/* List view (grouped by due) */}
      {view === 'list' ? (
        filteredTasks.length === 0 && myTasks.length > 0 ? (
          <EmptyState
            icon={Search}
            title={T.filteredEmptyTitle}
            description={T.filteredEmptyBody}
            action={
              <Button type="button" variant="secondary" onClick={clearFilters}>
                {T.clearFilters}
              </Button>
            }
          />
        ) : (
          <Card padding="md" className="space-y-8">
            <div className="flex items-center gap-2 text-sm font-medium text-muted">
              <LayoutList className="h-4 w-4" />
              {T.list}
            </div>
            {listSections.map(({ key, label, tasks: sectionTasks }) =>
              sectionTasks.length === 0 ? null : (
                <section key={key}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                    {label}
                    <Badge tone="muted">{sectionTasks.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {sectionTasks.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        users={assigneeOptions}
                        onClick={() => setDetailId(t.id)}
                      />
                    ))}
                  </div>
                </section>
              ),
            )}
          </Card>
        )
      ) : null}

      {/* Week view */}
      {view === 'week' ? (
        <Card padding="md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setWeekOffset((v) => v - 1)}
              className="rounded-md p-2 text-fg hover:bg-surface-2 ring-focus"
              aria-label={T.prevWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-fg">
                {format(weekStart, 'd MMM')} \u2013 {format(addDays(weekStart, 6), 'd MMM yyyy')}
              </p>
              {weekOffset !== 0 ? (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-xs text-accent hover:underline"
                >
                  {T.jumpToThisWeek}
                </button>
              ) : (
                <p className="text-xs text-muted">{T.thisWeekLabel}</p>
              )}
            </div>
            <button
              onClick={() => setWeekOffset((v) => v + 1)}
              className="rounded-md p-2 text-fg hover:bg-surface-2 ring-focus"
              aria-label={T.nextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden grid-cols-7 gap-2 lg:grid">
            {tasksByDay.map(({ date, tasks: dayTasks }) => (
              <div key={date.toISOString()} className="flex min-h-[180px] flex-col">
                <div className="mb-2 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {format(date, 'EEE')}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-sm font-semibold',
                      isSameDay(date, new Date()) ? 'text-accent' : 'text-fg',
                    )}
                  >
                    {format(date, 'd')}
                  </p>
                </div>
                <div className="flex-1 space-y-1.5 rounded-md bg-surface-2/40 p-1.5">
                  {dayTasks.length === 0 ? (
                    <p className="px-1 py-4 text-center text-[11px] text-muted">{T.weekNoItems}</p>
                  ) : (
                    dayTasks.map((t) => {
                      const aid = t.assigneeId ?? t.ownerId
                      const person = assigneeOptions.find((u) => u.id === aid)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setDetailId(t.id)}
                          className="block w-full rounded-sm border border-border bg-surface p-2 text-left text-[11px] hover:border-accent/40 ring-focus"
                        >
                          <div className="flex items-start gap-1.5">
                            {person ? (
                              <Avatar
                                name={person.name}
                                src={person.avatarUrl}
                                size="xs"
                                className="mt-0.5 shrink-0"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 font-medium text-fg">{t.title}</p>
                              <Badge tone={PRIORITY_TONE[t.priority]} className="mt-1">
                                {priorityLabel(t.priority)}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 lg:hidden">
            {tasksByDay.map(({ date, tasks: dayTasks }) => (
              <div key={date.toISOString()}>
                <p
                  className={cn(
                    'mb-2 text-sm font-semibold',
                    isSameDay(date, new Date()) ? 'text-accent' : 'text-fg',
                  )}
                >
                  {format(date, 'EEEE, d MMM')}
                </p>
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted">{T.weekNoItems}</p>
                ) : (
                  <div className="space-y-2">
                    {dayTasks.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        users={assigneeOptions}
                        onClick={() => setDetailId(t.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">{T.tableTask}</th>
                  <th className="py-2 pr-3 font-medium">{T.tableStatus}</th>
                  <th className="py-2 pr-3 font-medium">{T.tableCategory}</th>
                  <th className="py-2 pr-3 font-medium">{T.tableAssignee}</th>
                  <th className="py-2 pr-3 font-medium">{T.tableDue}</th>
                  <th className="py-2 pr-3 font-medium">{T.tableHours}</th>
                </tr>
              </thead>
              <tbody>
                {tasksByDay
                  .flatMap((d) => d.tasks)
                  .map((t) => {
                    const aid = t.assigneeId ?? t.ownerId
                    const person = assigneeOptions.find((u) => u.id === aid)
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setDetailId(t.id)}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2/50"
                      >
                        <td className="py-2.5 pr-3 font-medium text-fg">{t.title}</td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={STATUS_UI[t.status].tone}>{statusLabel(t.status)}</Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-muted">{CATEGORY_LABEL[t.category]}</td>
                        <td className="py-2.5 pr-3">
                          {person ? (
                            <div className="flex items-center gap-2 text-muted">
                              <Avatar name={person.name} src={person.avatarUrl} size="xs" />
                              <span className="text-fg">{person.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted">{'\u2014'}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-muted">{fmtShortDate(t.dueDate)}</td>
                        <td className="py-2.5 pr-3 text-muted">{t.hoursLogged ?? 0}h</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {myTasks.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={T.emptyTasksTitle}
              description={T.emptyTasksBody}
              action={
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {T.newTask}
                </Button>
              }
            />
          ) : null}
        </Card>
      ) : null}

      {/* Task form modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={draft.id ? T.formEditTitle : T.formNewTitle}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeForm} type="button">
              {actions.cancel}
            </Button>
            <Button onClick={onSubmit} type="button">
              {draft.id ? T.saveChanges : T.createTask}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label={T.formTitleLabel}
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder={T.formTitlePlaceholder}
          />
          <Textarea
            label={T.formDescriptionLabel}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder={T.formDescriptionPlaceholder}
          />
          <p className="text-xs text-muted">{T.mentionHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Select
                label={T.formAssigneeLabel}
                value={draft.assigneeId}
                onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}
                options={[
                  { value: '', label: T.assigneeOwnerOnly },
                  ...assigneeOptions.map((u) => ({ value: u.id, label: u.name })),
                ]}
              />
            </div>
            <Select
              label={T.formStatusLabel}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}
              options={STATUS_ORDER.map((s) => ({ value: s, label: statusLabel(s) }))}
            />
            <Select
              label={T.formPriorityLabel}
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })}
              options={(['high', 'medium', 'low'] as TaskPriority[]).map((p) => ({
                value: p,
                label: priorityLabel(p),
              }))}
            />
            <Select
              label={T.formCategoryLabel}
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as TaskCategory })}
              options={CATEGORIES}
            />
            <Input
              type="date"
              label={T.formDueLabel}
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            />
            <Input
              type="number"
              min="0"
              step="0.5"
              label={T.formHoursLabel}
              value={draft.hoursLogged}
              onChange={(e) => setDraft({ ...draft, hoursLogged: e.target.value })}
            />
            <Input
              type="number"
              min="0"
              step="0.5"
              label={T.formEstimateLabel}
              value={draft.estimatedHours}
              onChange={(e) => setDraft({ ...draft, estimatedHours: e.target.value })}
            />
          </div>
          <Textarea
            label={T.blockedHelp}
            value={draft.blockers}
            onChange={(e) => setDraft({ ...draft, blockers: e.target.value })}
            placeholder={T.blockersPlaceholder}
          />
        </form>
      </Modal>

      {/* Task detail modal */}
      <Modal
        open={!!detailTask}
        onClose={() => setDetailId(null)}
        title={detailTask?.title}
        size="lg"
        footer={
          detailTask ? (
            <>
              <Button
                variant="ghost"
                className="mr-auto text-danger hover:bg-danger/10"
                onClick={() => {
                  if (window.confirm(T.deleteConfirm)) {
                    deleteTask(detailTask.id)
                    setDetailId(null)
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> {T.delete}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  openEdit(detailTask)
                  setDetailId(null)
                }}
              >
                {T.edit}
              </Button>
            </>
          ) : null
        }
      >
        {detailTask ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_UI[detailTask.status].tone}>{statusLabel(detailTask.status)}</Badge>
              <Badge tone={PRIORITY_TONE[detailTask.priority]}>
                {priorityLabel(detailTask.priority)} {T.prioritySuffix}
              </Badge>
              <Badge tone="muted">{CATEGORY_LABEL[detailTask.category]}</Badge>
              {detailTask.dueDate ? (
                <Badge tone={isOverdue(detailTask.dueDate) && detailTask.status !== 'done' ? 'danger' : 'default'}>
                  <Clock className="h-3 w-3" /> Due {fmtShortDate(detailTask.dueDate)}
                </Badge>
              ) : null}
            </div>

            {(() => {
              const aid = detailTask.assigneeId ?? detailTask.ownerId
              const person = assigneeOptions.find((u) => u.id === aid)
              if (!person) return null
              return (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {T.formAssigneeLabel}
                  </span>
                  <Avatar name={person.name} src={person.avatarUrl} size="sm" />
                  <span className="font-medium text-fg">{person.name}</span>
                </div>
              )
            })()}

            {detailTask.description ? (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {T.detailDescription}
                </h4>
                <p className="whitespace-pre-line text-sm text-fg/90">{detailTask.description}</p>
              </div>
            ) : null}

            {detailTask.blockers ? (
              <div className="rounded-md border border-danger/20 bg-danger/5 p-3">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">
                  {T.detailBlockers}
                </h4>
                <p className="text-sm text-fg">{detailTask.blockers}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">{T.detailHoursLogged}</p>
                <p className="font-semibold text-fg">{detailTask.hoursLogged ?? 0}h</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">{T.detailEstimated}</p>
                <p className="font-semibold text-fg">{detailTask.estimatedHours ?? '\u2014'}h</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {T.detailChangeStatus}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    title={T.updateStatus}
                    onClick={() => user && updateTask(detailTask.id, { status: s }, user.id)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                      detailTask.status === s
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-surface text-fg hover:bg-surface-2',
                    )}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {T.detailActivity}
              </h4>
              <ul className="space-y-1.5 text-xs">
                {[...detailTask.activity].reverse().map((a, i) => (
                  <li key={i} className="flex justify-between gap-3 text-muted">
                    <span>{a.message}</span>
                    <span className="shrink-0">{relativeTime(a.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function TaskCard({
  task,
  users,
  onClick,
}: {
  task: Task
  users: User[]
  onClick: () => void
}) {
  const overdue = task.status !== 'done' && isOverdue(task.dueDate)
  const aid = task.assigneeId ?? task.ownerId
  const person = users.find((u) => u.id === aid)
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md border border-border bg-surface p-3 text-left transition-colors hover:border-accent/40 ring-focus"
    >
      <div className="flex items-start gap-2.5">
        {person ? (
          <Avatar name={person.name} src={person.avatarUrl} size="sm" className="mt-0.5 shrink-0" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-fg">{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={PRIORITY_TONE[task.priority]}>{priorityLabel(task.priority)}</Badge>
            <Badge tone="muted">{CATEGORY_LABEL[task.category]}</Badge>
            {task.blockers ? (
              <Badge tone="danger" dot>
                {T.statusStuck}
              </Badge>
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
            <span className={cn(overdue && 'text-danger')}>
              {task.dueDate ? `Due ${fmtShortDate(task.dueDate)}` : T.noDue}
            </span>
            <span>{task.hoursLogged ?? 0}h</span>
          </div>
        </div>
      </div>
    </button>
  )
}
