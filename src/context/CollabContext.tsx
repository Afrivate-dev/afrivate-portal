/**
 * Workspace collaboration: shared notes + presence.
 *
 * - With VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY: Supabase Realtime (presence + note broadcast).
 * - Without: notes stay in localStorage; BroadcastChannel syncs notes across your own tabs only.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { seedWorkspaceNotes } from '@/data/mockData'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { isSupabaseDataEnabled } from '@/lib/dataMode'
import { supabase } from '@/lib/supabase'
import {
  deleteWorkspaceNote,
  fetchWorkspaceNoteById,
  fetchWorkspaceNoteByLink,
  fetchWorkspaceNotes,
  rowToWorkspaceNote,
  upsertWorkspaceNote,
} from '@/lib/supabase/notesDataset'
import type { PresencePeer, UserAvailability, WorkspaceActivity, WorkspaceNote } from '@/types'
import {
  blocksToPlain,
  canUserViewNote,
  newNoteBlock,
  normalizeWorkspaceNote,
} from '@/utils/noteModel'
import { uid, newlyMentionedUserIds } from '@/utils/helpers'

const NOTES_KEY_V2 = 'av-workspace-notes-v2'
const NOTES_KEY_V1 = 'av-workspace-notes-v1'
const BC_NAME = 'av-portal-workspace-collab'

export type NoteSavePatch = Partial<
  Pick<WorkspaceNote, 'title' | 'body' | 'blocks' | 'iconEmoji' | 'parentId' | 'share'>
>

function loadNotesFromStorage(): WorkspaceNote[] {
  if (typeof window === 'undefined') {
    return seedWorkspaceNotes.map((n) => normalizeWorkspaceNote(n as unknown as Record<string, unknown>))
  }
  try {
    const v2 = window.localStorage.getItem(NOTES_KEY_V2)
    if (v2) {
      const parsed = JSON.parse(v2) as unknown[]
      return parsed.map((row) => normalizeWorkspaceNote(row as Record<string, unknown>))
    }
    const v1 = window.localStorage.getItem(NOTES_KEY_V1)
    if (v1) {
      const parsed = JSON.parse(v1) as unknown[]
      const migrated = parsed.map((row) => normalizeWorkspaceNote(row as Record<string, unknown>))
      window.localStorage.setItem(NOTES_KEY_V2, JSON.stringify(migrated))
      return migrated
    }
  } catch {
    /* ignore */
  }
  return seedWorkspaceNotes.map((n) => normalizeWorkspaceNote(n as unknown as Record<string, unknown>))
}

type NoteBroadcast =
  | { kind: 'upsert'; note: WorkspaceNote }
  | { kind: 'delete'; id: string; version: number }
  | { kind: 'hint'; id: string; version: number }

function presencePayload(
  user: { id: string; name: string; avatarUrl?: string },
  availability: UserAvailability,
  activity: WorkspaceActivity,
) {
  return {
    user_id: user.id,
    name: user.name,
    avatar_url: user.avatarUrl ?? null,
    availability,
    editing_note_id: activity.editingNoteId ?? null,
    viewing_document_id: activity.viewingDocumentId ?? null,
    reading_update_id: activity.readingUpdateId ?? null,
    composing_update: activity.composingUpdate ?? false,
    at: new Date().toISOString(),
  }
}

function parsePresenceState(
  raw: Record<string, unknown[]>,
  selfId: string,
): PresencePeer[] {
  const out: PresencePeer[] = []
  for (const entries of Object.values(raw)) {
    const row = entries[0] as Record<string, unknown> | undefined
    if (!row || String(row.user_id) === selfId) continue
    const av = String(row.availability ?? 'online')
    const availability = (
      ['online', 'away', 'busy', 'focusing'].includes(av) ? av : 'online'
    ) as UserAvailability
    out.push({
      userId: String(row.user_id),
      name: String(row.name ?? 'Teammate'),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
      availability,
      editingNoteId: row.editing_note_id ? String(row.editing_note_id) : null,
      viewingDocumentId: row.viewing_document_id ? String(row.viewing_document_id) : null,
      readingUpdateId: row.reading_update_id ? String(row.reading_update_id) : null,
      composingUpdate: Boolean(row.composing_update),
    })
  }
  return out
}

type Conn = 'disabled' | 'connecting' | 'live' | 'local_tabs' | 'error'

interface CollabContextValue {
  /** Supabase configured and channel subscribed. */
  multiplayerLive: boolean
  /** Broad connection hint for UI. */
  connection: Conn
  myAvailability: UserAvailability
  setMyAvailability: (v: UserAvailability) => void
  activity: WorkspaceActivity
  /** Merge activity fields; pass `undefined` to clear a field. */
  setActivity: (patch: Partial<WorkspaceActivity>) => void
  peers: PresencePeer[]
  /** Notes visible to the signed-in user (sharing rules applied). */
  notes: WorkspaceNote[]
  createNote: (parentId?: string | null) => string
  saveNote: (id: string, patch: NoteSavePatch) => void
  deleteNote: (id: string) => void
  editorsForNote: (noteId: string) => PresencePeer[]
  viewersForDocument: (docId: string) => PresencePeer[]
  readersForUpdate: (updateId: string) => PresencePeer[]
  peersComposingUpdates: () => PresencePeer[]
  /** Register a share-link key from ?open=&key= so visibility updates. */
  registerNoteLinkKey: (noteId: string, key: string | null) => void
}

const CollabContext = createContext<CollabContextValue | null>(null)

export function CollabProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { teams, users, sendInboxNotifications } = useData()
  const supabaseNotesEnabled = isSupabaseDataEnabled()
  const [localNotes, setLocalNotes] = useLocalStorage<WorkspaceNote[]>(NOTES_KEY_V2, loadNotesFromStorage)
  const [dbNotes, setDbNotes] = useState<WorkspaceNote[]>([])
  const allNotes = supabaseNotesEnabled ? dbNotes : localNotes
  const setNotes = supabaseNotesEnabled ? setDbNotes : setLocalNotes
  const [myAvailability, setMyAvailability] = useState<UserAvailability>('online')
  const [activity, setActivityState] = useState<WorkspaceActivity>({})
  const [peers, setPeers] = useState<PresencePeer[]>([])
  const [supabaseRealtime, setSupabaseRealtime] = useState<'off' | 'connecting' | 'live' | 'error'>(
    'off',
  )

  const connection: Conn = useMemo(() => {
    if (!user) return 'disabled'
    if (!supabase) return 'local_tabs'
    if (supabaseRealtime === 'live') return 'live'
    if (supabaseRealtime === 'error') return 'error'
    return 'connecting'
  }, [user, supabaseRealtime])

  const multiplayerLive = connection === 'live'

  const [linkKeys, setLinkKeys] = useState<Record<string, string>>({})

  const registerNoteLinkKey = useCallback((noteId: string, key: string | null) => {
    setLinkKeys((prev) => {
      const next = { ...prev }
      if (key === null || key === '') delete next[noteId]
      else next[noteId] = key
      return next
    })
  }, [])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const bcRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (!user) {
      setPeers([])
      setSupabaseRealtime('off')
    }
  }, [user])

  const applyRemoteNote = useCallback(
    (msg: NoteBroadcast) => {
      if (!user) return

      if (msg.kind === 'hint') {
        if (!supabaseNotesEnabled || !supabase) return
        const linkToken = linkKeys[msg.id] ?? null
        const fetcher = linkToken
          ? fetchWorkspaceNoteByLink(supabase, msg.id, linkToken)
          : fetchWorkspaceNoteById(supabase, msg.id)
        void fetcher.then((incoming) => {
          if (!incoming || !user) return
          if (!canUserViewNote(user, incoming, teams, linkKeys[incoming.id] ?? null)) return
          setNotes((prev) => {
            const idx = prev.findIndex((n) => n.id === incoming.id)
            if (idx === -1) {
              return [incoming, ...prev].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            }
            if (incoming.version < prev[idx].version) return prev
            const next = [...prev]
            next[idx] = incoming
            return next
          })
        })
        return
      }

      setNotes((prev) => {
        if (msg.kind === 'delete') {
          return prev
            .filter((n) => n.id !== msg.id)
            .map((n) => (n.parentId === msg.id ? { ...n, parentId: null } : n))
        }
        const incoming = normalizeWorkspaceNote(msg.note as unknown as Record<string, unknown>)
        if (!canUserViewNote(user, incoming, teams, linkKeys[incoming.id] ?? null)) {
          return prev
        }
        const idx = prev.findIndex((n) => n.id === incoming.id)
        if (idx === -1) {
          return [incoming, ...prev].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        }
        const cur = prev[idx]
        if (incoming.version < cur.version) return prev
        const next = [...prev]
        next[idx] = incoming
        return next
      })
    },
    [setNotes, supabaseNotesEnabled, user, teams, linkKeys],
  )

  const sendNoteBroadcast = useCallback((msg: NoteBroadcast) => {
    let payload: NoteBroadcast = msg
    if (msg.kind === 'upsert' && msg.note.share.scope !== 'workspace') {
      payload = { kind: 'hint', id: msg.note.id, version: msg.note.version }
    }
    if (channelRef.current && subscribedRef.current) {
      void channelRef.current.send({ type: 'broadcast', event: 'note', payload })
    }
    bcRef.current?.postMessage({ t: 'note', msg: payload })
  }, [])

  const persistNote = useCallback(
    (note: WorkspaceNote) => {
      if (!supabaseNotesEnabled || !supabase) return
      void upsertWorkspaceNote(supabase, note).catch((e) =>
        console.warn('[collab] note persist:', e instanceof Error ? e.message : e),
      )
    },
    [supabaseNotesEnabled],
  )

  const removePersistedNote = useCallback(
    (id: string) => {
      if (!supabaseNotesEnabled || !supabase) return
      void deleteWorkspaceNote(supabase, id).catch((e) =>
        console.warn('[collab] note delete:', e instanceof Error ? e.message : e),
      )
    },
    [supabaseNotesEnabled],
  )

  /* ------------------------ Load notes from Postgres --------------------- */
  useEffect(() => {
    if (!user || !supabase || !supabaseNotesEnabled) return
    void fetchWorkspaceNotes(supabase)
      .then((rows) => setNotes(rows))
      .catch((e) => console.warn('[collab] notes load:', e instanceof Error ? e.message : e))
  }, [user?.id, supabaseNotesEnabled, setNotes])

  /* ------------------------ Postgres realtime (notes table) -------------- */
  useEffect(() => {
    if (!user || !supabase || !supabaseNotesEnabled) return
    const sb = supabase
    const ch = sb
      .channel('portal-workspace-notes-db')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'portal_workspace_notes' },
        (payload) => {
          if (payload.eventType === 'DELETE' && payload.old && typeof payload.old === 'object') {
            const old = payload.old as Record<string, unknown>
            if (old.id) {
              applyRemoteNote({ kind: 'delete', id: String(old.id), version: Date.now() })
            }
            return
          }
          if (payload.new && typeof payload.new === 'object') {
            const note = rowToWorkspaceNote(payload.new as Record<string, unknown>)
            applyRemoteNote({ kind: 'upsert', note })
          }
        },
      )
      .subscribe()
    return () => {
      void sb.removeChannel(ch)
    }
  }, [user?.id, supabaseNotesEnabled, applyRemoteNote])

  const setActivity = useCallback((patch: Partial<WorkspaceActivity>) => {
    setActivityState((prev) => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(patch) as [keyof WorkspaceActivity, unknown][]) {
        if (v === undefined) delete next[k]
        else next[k] = v as never
      }
      return next
    })
  }, [])

  /* ------------------------ BroadcastChannel (tabs) ------------------------ */
  useEffect(() => {
    if (!user) return
    if (supabase) return
    const bc = new BroadcastChannel(BC_NAME)
    bcRef.current = bc
    bc.onmessage = (ev: MessageEvent<{ t?: string; msg?: NoteBroadcast }>) => {
      if (ev.data?.t === 'note' && ev.data.msg) applyRemoteNote(ev.data.msg)
    }
    return () => {
      bc.close()
      bcRef.current = null
    }
  }, [user, applyRemoteNote])

  /* ------------------------ Supabase Realtime ---------------------------- */
  useEffect(() => {
    if (!user || !supabase) {
      subscribedRef.current = false
      channelRef.current = null
      setSupabaseRealtime('off')
      return
    }

    const sb = supabase

    /** Private channels + JWT (§6) only when using real Supabase Auth — mock login has no session. */
    const usePrivateRealtime = isSupabaseAuthEnabled()

    setSupabaseRealtime('connecting')
    setPeers([])
    subscribedRef.current = false

    let cancelled = false

    const authSub = usePrivateRealtime
      ? sb.auth.onAuthStateChange((_event, sess) => {
          if (sess?.access_token) sb.realtime.setAuth(sess.access_token)
        })
      : null

    void (async () => {
      if (usePrivateRealtime) {
        const {
          data: { session },
        } = await sb.auth.getSession()
        if (cancelled) return
        if (!session?.access_token) {
          channelRef.current = null
          setSupabaseRealtime('error')
          console.warn(
            '[collab] No Supabase session — private Realtime needs VITE_USE_SUPABASE_AUTH=true and a logged-in user.',
          )
          return
        }
        sb.realtime.setAuth(session.access_token)
      }

      if (cancelled) return

      const ch = sb.channel('av-portal-workspace', {
        config: {
          ...(usePrivateRealtime ? { private: true } : {}),
          broadcast: { ack: false },
          presence: { key: user.id },
        },
      })
      channelRef.current = ch

      ch.on<NoteBroadcast>('broadcast', { event: 'note' }, (wr) => {
        const payload = wr.payload
        if (payload) applyRemoteNote(payload)
      })

      const syncPeers = () => {
        const state = ch.presenceState() as Record<string, unknown[]>
        setPeers(parsePresenceState(state, user.id))
      }

      ch.on('presence', { event: 'sync' }, syncPeers)
      ch.on('presence', { event: 'join' }, syncPeers)
      ch.on('presence', { event: 'leave' }, syncPeers)

      ch.subscribe((status, err) => {
        if (cancelled) return
        if (status === 'SUBSCRIBED') {
          subscribedRef.current = true
          setSupabaseRealtime('live')
          syncPeers()
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          subscribedRef.current = false
          setSupabaseRealtime('error')
          console.warn('[collab] Realtime channel error', err)
        }
        if (status === 'CLOSED') {
          subscribedRef.current = false
        }
      })
    })()

    return () => {
      cancelled = true
      subscribedRef.current = false
      authSub?.data.subscription.unsubscribe()
      const ch = channelRef.current
      channelRef.current = null
      if (ch) void sb.removeChannel(ch)
      setPeers([])
      setSupabaseRealtime('off')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once per login
  }, [user?.id, applyRemoteNote])

  useEffect(() => {
    if (!user || !supabase || supabaseRealtime !== 'live' || !channelRef.current) return
    void channelRef.current.track(presencePayload(user, myAvailability, activity))
  }, [user, myAvailability, activity, supabaseRealtime])

  const notes = useMemo(() => {
    if (!user) return []
    return allNotes.filter((n) => canUserViewNote(user, n, teams, linkKeys[n.id] ?? null))
  }, [allNotes, user, teams, linkKeys])

  const createNote = useCallback(
    (parentId: string | null = null) => {
      if (!user) return ''
      const now = new Date().toISOString()
      const v = Date.now()
      const blocks = [newNoteBlock('paragraph', '')]
      const note = normalizeWorkspaceNote({
        id: 'n_' + uid(),
        title: 'Untitled note',
        body: blocksToPlain(blocks),
        blocks,
        parentId: parentId && parentId.length > 0 ? parentId : null,
        ownerId: user.id,
        createdAt: now,
        updatedAt: now,
        updatedById: user.id,
        version: v,
        share: { scope: 'workspace' },
      })
      setNotes((prev) => [note, ...prev])
      persistNote(note)
      sendNoteBroadcast({ kind: 'upsert', note })
      return note.id
    },
    [user, setNotes, sendNoteBroadcast, persistNote],
  )

  const saveNote = useCallback(
    (id: string, patch: NoteSavePatch) => {
      if (!user) return
      const now = new Date().toISOString()
      const v = Date.now()
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === id)
        if (idx === -1) return prev
        const cur = prev[idx]
        const nextBlocks = patch.blocks !== undefined ? patch.blocks : cur.blocks
        const nextBody =
          patch.blocks !== undefined ? blocksToPlain(nextBlocks) : patch.body !== undefined ? patch.body : cur.body
        const note = normalizeWorkspaceNote({
          ...cur,
          ...patch,
          blocks: nextBlocks,
          body: nextBody,
          updatedAt: now,
          updatedById: user.id,
          version: v,
        })
        const oldBody = cur.body
        const next = [...prev]
        next[idx] = note
        queueMicrotask(() => {
          persistNote(note)
          sendNoteBroadcast({ kind: 'upsert', note })
          const mentioned = newlyMentionedUserIds(oldBody, nextBody, users)
          if (mentioned.length) {
            sendInboxNotifications(
              mentioned.map((targetId) => ({
                id: 'inbox_note_' + note.id + '_' + targetId + '_' + v,
                userId: targetId,
                type: 'note_mention' as const,
                title: `${user.name} mentioned you in a note`,
                body: note.title || 'Workspace note',
                link: `/notes?open=${encodeURIComponent(note.id)}`,
                createdAt: now,
                fromUserId: user.id,
                noteId: note.id,
              })),
            )
          }
        })
        return next
      })
    },
    [user, setNotes, sendNoteBroadcast, persistNote, users, sendInboxNotifications],
  )

  const deleteNote = useCallback(
    (id: string) => {
      const v = Date.now()
      setNotes((prev) =>
        prev
          .filter((n) => n.id !== id)
          .map((n) => (n.parentId === id ? { ...n, parentId: null } : n)),
      )
      sendNoteBroadcast({ kind: 'delete', id, version: v })
      removePersistedNote(id)
    },
    [setNotes, sendNoteBroadcast, removePersistedNote],
  )

  const editorsForNote = useCallback(
    (noteId: string) => peers.filter((p) => p.editingNoteId === noteId),
    [peers],
  )

  const viewersForDocument = useCallback(
    (docId: string) => peers.filter((p) => p.viewingDocumentId === docId),
    [peers],
  )

  const readersForUpdate = useCallback(
    (updateId: string) => peers.filter((p) => p.readingUpdateId === updateId),
    [peers],
  )

  const peersComposingUpdates = useCallback(() => peers.filter((p) => p.composingUpdate), [peers])

  const value = useMemo<CollabContextValue>(
    () => ({
      multiplayerLive,
      connection: user ? connection : 'disabled',
      myAvailability,
      setMyAvailability,
      activity,
      setActivity,
      peers,
      notes,
      createNote,
      saveNote,
      deleteNote,
      editorsForNote,
      viewersForDocument,
      readersForUpdate,
      peersComposingUpdates,
      registerNoteLinkKey,
    }),
    [
      multiplayerLive,
      connection,
      user,
      myAvailability,
      activity,
      peers,
      notes,
      createNote,
      saveNote,
      deleteNote,
      editorsForNote,
      viewersForDocument,
      readersForUpdate,
      peersComposingUpdates,
      registerNoteLinkKey,
      setActivity,
    ],
  )

  return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCollab() {
  const ctx = useContext(CollabContext)
  if (!ctx) throw new Error('useCollab must be used inside <CollabProvider>')
  return ctx
}
