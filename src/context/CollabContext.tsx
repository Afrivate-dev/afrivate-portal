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
import { supabase } from '@/lib/supabase'
import type { PresencePeer, UserAvailability, WorkspaceActivity, WorkspaceNote } from '@/types'
import {
  blocksToPlain,
  canUserViewNote,
  newNoteBlock,
  normalizeWorkspaceNote,
} from '@/utils/noteModel'
import { uid } from '@/utils/helpers'

const NOTES_KEY_V2 = 'nf-workspace-notes-v2'
const NOTES_KEY_V1 = 'nf-workspace-notes-v1'
const BC_NAME = 'nf-portal-workspace-collab'

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

type NoteBroadcast = { kind: 'upsert'; note: WorkspaceNote } | { kind: 'delete'; id: string; version: number }

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
  const { teams } = useData()
  const [allNotes, setNotes] = useLocalStorage<WorkspaceNote[]>(NOTES_KEY_V2, loadNotesFromStorage)
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
      setNotes((prev) => {
        if (msg.kind === 'delete') {
          return prev
            .filter((n) => n.id !== msg.id)
            .map((n) => (n.parentId === msg.id ? { ...n, parentId: null } : n))
        }
        const incoming = normalizeWorkspaceNote(msg.note as unknown as Record<string, unknown>)
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
    [setNotes],
  )

  const sendNoteBroadcast = useCallback((msg: NoteBroadcast) => {
    if (channelRef.current && subscribedRef.current) {
      void channelRef.current.send({ type: 'broadcast', event: 'note', payload: msg })
    }
    bcRef.current?.postMessage({ t: 'note', msg })
  }, [])

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

      const ch = sb.channel('nf-portal-workspace', {
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
      sendNoteBroadcast({ kind: 'upsert', note })
      return note.id
    },
    [user, setNotes, sendNoteBroadcast],
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
        const next = [...prev]
        next[idx] = note
        queueMicrotask(() => sendNoteBroadcast({ kind: 'upsert', note }))
        return next
      })
    },
    [user, setNotes, sendNoteBroadcast],
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
    },
    [setNotes, sendNoteBroadcast],
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
