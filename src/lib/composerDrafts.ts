import type { AnnouncementMedia, AnnouncementPriority } from '@/types'
import { REVIVAL_LAUNCH_MEMOS } from '@/content/revivalLaunchMemos'

export const COMPOSER_DRAFTS_KEY = 'av-composer-drafts'

export type ComposerDraftKind = 'memo' | 'shoutout' | 'event' | 'message'

export type MemoDraftPayload = {
  title: string
  body: string
  audience: string
  priority: AnnouncementPriority
  memoCategory: string
  media: AnnouncementMedia[]
  /** When editing a published memo, keep its id so publish updates instead of creating. */
  editId?: string
}

export type ShoutoutDraftPayload = {
  receiverId: string
  tag: string
  message: string
  media: AnnouncementMedia[]
}

export type EventDraftPayload = {
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  location: string
  audience: string
}

export type MessageDraftPayload = {
  subject: string
  body: string
  channel: 'email' | 'whatsapp'
}

export type ComposerDraftPayload =
  | MemoDraftPayload
  | ShoutoutDraftPayload
  | EventDraftPayload
  | MessageDraftPayload

export interface ComposerDraft {
  id: string
  kind: ComposerDraftKind
  label: string
  updatedAt: string
  /** Stable seed / template id, e.g. revival:staff-revival */
  sourceId?: string
  payload: ComposerDraftPayload
}

export interface ComposerDraftsStore {
  drafts: ComposerDraft[]
  seededRevivalMemos: boolean
}

export const EMPTY_COMPOSER_DRAFTS: ComposerDraftsStore = {
  drafts: [],
  seededRevivalMemos: false,
}

export function newComposerDraftId(prefix = 'draft'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function readComposerDraftsStore(): ComposerDraftsStore {
  if (typeof window === 'undefined') return EMPTY_COMPOSER_DRAFTS
  try {
    const raw = window.localStorage.getItem(COMPOSER_DRAFTS_KEY)
    if (!raw) return EMPTY_COMPOSER_DRAFTS
    const parsed = JSON.parse(raw) as Partial<ComposerDraftsStore>
    return {
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      seededRevivalMemos: Boolean(parsed.seededRevivalMemos),
    }
  } catch {
    return EMPTY_COMPOSER_DRAFTS
  }
}

export function writeComposerDraftsStore(store: ComposerDraftsStore): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COMPOSER_DRAFTS_KEY, JSON.stringify(store))
  } catch {
    try {
      window.dispatchEvent(new CustomEvent('av:storage-full', { detail: { key: COMPOSER_DRAFTS_KEY } }))
    } catch {
      /* ignore */
    }
  }
}

export function draftsOfKind(store: ComposerDraftsStore, kind: ComposerDraftKind): ComposerDraft[] {
  return store.drafts
    .filter((d) => d.kind === kind)
    .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
}

export function findDraftById(store: ComposerDraftsStore, id: string): ComposerDraft | undefined {
  return store.drafts.find((d) => d.id === id)
}

export function findDraftBySourceId(
  store: ComposerDraftsStore,
  sourceId: string,
): ComposerDraft | undefined {
  return store.drafts.find((d) => d.sourceId === sourceId)
}

/** Build seed drafts from revival launch memo templates (idempotent by sourceId). */
export function buildRevivalComposerDrafts(): ComposerDraft[] {
  const now = new Date().toISOString()
  return REVIVAL_LAUNCH_MEMOS.map((memo) => {
    const sourceId = `revival:${memo.id}`
    if (memo.id === 'staff-revival') {
      const payload: MemoDraftPayload = {
        title: memo.subject,
        body: memo.body,
        audience: 'all',
        priority: 'important',
        memoCategory: 'digest',
        media: [],
      }
      return {
        id: newComposerDraftId('revival'),
        kind: 'memo' as const,
        label: memo.label,
        updatedAt: now,
        sourceId,
        payload,
      }
    }
    if (memo.id === 'whatsapp') {
      const payload: MessageDraftPayload = {
        subject: 'Team WhatsApp',
        body: memo.body,
        channel: 'whatsapp',
      }
      return {
        id: newComposerDraftId('revival'),
        kind: 'message' as const,
        label: memo.label,
        updatedAt: now,
        sourceId,
        payload,
      }
    }
    const payload: MessageDraftPayload = {
      subject: memo.subject,
      body: memo.body,
      channel: 'email',
    }
    return {
      id: newComposerDraftId('revival'),
      kind: 'message' as const,
      label: memo.label,
      updatedAt: now,
      sourceId,
      payload,
    }
  })
}

/** Merge revival seeds; restores any missing revival:* templates if deleted. */
export function withRevivalMemosSeeded(store: ComposerDraftsStore): ComposerDraftsStore {
  const seeds = buildRevivalComposerDrafts()
  const existingSources = new Set(
    store.drafts.map((d) => d.sourceId).filter((id): id is string => Boolean(id)),
  )
  const toAdd = seeds.filter((s) => s.sourceId && !existingSources.has(s.sourceId))
  if (toAdd.length === 0) {
    return store.seededRevivalMemos ? store : { ...store, seededRevivalMemos: true }
  }
  return {
    drafts: [...toAdd, ...store.drafts],
    seededRevivalMemos: true,
  }
}

export function mergeComposerStores(
  a: ComposerDraftsStore,
  b: ComposerDraftsStore,
): ComposerDraftsStore {
  const map = new Map<string, ComposerDraft>()
  for (const d of [...a.drafts, ...b.drafts]) {
    const cur = map.get(d.id)
    if (!cur || d.updatedAt >= cur.updatedAt) map.set(d.id, d)
  }
  return {
    drafts: Array.from(map.values()),
    seededRevivalMemos: a.seededRevivalMemos || b.seededRevivalMemos,
  }
}

export function upsertComposerDraft(
  store: ComposerDraftsStore,
  draft: ComposerDraft,
): ComposerDraftsStore {
  const idx = store.drafts.findIndex((d) => d.id === draft.id)
  const drafts =
    idx >= 0
      ? store.drafts.map((d, i) => (i === idx ? draft : d))
      : [draft, ...store.drafts]
  return { ...store, drafts }
}

export function removeComposerDraft(store: ComposerDraftsStore, id: string): ComposerDraftsStore {
  return { ...store, drafts: store.drafts.filter((d) => d.id !== id) }
}

export function isMemoPayload(p: ComposerDraftPayload): p is MemoDraftPayload {
  return 'memoCategory' in p && 'priority' in p && 'body' in p && !('channel' in p)
}

export function isShoutoutPayload(p: ComposerDraftPayload): p is ShoutoutDraftPayload {
  return 'message' in p && 'receiverId' in p && 'tag' in p
}

export function isEventPayload(p: ComposerDraftPayload): p is EventDraftPayload {
  return 'date' in p && 'startTime' in p && 'title' in p && !('body' in p) && !('message' in p)
}

export function isMessagePayload(p: ComposerDraftPayload): p is MessageDraftPayload {
  return 'channel' in p && 'body' in p
}
