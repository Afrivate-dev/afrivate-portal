import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAvaFormDraft, useAvaPageDraft } from '@/hooks/useAvaDraft'
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
  Settings2,
  Pencil,
  X,
  FilePenLine,
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
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/useConfirm'
import { useData } from '@/context/DataContext'
import { confirms } from '@/content/copy'
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
import { cn, fmtDate, isAdmin, isHR, isOverdue, relativeTime } from '@/utils/helpers'
import { pages, actions } from '@/content/copy'
import { useComposerDrafts } from '@/hooks/useComposerDrafts'
import { isTaskPayload, type ComposerDraft, type TaskDraftPayload } from '@/lib/composerDrafts'
import type { Task, TaskCategory, TaskPriority, TaskStatus, User } from '@/types'

type ViewMode = 'board' | 'week' | 'list'

type ScopeMode = 'all' | 'mine' | 'owned' | 'assigned'

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

function statusLabel(s: TaskStatus | string | undefined): string {
  return (
    {
      todo: T.statusUpNext,
      in_progress: T.statusInProgress,
      done: T.statusComplete,
      blocked: T.statusStuck,
    }[s as TaskStatus] ?? T.statusUpNext
  )
}

function priorityLabel(p: TaskPriority | string | undefined): string {
  return (
    { high: T.priorityUrgent, medium: T.priorityNormal, low: T.priorityLater }[p as TaskPriority] ??
    T.priorityNormal
  )
}

function completionAudit(task: Task): { at: string; by?: string } | null {
  if (task.status !== 'done') return null
  if (task.completedAt) return { at: task.completedAt, by: task.completedBy }

  // Backward compatibility for tasks completed before dedicated audit fields existed.
  const entry = [...(task.activity ?? [])]
    .reverse()
    .find((item) => item.message === 'Status → Done')
  return entry ? { at: entry.at, by: entry.by } : null
}

function statusUi(s: TaskStatus | string | undefined) {
  return (s && STATUS_UI[s as TaskStatus]) || STATUS_UI.todo
}

function priorityTone(p: TaskPriority | string | undefined) {
  return (p && PRIORITY_TONE[p as TaskPriority]) || PRIORITY_TONE.medium
}

function exactTimestamp(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy, HH:mm:ss 'GMT'xxx")
  } catch {
    return iso
  }
}

// CATEGORIES and CATEGORY_LABEL are now built dynamically from DataContext.taskCategories

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
  assigneeIds: string[]
}

const emptyDraft: TaskDraft = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  category: '',   // resolved to taskCategories[0].id at open time
  dueDate: '',
  hoursLogged: '',
  estimatedHours: '',
  blockers: '',
  assigneeIds: [],
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
  assigneeIds: t.assigneeIds ?? (t.assigneeId ? [t.assigneeId] : []),
})

function formFromTaskPayload(p: TaskDraftPayload, fallbackCategory: string): TaskDraft {
  const status: TaskStatus =
    p.status === 'in_progress' || p.status === 'blocked' ? p.status : 'todo'
  const priority: TaskPriority =
    p.priority === 'high' || p.priority === 'low' ? p.priority : 'medium'
  return {
    ...emptyDraft,
    title: p.title,
    description: p.description,
    status,
    priority,
    category: p.category || fallbackCategory,
    dueDate: p.dueDate,
    blockers: p.blockers,
    estimatedHours: p.estimatedHours,
  }
}

export function TasksPage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const {
    tasks, users, createTask, updateTask, deleteTask,
    taskCategories, addTaskCategory, updateTaskCategory, deleteTaskCategory,
  } = useData()
  const { byKind, deleteDraft, getById } = useComposerDrafts()

  // Build dynamic lookup map — same shape as the old CATEGORY_LABEL constant
  const CATEGORY_LABEL = useMemo(
    () => Object.fromEntries(taskCategories.map((c) => [c.id, c.label])),
    [taskCategories],
  )

  const [searchParams, setSearchParams] = useSearchParams()
  const openedDraftParam = useRef<string | null>(null)
  const [view, setView] = useState<ViewMode>('board')
  const [scope, setScope] = useState<ScopeMode>('all')
  const [weekOffset, setWeekOffset] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft)
  const [composerDraftId, setComposerDraftId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')
  const [sort, setSort] = useState<SortMode>('dueSoon')

  // Category management modal (leads+ only)
  const [manageCatsOpen, setManageCatsOpen] = useState(false)
  const [catDraft, setCatDraft] = useState('')
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatLabel, setEditCatLabel] = useState('')

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    const target = tasks.find((t) => t.id === openId)
    if (!target) return
    const frameId = requestAnimationFrame(() => {
      setDetailId(openId)
      setSearchParams({}, { replace: true })
    })
    return () => cancelAnimationFrame(frameId)
  }, [searchParams, setSearchParams, tasks])

  useEffect(() => {
    const draftId = searchParams.get('draft')
    if (!draftId) {
      openedDraftParam.current = null
      return
    }
    if (openedDraftParam.current === draftId) return
    const saved = getById(draftId)
    if (!saved) return
    openedDraftParam.current = draftId
    if (saved.kind === 'task' && isTaskPayload(saved.payload)) {
      setDraft(formFromTaskPayload(saved.payload, taskCategories[0]?.id ?? ''))
      setComposerDraftId(saved.id)
      setFormOpen(true)
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('draft')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams, getById, taskCategories])

  useAvaPageDraft(
    'task',
    {
      title: draft.title,
      description: draft.description,
      status: draft.status,
      priority: draft.priority,
      category: draft.category,
      dueDate: draft.dueDate,
      blockers: draft.blockers,
      estimatedHours: draft.estimatedHours,
    },
    formOpen,
  )

  useAvaFormDraft('task', (d) => {
    if (d.mode === 'insert') return
    setDraft((prev) => {
      const status = d.fields.status
      const priority = d.fields.priority
      return {
        ...prev,
        ...(d.fields.title ? { title: d.fields.title } : {}),
        ...(d.fields.description ? { description: d.fields.description } : {}),
        ...(status === 'todo' || status === 'in_progress' || status === 'blocked' ? { status } : {}),
        ...(priority === 'high' || priority === 'medium' || priority === 'low' ? { priority } : {}),
        ...(d.fields.dueDate ? { dueDate: d.fields.dueDate } : {}),
        ...(d.fields.blockers ? { blockers: d.fields.blockers } : {}),
        ...(d.fields.estimatedHours ? { estimatedHours: d.fields.estimatedHours } : {}),
        ...(d.fields.category ? { category: d.fields.category } : {}),
      }
    })
    setFormOpen(true)
  })

  const isMyTask = useCallback(
    (t: Task) =>
      !!user &&
      (t.ownerId === user.id ||
        t.assigneeId === user.id ||
        (t.assigneeIds?.includes(user.id) ?? false)),
    [user],
  )

  const scopedTasks = useMemo(() => {
    if (!user) return []
    if (scope === 'all') return tasks
    if (scope === 'mine') return tasks.filter(isMyTask)
    if (scope === 'owned') return tasks.filter((t) => t.ownerId === user.id)
    if (scope === 'assigned')
      return tasks.filter(
        (t) => t.assigneeId === user.id || (t.assigneeIds?.includes(user.id) ?? false),
      )
    return tasks
  }, [tasks, user, scope, isMyTask])

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

  const visibleDrafts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return byKind.task
    return byKind.task.filter((d) => {
      const p = isTaskPayload(d.payload) ? d.payload : null
      const hay = `${d.label} ${p?.title ?? ''} ${p?.description ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [byKind.task, search])

  const filtersActive =
    !!search.trim() || statusFilter !== 'all' || priorityFilter !== 'all' || scope !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setScope('all')
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
    filteredTasks.forEach((t) => {
      const status = t.status in out ? t.status : 'todo'
      out[status].push(t)
    })
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
    setComposerDraftId(null)
    setDraft({ ...emptyDraft, category: taskCategories[0]?.id ?? '' })
    setFormOpen(true)
  }

  const openEdit = (t: Task) => {
    setComposerDraftId(null)
    setDraft(draftFromTask(t))
    setFormOpen(true)
  }

  const resumeComposerDraft = useCallback(
    (saved: ComposerDraft) => {
      if (saved.kind !== 'task' || !isTaskPayload(saved.payload)) return
      setDraft(formFromTaskPayload(saved.payload, taskCategories[0]?.id ?? ''))
      setComposerDraftId(saved.id)
      setFormOpen(true)
    },
    [taskCategories],
  )

  const closeForm = () => {
    setFormOpen(false)
    setComposerDraftId(null)
    setDraft(emptyDraft)
  }

  const onSubmit = async (e: React.FormEvent) => {
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
    const ok = await confirm({
      title: confirms.submitTaskTitle,
      message: confirms.submitTask,
      confirmLabel: draft.id ? 'Save changes' : 'Create task',
    })
    if (!ok) return
    if (draft.id) {
      updateTask(
        draft.id,
        {
          ...basePayload,
          assigneeIds: draft.assigneeIds,
          assigneeId: draft.assigneeIds[0] ?? undefined,
        },
        user.id,
      )
    } else {
      createTask({
        ...basePayload,
        ownerId: user.id,
        assigneeIds: draft.assigneeIds,
        assigneeId: draft.assigneeIds[0] ?? undefined,
      })
    }
    if (composerDraftId) deleteDraft(composerDraftId)
    closeForm()
  }

  const detailTask = detailId ? tasks.find((t) => t.id === detailId) ?? null : null

  const showingFilteredHint =
    filtersActive && myTasks.length > 0
      ? T.showingCount
          .replace('{n}', String(filteredTasks.length))
          .replace('{total}', String(myTasks.length))
      : null

  return (
    <div className="av-contain space-y-6">
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
            {isHR(user) && (
              <Button variant="secondary" onClick={() => { setManageCatsOpen(true); setCatDraft(''); setEditCatId(null) }}>
                <Settings2 className="h-4 w-4" />
                Categories
              </Button>
            )}
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

      <div className="av-stat-grid">
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
                { value: 'all', label: 'All tasks' },
                { value: 'mine', label: T.scopeRelated },
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
        filteredTasks.length === 0 && myTasks.length > 0 && visibleDrafts.length === 0 ? (
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FilePenLine className="h-4 w-4 text-muted" />
                  <h3 className="text-sm font-semibold text-fg">{T.statusDrafts}</h3>
                  <Badge tone="muted">{visibleDrafts.length}</Badge>
                </div>
              </div>
              <div className="space-y-2.5 rounded-lg bg-surface-2/40 p-2.5">
                {visibleDrafts.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted">{T.draftsEmpty}</p>
                ) : (
                  visibleDrafts.map((d) => (
                    <TaskDraftCard
                      key={d.id}
                      draft={d}
                      categoryLabel={CATEGORY_LABEL}
                      onResume={() => resumeComposerDraft(d)}
                      onDelete={() => deleteDraft(d.id)}
                    />
                  ))
                )}
              </div>
            </div>
            {STATUS_ORDER.map((status) => {
              const meta = statusUi(status)
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
                          categoryLabel={CATEGORY_LABEL}
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
        filteredTasks.length === 0 && myTasks.length > 0 && visibleDrafts.length === 0 ? (
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
            {visibleDrafts.length > 0 ? (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                  {T.statusDrafts}
                  <Badge tone="muted">{visibleDrafts.length}</Badge>
                </h3>
                <p className="mb-2 text-xs text-muted">{T.draftsHint}</p>
                <div className="space-y-2">
                  {visibleDrafts.map((d) => (
                    <TaskDraftCard
                      key={d.id}
                      draft={d}
                      categoryLabel={CATEGORY_LABEL}
                      onResume={() => resumeComposerDraft(d)}
                      onDelete={() => deleteDraft(d.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}
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
                        categoryLabel={CATEGORY_LABEL}
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
          {visibleDrafts.length > 0 ? (
            <div className="mb-6 space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <FilePenLine className="h-4 w-4 text-muted" />
                {T.statusDrafts}
                <Badge tone="muted">{visibleDrafts.length}</Badge>
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {visibleDrafts.map((d) => (
                  <TaskDraftCard
                    key={d.id}
                    draft={d}
                    categoryLabel={CATEGORY_LABEL}
                    onResume={() => resumeComposerDraft(d)}
                    onDelete={() => deleteDraft(d.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
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
                {format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM yyyy')}
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
                      const weekAids = t.assigneeIds?.length
                        ? t.assigneeIds
                        : t.assigneeId
                          ? [t.assigneeId]
                          : [t.ownerId]
                      const person = assigneeOptions.find((u) => u.id === weekAids[0])
                      const completion = completionAudit(t)
                      const completedBy = completion
                        ? assigneeOptions.find((u) => u.id === completion.by)
                        : undefined
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
                              {completion ? (
                                <p className="mt-1 break-words text-[10px] leading-tight text-success">
                                  Done {exactTimestamp(completion.at)}
                                  {completedBy ? ` by ${completedBy.name}` : ''}
                                </p>
                              ) : null}
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
                        categoryLabel={CATEGORY_LABEL}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 hidden av-scroll-x lg:block">
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
                    const tableAids = t.assigneeIds?.length
                      ? t.assigneeIds
                      : t.assigneeId
                        ? [t.assigneeId]
                        : [t.ownerId]
                    const person = assigneeOptions.find((u) => u.id === tableAids[0])
                    const completion = completionAudit(t)
                    const completedBy = completion
                      ? assigneeOptions.find((u) => u.id === completion.by)
                      : undefined
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setDetailId(t.id)}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2/50"
                      >
                        <td className="py-2.5 pr-3 font-medium text-fg">{t.title}</td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={statusUi(t.status).tone}>{statusLabel(t.status)}</Badge>
                          {completion ? (
                            <p className="mt-1 max-w-[15rem] text-[11px] leading-tight text-success">
                              {exactTimestamp(completion.at)}
                              {completedBy ? ` · ${completedBy.name}` : ''}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 text-muted">{CATEGORY_LABEL[t.category] ?? t.category}</td>
                        <td className="py-2.5 pr-3">
                          {person ? (
                            <div className="flex items-center gap-2 text-muted">
                              <Avatar name={person.name} src={person.avatarUrl} size="xs" />
                              <span className="text-fg">{person.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted">{'—'}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-muted">{fmtDate(t.dueDate)}</td>
                        <td className="py-2.5 pr-3 text-muted">{t.hoursLogged ?? 0}h</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {myTasks.length === 0 && visibleDrafts.length === 0 ? (
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
              <p className="mb-1.5 text-xs font-medium text-fg">{T.formAssigneeLabel}</p>
              <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-surface">
                <label className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={draft.assigneeIds.length === 0}
                    onChange={() => setDraft({ ...draft, assigneeIds: [] })}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-muted">{T.assigneeOwnerOnly}</span>
                </label>
                {assigneeOptions.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 last:border-0 hover:bg-surface-2">
                    <input
                      type="checkbox"
                      checked={draft.assigneeIds.includes(u.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...draft.assigneeIds, u.id]
                          : draft.assigneeIds.filter((id) => id !== u.id)
                        setDraft({ ...draft, assigneeIds: next })
                      }}
                      className="rounded border-border"
                    />
                    <Avatar name={u.name} src={u.avatarUrl} size="xs" />
                    <span className="text-sm text-fg">{u.name}</span>
                    <span className="ml-auto text-xs text-muted">{u.department}</span>
                  </label>
                ))}
              </div>
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
              options={taskCategories.map((c) => ({ value: c.id, label: c.label }))}
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

      {/* Delete task confirmation modal */}
      <Modal
        open={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        title="Delete task"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTaskId(null)}>
              {actions.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteTaskId) deleteTask(deleteTaskId)
                setDeleteTaskId(null)
              }}
            >
              {T.delete}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg">{T.deleteConfirm}</p>
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
              {user && (user.id === detailTask.ownerId || isAdmin(user)) ? (
                <>
                  <Button
                    variant="ghost"
                    className="mr-auto text-danger hover:bg-danger/10"
                    onClick={() => {
                      setDeleteTaskId(detailTask.id)
                      setDetailId(null)
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
              ) : null}
            </>
          ) : null
        }
      >
        {detailTask ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusUi(detailTask.status).tone}>{statusLabel(detailTask.status)}</Badge>
              <Badge tone={PRIORITY_TONE[detailTask.priority]}>
                {priorityLabel(detailTask.priority)} {T.prioritySuffix}
              </Badge>
              <Badge tone="muted">{CATEGORY_LABEL[detailTask.category]}</Badge>
              {detailTask.dueDate ? (
                <Badge tone={isOverdue(detailTask.dueDate) && detailTask.status !== 'done' ? 'danger' : 'default'}>
                  <Clock className="h-3 w-3" /> Due {fmtDate(detailTask.dueDate)}
                </Badge>
              ) : null}
            </div>

            {(() => {
              const completion = completionAudit(detailTask)
              if (!completion) return null
              const completedBy = assigneeOptions.find((u) => u.id === completion.by)
              return (
                <div className="rounded-md border border-success/25 bg-success/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-success">
                    Completion details
                  </p>
                  <p className="mt-1 text-sm font-medium text-fg">
                    {completedBy ? `Completed by ${completedBy.name}` : 'Completed'}
                  </p>
                  <time className="text-xs text-muted" dateTime={completion.at}>
                    {exactTimestamp(completion.at)}
                  </time>
                </div>
              )
            })()}

            {(() => {
              const assigneeIds = detailTask.assigneeIds?.length
                ? detailTask.assigneeIds
                : detailTask.assigneeId
                  ? [detailTask.assigneeId]
                  : []
              const assignedPeople = assigneeIds
                .map((id) => assigneeOptions.find((u) => u.id === id))
                .filter(Boolean) as User[]
              if (assignedPeople.length === 0) return null
              return (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {T.formAssigneeLabel}
                  </span>
                  {assignedPeople.map((person) => (
                    <div key={person.id} className="flex items-center gap-1.5">
                      <Avatar name={person.name} src={person.avatarUrl} size="sm" />
                      <span className="font-medium text-fg">{person.name}</span>
                    </div>
                  ))}
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

            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">{T.detailHoursLogged}</p>
                <p className="font-semibold text-fg">{detailTask.hoursLogged ?? 0}h</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">{T.detailEstimated}</p>
                <p className="font-semibold text-fg">{detailTask.estimatedHours ?? '—'}h</p>
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
                {T.formDueLabel}
              </h4>
              {user && (user.id === detailTask.ownerId || isAdmin(user)) ? (
                <Input
                  type="date"
                  value={detailTask.dueDate ? format(parseISO(detailTask.dueDate), 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    if (!user) return
                    updateTask(
                      detailTask.id,
                      {
                        dueDate: e.target.value
                          ? new Date(e.target.value + 'T12:00:00').toISOString()
                          : undefined,
                      },
                      user.id,
                    )
                  }}
                />
              ) : (
                <p className="text-sm text-fg">
                  {detailTask.dueDate ? fmtDate(detailTask.dueDate) : <span className="text-muted">No due date set</span>}
                </p>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {T.detailActivity}
              </h4>
              <ul className="space-y-1.5 text-xs">
                {[...detailTask.activity].reverse().map((a, i) => {
                  const actor = assigneeOptions.find((u) => u.id === a.by)
                  const isCompletion = a.message === 'Status → Done'
                  return (
                    <li key={i} className="flex flex-col gap-0.5 text-muted sm:flex-row sm:justify-between sm:gap-3">
                      <span>
                        {a.message}
                        {actor ? ` · ${actor.name}` : ''}
                      </span>
                      <time className="shrink-0" dateTime={a.at} title={exactTimestamp(a.at)}>
                        {isCompletion ? exactTimestamp(a.at) : relativeTime(a.at)}
                      </time>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Manage task categories modal — leads and above */}
      <Modal
        open={manageCatsOpen}
        onClose={() => { setManageCatsOpen(false); setEditCatId(null); setCatDraft('') }}
        title="Manage task categories"
        size="md"
      >
        <div className="space-y-4">
          {/* Add new */}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const label = catDraft.trim()
              if (!label) return
              addTaskCategory(label)
              setCatDraft('')
            }}
          >
            <Input
              className="flex-1"
              placeholder="New category name…"
              value={catDraft}
              onChange={(e) => setCatDraft(e.target.value)}
            />
            <Button type="submit" variant="primary" disabled={!catDraft.trim()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>

          {/* Existing list */}
          <ul className="divide-y divide-border rounded-md border border-border">
            {taskCategories.map((cat) => (
              <li key={cat.id} className="flex items-center gap-2 px-3 py-2">
                {editCatId === cat.id ? (
                  <>
                    <Input
                      className="flex-1"
                      value={editCatLabel}
                      onChange={(e) => setEditCatLabel(e.target.value)}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        const label = editCatLabel.trim()
                        if (label) updateTaskCategory(cat.id, label)
                        setEditCatId(null)
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditCatId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-fg">{cat.label}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditCatId(cat.id); setEditCatLabel(cat.label) }}
                      aria-label={`Edit category ${cat.label}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10"
                      onClick={async () => {
                        const ok = await confirm({
                          title: confirms.deleteCategoryTitle,
                          message: confirms.deleteCategory,
                          destructive: true,
                        })
                        if (ok) deleteTaskCategory(cat.id)
                      }}
                      aria-label={`Delete category ${cat.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </li>
            ))}
            {taskCategories.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted">No categories yet.</li>
            )}
          </ul>
          <p className="text-xs text-muted">
            Changes apply immediately. Existing tasks keep their current category label.
          </p>
        </div>
      </Modal>
    </div>
  )
}

function TaskDraftCard({
  draft,
  categoryLabel,
  onResume,
  onDelete,
}: {
  draft: ComposerDraft
  categoryLabel: Record<string, string>
  onResume: () => void
  onDelete: () => void
}) {
  const p = isTaskPayload(draft.payload) ? draft.payload : null
  const title = p?.title || draft.label
  return (
    <div className="rounded-md border border-dashed border-border bg-surface p-3">
      <button type="button" onClick={onResume} className="block w-full text-left ring-focus">
        <p className="line-clamp-2 text-sm font-medium text-fg">{title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="muted">{T.statusDrafts}</Badge>
          {p?.priority ? (
            <Badge tone={priorityTone(p.priority)}>{priorityLabel(p.priority)}</Badge>
          ) : null}
          {p?.category ? <Badge tone="muted">{categoryLabel[p.category] ?? p.category}</Badge> : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
          <span>{p?.dueDate ? `Due ${fmtDate(p.dueDate)}` : T.noDue}</span>
          <span>Updated {relativeTime(draft.updatedAt)}</span>
        </div>
      </button>
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={onDelete}
          aria-label={`Delete draft ${title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function TaskCard({
  task,
  users,
  onClick,
  categoryLabel,
}: {
  task: Task
  users: User[]
  onClick: () => void
  categoryLabel: Record<string, string>
}) {
  const overdue = task.status !== 'done' && isOverdue(task.dueDate)
  const assigneeIds = task.assigneeIds?.length
    ? task.assigneeIds
    : task.assigneeId
      ? [task.assigneeId]
      : []
  const displayPeople = assigneeIds
    .slice(0, 3)
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as User[]
  const extraCount = assigneeIds.length > 3 ? assigneeIds.length - 3 : 0
  const completion = completionAudit(task)
  const completedBy = completion ? users.find((u) => u.id === completion.by) : undefined

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md border border-border bg-surface p-3 text-left transition-colors hover:border-accent/40 ring-focus"
    >
      <div className="flex items-start gap-2.5">
        {displayPeople.length > 0 ? (
          <div className="mt-0.5 flex shrink-0 -space-x-1.5">
            {displayPeople.map((p) => (
              <Avatar key={p.id} name={p.name} src={p.avatarUrl} size="sm" className="ring-1 ring-surface" />
            ))}
            {extraCount > 0 ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-2 text-[10px] font-medium text-muted ring-1 ring-surface">
                +{extraCount}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-fg">{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={priorityTone(task.priority)}>{priorityLabel(task.priority)}</Badge>
            <Badge tone="muted">{categoryLabel[task.category] ?? task.category}</Badge>
            {task.blockers ? (
              <Badge tone="danger" dot>
                {T.statusStuck}
              </Badge>
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
            <span className={cn(overdue && 'text-danger')}>
              {task.dueDate ? `Due ${fmtDate(task.dueDate)}` : T.noDue}
            </span>
            <span>{task.hoursLogged ?? 0}h</span>
          </div>
          {completion ? (
            <p className="mt-2 break-words text-[11px] leading-tight text-success">
              {completedBy ? `Done by ${completedBy.name}` : 'Done'} · {exactTimestamp(completion.at)}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  )
}
