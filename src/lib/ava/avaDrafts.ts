import {
  newComposerDraftId,
  notifyComposerDraftsChanged,
  readComposerDraftsStore,
  upsertComposerDraft,
  writeComposerDraftsStore,
  type ComposerDraftKind,
  type EventDraftPayload,
  type MemoDraftPayload,
  type ShoutoutDraftPayload,
} from '@/lib/composerDrafts'
import type { AvaDraftKind, AvaDraftMode, AvaInsertDraftAction, AvaSuggestedAction } from '@/lib/ava/types'

export const AVA_DRAFT_EVENT = 'ava:draft'
const AVA_DRAFT_STORAGE_PREFIX = 'ava-form-draft:'

const DRAFT_KINDS: readonly AvaDraftKind[] = [
  'weekly_update',
  'task',
  'leave',
  'shoutout',
  'memo',
  'event',
  'my_info',
]

const KIND_PATH: Record<AvaDraftKind, string> = {
  weekly_update: '/checkin',
  task: '/tasks',
  leave: '/people/leave',
  shoutout: '/people/shout-outs',
  memo: '/announcements',
  event: '/events',
  my_info: '/people/my-info',
}

/** Model action types that would submit, complete, or mutate records — always dropped. */
const FORBIDDEN_ACTION_TYPES = new Set([
  'submit',
  'complete',
  'approve',
  'reject',
  'delete',
  'finalize',
  'publish',
  'send',
  'activate',
  'create',
  'update',
  'write',
  'draft_leave',
  'draft_checkin',
  'draft_task',
])

const WEEKLY_KEYS = ['completed', 'nextWeek', 'blockers', 'hoursWorked', 'visibility'] as const
const TASK_KEYS = [
  'title',
  'description',
  'status',
  'priority',
  'category',
  'dueDate',
  'blockers',
  'estimatedHours',
] as const
const LEAVE_KEYS = ['type', 'startDate', 'endDate', 'reason'] as const
const SHOUTOUT_KEYS = ['message', 'receiverId', 'tag'] as const
const MEMO_KEYS = ['title', 'body', 'audience', 'priority', 'memoCategory'] as const
const EVENT_KEYS = ['title', 'description', 'date', 'startTime', 'endTime', 'location', 'audience'] as const
const MY_INFO_KEYS = [
  'preferredName',
  'legalName',
  'personalEmail',
  'phone',
  'workLocation',
  'addressCountry',
  'dateOfBirth',
  'pronouns',
  'linkedinUrl',
  'bio',
  'skills',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelationship',
  'nextOfKinNotes',
] as const

const KEYS_BY_KIND: Record<AvaDraftKind, readonly string[]> = {
  weekly_update: WEEKLY_KEYS,
  task: TASK_KEYS,
  leave: LEAVE_KEYS,
  shoutout: SHOUTOUT_KEYS,
  memo: MEMO_KEYS,
  event: EVENT_KEYS,
  my_info: MY_INFO_KEYS,
}

export interface AvaFormDraft {
  kind: AvaDraftKind
  mode: AvaDraftMode
  fields: Record<string, string>
}

export interface AvaPageDraft {
  kind: AvaDraftKind
  fields: Record<string, string>
}

let pageDraft: AvaPageDraft | null = null

export function setAvaPageDraft(kind: AvaDraftKind, fields: Record<string, string>): void {
  pageDraft = { kind, fields }
}

export function clearAvaPageDraft(kind?: AvaDraftKind): void {
  if (!kind || pageDraft?.kind === kind) pageDraft = null
}

export function getAvaPageDraft(): AvaPageDraft | null {
  return pageDraft
}

export function pathForDraftKind(kind: AvaDraftKind): string {
  return KIND_PATH[kind]
}

export function isAvaDraftKind(v: unknown): v is AvaDraftKind {
  return typeof v === 'string' && (DRAFT_KINDS as readonly string[]).includes(v)
}

function asString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return undefined
}

function pickFields(kind: AvaDraftKind, raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return out
  const rec = raw as Record<string, unknown>
  for (const key of KEYS_BY_KIND[kind]) {
    const val = asString(rec[key])
    if (val) out[key] = val
  }
  return sanitizeKindFields(kind, out)
}

function sanitizeKindFields(kind: AvaDraftKind, fields: Record<string, string>): Record<string, string> {
  const next = { ...fields }
  if (kind === 'weekly_update') {
    if (next.visibility && next.visibility !== 'department' && next.visibility !== 'all') {
      delete next.visibility
    }
    if (next.hoursWorked && !/^\d{1,3}(?:\.\d{1,2})?$/.test(next.hoursWorked)) {
      delete next.hoursWorked
    }
  }
  if (kind === 'task') {
    const status = next.status?.toLowerCase()
    if (status === 'done' || status === 'complete' || status === 'completed') {
      next.status = 'todo'
    } else if (status && !['todo', 'in_progress', 'blocked'].includes(status)) {
      delete next.status
    }
    const pri = next.priority?.toLowerCase()
    if (pri && !['high', 'medium', 'low'].includes(pri)) delete next.priority
  }
  if (kind === 'leave') {
    const t = next.type?.toLowerCase()
    if (t === 'annual' || t === 'sick' || t === 'emergency') next.type = t
    else if (next.type) delete next.type
  }
  if (kind === 'memo') {
    const p = next.priority?.toLowerCase()
    if (p === 'info' || p === 'important' || p === 'urgent') next.priority = p
    else if (next.priority) delete next.priority
  }
  return next
}

function guessKind(label: string, path?: string): AvaDraftKind | undefined {
  const t = `${label} ${path ?? ''}`.toLowerCase()
  if (t.includes('check') || t.includes('weekly')) return 'weekly_update'
  if (t.includes('leave') || t.includes('time off')) return 'leave'
  if (t.includes('task') || t.includes('my work')) return 'task'
  if (t.includes('shout')) return 'shoutout'
  if (t.includes('memo') || t.includes('announcement')) return 'memo'
  if (t.includes('event') || t.includes('calendar')) return 'event'
  if (t.includes('my info') || t.includes('profile')) return 'my_info'
  return undefined
}

function guessPathFromLabel(label: string): string | undefined {
  const kind = guessKind(label)
  return kind ? KIND_PATH[kind] : undefined
}

export function sanitizeSuggestedAction(item: unknown): AvaSuggestedAction | null {
  if (!item || typeof item !== 'object') return null
  const a = item as Record<string, unknown>
  const typeRaw = asString(a.type)?.toLowerCase() ?? 'navigate'
  const label = asString(a.label)
  if (!label) return null
  if (FORBIDDEN_ACTION_TYPES.has(typeRaw)) return null

  if (typeRaw === 'insert_draft' || typeRaw === 'insert' || typeRaw === 'refine') {
    const kind = isAvaDraftKind(a.kind) ? a.kind : guessKind(label, asString(a.path))
    if (!kind) return null
    const fields = pickFields(kind, a.fields)
    if (!Object.keys(fields).length) return null
    const mode: AvaDraftMode = typeRaw === 'refine' || asString(a.mode) === 'refine' ? 'refine' : 'insert'
    let path = asString(a.path) || KIND_PATH[kind]
    if (!path.startsWith('/')) path = KIND_PATH[kind]
    return { type: 'insert_draft', label, path, kind, mode, fields }
  }

  if (typeRaw !== 'navigate' && typeRaw !== '') return null
  let path = asString(a.path) || guessPathFromLabel(label)
  if (!path?.startsWith('/')) return null
  return { type: 'navigate', label, path }
}

export function sanitizeSuggestedActions(raw: unknown): AvaSuggestedAction[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: AvaSuggestedAction[] = []
  for (const item of raw) {
    const action = sanitizeSuggestedAction(item)
    if (action) out.push(action)
  }
  return out.length ? out : undefined
}

function storageKey(kind: AvaDraftKind): string {
  return `${AVA_DRAFT_STORAGE_PREFIX}${kind}`
}

export function putAvaDraft(draft: AvaFormDraft): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(draft.kind), JSON.stringify(draft))
  } catch {
    /* quota / private mode */
  }
  window.dispatchEvent(new CustomEvent<AvaFormDraft>(AVA_DRAFT_EVENT, { detail: draft }))
}

export function peekAvaDraft(kind: AvaDraftKind): AvaFormDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(kind))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AvaFormDraft>
    if (!isAvaDraftKind(parsed.kind) || parsed.kind !== kind) return null
    const fields = pickFields(kind, parsed.fields)
    if (!Object.keys(fields).length) return null
    return { kind, mode: parsed.mode === 'refine' ? 'refine' : 'insert', fields }
  } catch {
    return null
  }
}

export function consumeAvaDraft(kind: AvaDraftKind): AvaFormDraft | null {
  const draft = peekAvaDraft(kind)
  if (!draft) return null
  try {
    sessionStorage.removeItem(storageKey(kind))
  } catch {
    /* ignore */
  }
  return draft
}

function writeComposerFromFields(kind: ComposerDraftKind, fields: Record<string, string>): string | null {
  const id = newComposerDraftId('ava')
  const now = new Date().toISOString()
  let payload: ShoutoutDraftPayload | MemoDraftPayload | EventDraftPayload
  let label = 'AVA draft'

  if (kind === 'shoutout') {
    payload = {
      receiverId: fields.receiverId ?? '',
      tag: fields.tag || 'great_work',
      message: fields.message ?? '',
      media: [],
    }
    label = 'AVA shout-out draft'
  } else if (kind === 'memo') {
    const priority =
      fields.priority === 'important' || fields.priority === 'urgent' ? fields.priority : 'info'
    payload = {
      title: fields.title ?? '',
      body: fields.body ?? '',
      audience: fields.audience || 'all',
      priority,
      memoCategory: fields.memoCategory || 'general',
      media: [],
    }
    label = fields.title ? `AVA memo — ${fields.title}` : 'AVA memo draft'
  } else if (kind === 'event') {
    payload = {
      title: fields.title ?? '',
      description: fields.description ?? '',
      date: fields.date ?? '',
      startTime: fields.startTime ?? '',
      endTime: fields.endTime ?? '',
      location: fields.location ?? '',
      audience: fields.audience || 'all',
    }
    label = fields.title ? `AVA event — ${fields.title}` : 'AVA event draft'
  } else {
    return null
  }

  const store = upsertComposerDraft(readComposerDraftsStore(), {
    id,
    kind,
    label,
    updatedAt: now,
    payload,
  })
  writeComposerDraftsStore(store)
  notifyComposerDraftsChanged()
  return id
}

/** Persist an insert_draft (never submits). Returns the action with a review path. */
export function applyInsertDraft(action: AvaInsertDraftAction): AvaInsertDraftAction {
  const draft: AvaFormDraft = { kind: action.kind, mode: action.mode, fields: action.fields }
  putAvaDraft(draft)

  let path = action.path || KIND_PATH[action.kind]
  if (action.kind === 'shoutout' || action.kind === 'memo' || action.kind === 'event') {
    const id = writeComposerFromFields(action.kind, action.fields)
    if (id) {
      const base = KIND_PATH[action.kind]
      path = `${base}?draft=${encodeURIComponent(id)}`
    }
  }

  const reviewLabel =
    action.mode === 'refine'
      ? action.label
      : action.label.toLowerCase().startsWith('review')
        ? action.label
        : `Review ${action.label.replace(/^(insert|draft|add)\s+/i, '') || 'draft'}`

  return { ...action, path, label: reviewLabel }
}

export function applyAvaSuggestedActions(actions: AvaSuggestedAction[] | undefined): AvaSuggestedAction[] | undefined {
  if (!actions?.length) return undefined
  return actions.map((a) => (a.type === 'insert_draft' ? applyInsertDraft(a) : a))
}
