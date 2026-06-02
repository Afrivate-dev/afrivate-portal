/**
 * Notion-inspired page editor: left gutter + / command palette + minimal chrome.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  CheckSquare,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Megaphone,
  Minus,
  MoreHorizontal,
  Plus,
  Quote,
  Share2,
  Trash2,
  Type,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { NoteSavePatch } from '@/context/CollabContext'
import { useData } from '@/context/DataContext'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn, fmtShortDate, isAdmin } from '@/utils/helpers'
import { pages } from '@/content/copy'
import type { NoteBlock, NoteBlockType, PresencePeer, WorkspaceNote } from '@/types'
import { blocksToPlain, newNoteBlock, noteBlockAsType, NOTE_BLOCK_LABELS } from '@/utils/noteModel'

const N = pages.notes

const PAGE_ICON_EMOJIS = [
  '📄', '📝', '✨', '🎯', '🚀', '💡', '📌', '🗂️', '📊', '🧩', '🔧', '💬',
  '📅', '⭐', '❤️', '✅', '⚠️', '📎', '🔗', '👋', '🙌', '🎉', '🧠', '🛠️', '📣',
]

type SlashItem = {
  type: NoteBlockType
  label: string
  desc: string
  aliases: string[]
  Icon: typeof Type
}

const SLASH_ITEMS: SlashItem[] = [
  { type: 'paragraph', label: 'Text', desc: 'Plain paragraph', aliases: ['text', 'p'], Icon: Type },
  { type: 'heading1', label: 'Heading 1', desc: 'Big section title', aliases: ['h1', 'title'], Icon: Heading1 },
  { type: 'heading2', label: 'Heading 2', desc: 'Medium title', aliases: ['h2', 'subtitle'], Icon: Heading2 },
  { type: 'heading3', label: 'Heading 3', desc: 'Small title', aliases: ['h3'], Icon: Heading3 },
  { type: 'bullet', label: 'Bulleted list', desc: 'Simple bulleted list', aliases: ['bullet', 'ul'], Icon: List },
  { type: 'numbered', label: 'Numbered list', desc: 'Numbered list', aliases: ['number', 'ol'], Icon: ListOrdered },
  { type: 'todo', label: 'To-do', desc: 'Track tasks', aliases: ['task', 'checkbox'], Icon: CheckSquare },
  { type: 'quote', label: 'Quote', desc: 'Caption', aliases: ['q'], Icon: Quote },
  { type: 'callout', label: 'Callout', desc: 'Highlighted box', aliases: ['note'], Icon: Megaphone },
  { type: 'divider', label: 'Divider', desc: 'Separator line', aliases: ['hr', 'line'], Icon: Minus },
]

function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return SLASH_ITEMS
  return SLASH_ITEMS.filter(
    (i) =>
      i.label.toLowerCase().includes(q) ||
      i.aliases.some((a) => a.includes(q) || q.includes(a)) ||
      String(i.type).includes(q),
  )
}

function slashQueryFromLine(text: string): string | null {
  if (!text.startsWith('/') || text.includes('\n')) return null
  const sp = text.indexOf(' ')
  if (sp === -1) return text.slice(1)
  return text.slice(1, sp)
}

function stripSlashCommand(text: string): string {
  return text.replace(/^\/[^\s]*\s*/, '').replace(/^\//, '')
}

/** Active @mention before the cursor (no spaces inside the segment). */
function mentionMatch(text: string, cursor: number): { start: number; query: string } | null {
  if (cursor < 0) return null
  const before = text.slice(0, cursor)
  const at = before.lastIndexOf('@')
  if (at === -1) return null
  const segment = before.slice(at + 1)
  if (segment.includes('\n')) return null
  if (segment.includes(' ')) return null
  return { start: at, query: segment }
}

function ShareSummaryLine({ note }: { note: WorkspaceNote }) {
  const { teams } = useData()
  const parts: string[] = []
  switch (note.share.scope) {
    case 'private':
      parts.push(N.sharePrivate)
      break
    case 'workspace':
      parts.push(N.shareWorkspace)
      break
    case 'departments':
      parts.push(note.share.departments?.length ? note.share.departments.join(', ') : N.sharePickDept)
      break
    case 'teams':
      parts.push(
        note.share.teamIds
          ?.map((id) => teams.find((t) => t.id === id)?.name ?? id)
          .join(', ') || N.sharePickTeam,
      )
      break
    case 'people':
      parts.push(
        note.share.peopleUserIds?.length
          ? `${note.share.peopleUserIds.length} ${N.sharePeopleCount}`
          : N.sharePickPeople,
      )
      break
    default:
      parts.push(String(note.share.scope))
  }
  if (note.share.linkEnabled) parts.push(N.shareLinkOn)
  if (note.share.inviteEmails?.length) parts.push(`${note.share.inviteEmails.length} ${N.invitedEmails}`)
  return parts.join(' · ')
}

type PaletteState = {
  blockIndex: number
  blockId: string
  mode: 'slash' | 'insertBelow' | 'convert'
  top: number
  left: number
  width: number
  filter: string
  highlight: number
}

type MentionState = {
  blockId: string
  blockIndex: number
  start: number
  /** Caret index (exclusive), end of the @query segment */
  end: number
  top: number
  left: number
  width: number
  query: string
  highlight: number
}

export function NotionNotesEditor({
  note,
  editors,
  onSave,
  onDelete,
  onOpenShare,
}: {
  note: WorkspaceNote
  editors: PresencePeer[]
  onSave: (id: string, patch: NoteSavePatch) => void
  onDelete: () => void
  onOpenShare: () => void
}) {
  const { users: allUsers } = useData()
  const { user } = useAuth()
  const [title, setTitle] = useState(note.title)
  const [iconEmoji, setIconEmoji] = useState(note.iconEmoji ?? '')
  const [blocks, setBlocks] = useState<NoteBlock[]>(note.blocks)
  const [palette, setPalette] = useState<PaletteState | null>(null)
  const [mention, setMention] = useState<MentionState | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiPopoverPos, setEmojiPopoverPos] = useState({ top: 0, left: 0 })
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showRemoteRefresh, setShowRemoteRefresh] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastMergedVersionRef = useRef(note.version)
  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const rootRef = useRef<HTMLDivElement | null>(null)
  const paletteRef = useRef<PaletteState | null>(null)
  const mentionRef = useRef<MentionState | null>(null)
  const iconBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    paletteRef.current = palette
  }, [palette])

  useEffect(() => {
    mentionRef.current = mention
  }, [mention])

  /** Only resync from props when switching pages — not on every autosaved `note.blocks` update. */
  useEffect(() => {
    lastMergedVersionRef.current = note.version
    setTitle(note.title)
    setIconEmoji(note.iconEmoji ?? '')
    setBlocks(note.blocks)
    setPalette(null)
    setMention(null)
    setEmojiOpen(false)
    setShowRemoteRefresh(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remote merge for same id not implemented; avoid closing menus on autosave
  }, [note.id])

  const flush = useCallback(() => {
    const body = blocksToPlain(blocks)
    onSave(note.id, {
      title: title.trim() || N.untitledPlaceholder,
      iconEmoji: iconEmoji.trim() || undefined,
      blocks,
      body,
    })
  }, [note.id, title, iconEmoji, blocks, onSave])

  useEffect(() => {
    if (
      title === note.title &&
      (iconEmoji || undefined) === note.iconEmoji &&
      JSON.stringify(blocks) === JSON.stringify(note.blocks)
    )
      return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      flush()
      timer.current = null
    }, 450)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [title, iconEmoji, blocks, note.title, note.iconEmoji, note.blocks, flush])

  /** Another collaborator saved a newer version — offer to load it without clobbering local edits silently. */
  useEffect(() => {
    if (!user || note.updatedById === user.id) {
      setShowRemoteRefresh(false)
      return
    }
    if (note.version <= lastMergedVersionRef.current) return
    const same = JSON.stringify(note.blocks) === JSON.stringify(blocks)
    if (same) {
      lastMergedVersionRef.current = note.version
      setShowRemoteRefresh(false)
      return
    }
    setShowRemoteRefresh(true)
  }, [note.version, note.updatedById, note.blocks, user, blocks])

  const mergeRemoteNote = useCallback(() => {
    setTitle(note.title)
    setIconEmoji(note.iconEmoji ?? '')
    setBlocks(note.blocks)
    lastMergedVersionRef.current = note.version
    setShowRemoteRefresh(false)
    setPalette(null)
    setMention(null)
  }, [note.title, note.iconEmoji, note.blocks, note.version])

  const focusBlock = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const el = taRefs.current[id]
      el?.focus()
      if (el) {
        el.style.height = 'auto'
        el.style.height = `${Math.max(el.scrollHeight, 28)}px`
      }
    })
  }, [])

  const insertAfter = useCallback(
    (index: number, type: NoteBlockType, initialText = '') => {
      const nb = newNoteBlock(type, initialText)
      setBlocks((prev) => [...prev.slice(0, index + 1), nb, ...prev.slice(index + 1)])
      setPalette(null)
      focusBlock(nb.id)
    },
    [focusBlock],
  )

  const applyPick = useCallback(
    (type: NoteBlockType) => {
      const pal = paletteRef.current
      if (!pal) return
      paletteRef.current = null
      setPalette(null)
      if (pal.mode === 'slash') {
        setBlocks((prev) => {
          const b = prev[pal.blockIndex]
          if (!b || b.id !== pal.blockId) return prev
          const rest = stripSlashCommand(b.text.startsWith('/') ? b.text : `/${b.text}`)
          const nextBlk = noteBlockAsType(b, type)
          return prev.map((blk, idx) =>
            idx === pal.blockIndex ? { ...nextBlk, text: rest } : blk,
          )
        })
        focusBlock(pal.blockId)
      } else if (pal.mode === 'convert') {
        setBlocks((prev) => {
          const b = prev[pal.blockIndex]
          if (!b || b.id !== pal.blockId) return prev
          const nextBlk = noteBlockAsType(b, type)
          return prev.map((blk, idx) => (idx === pal.blockIndex ? nextBlk : blk))
        })
        focusBlock(pal.blockId)
      } else {
        const nb = newNoteBlock(type, '')
        setBlocks((prev) => [...prev.slice(0, pal.blockIndex + 1), nb, ...prev.slice(pal.blockIndex + 1)])
        focusBlock(nb.id)
      }
    },
    [focusBlock],
  )

  const filteredItems = useMemo(
    () => (palette ? filterSlashItems(palette.filter) : []),
    [palette],
  )

  useEffect(() => {
    if (!palette) return
    if (!filterSlashItems(palette.filter).length) setPalette(null)
    // Depend on filter/mode/blockId, not whole palette object, to avoid redundant runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette?.filter, palette?.blockId, palette?.mode])

  const filteredMentionUsers = useMemo(() => {
    if (!mention) return []
    const q = mention.query.trim().toLowerCase()
    return allUsers
      .filter((u) => u.active)
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q),
      )
      .slice(0, 12)
  }, [mention, allUsers])

  const insertMentionPick = useCallback(
    (blockId: string, mentionStart: number, mentionEnd: number, replacement: string) => {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b
          const next = b.text.slice(0, mentionStart) + replacement + b.text.slice(mentionEnd)
          return { ...b, text: next }
        }),
      )
      setMention(null)
      requestAnimationFrame(() => {
        const ta = taRefs.current[blockId]
        if (ta) {
          const pos = mentionStart + replacement.length
          ta.focus()
          ta.setSelectionRange(pos, pos)
          ta.style.height = 'auto'
          ta.style.height = `${Math.max(ta.scrollHeight, 28)}px`
        }
      })
    },
    [],
  )

  useEffect(() => {
    if (!palette) return
    const onKey = (e: KeyboardEvent) => {
      if (mentionRef.current) return
      const pal = paletteRef.current
      if (!pal) return
      const items = filterSlashItems(pal.filter)
      if (!items.length) return

      if (e.key === 'Escape') {
        e.preventDefault()
        setPalette(null)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPalette((p) => {
          if (!p) return p
          const it = filterSlashItems(p.filter)
          if (!it.length) return p
          return { ...p, highlight: (p.highlight + 1) % it.length }
        })
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPalette((p) => {
          if (!p) return p
          const it = filterSlashItems(p.filter)
          if (!it.length) return p
          return {
            ...p,
            highlight: (p.highlight - 1 + it.length) % it.length,
          }
        })
      }
      if (e.key === 'Enter') {
        const p = paletteRef.current
        if (!p) return
        const it = filterSlashItems(p.filter)
        const item = it[p.highlight]
        if (item) {
          e.preventDefault()
          applyPick(item.type)
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [palette, applyPick])

  useEffect(() => {
    if (!mention) return
    const onKey = (e: KeyboardEvent) => {
      const m = mentionRef.current
      if (!m) return
      const users = (() => {
        const q = m.query.trim().toLowerCase()
        return allUsers
          .filter((u) => u.active)
          .filter(
            (u) =>
              !q ||
              u.name.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              u.department.toLowerCase().includes(q),
          )
          .slice(0, 12)
      })()
      if (!users.length && e.key !== 'Escape') return

      if (e.key === 'Escape') {
        e.preventDefault()
        setMention(null)
        return
      }
      if (e.key === 'ArrowDown' && users.length) {
        e.preventDefault()
        setMention((mm) =>
          mm ? { ...mm, highlight: (mm.highlight + 1) % users.length } : mm,
        )
      }
      if (e.key === 'ArrowUp' && users.length) {
        e.preventDefault()
        setMention((mm) =>
          mm
            ? { ...mm, highlight: (mm.highlight - 1 + users.length) % users.length }
            : mm,
        )
      }
      if (e.key === 'Enter' && users.length) {
        const pick = users[m.highlight]
        if (pick) {
          e.preventDefault()
          insertMentionPick(m.blockId, m.start, m.end, pick.name + ' ')
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [mention, allUsers, insertMentionPick])

  useLayoutEffect(() => {
    if (!palette && !mention && !emojiOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      setPalette(null)
      setMention(null)
      setEmojiOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [palette, mention, emojiOpen])

  const resizeTa = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 28)}px`
  }

  const openInsertPalette = (index: number, blockId: string, el: HTMLElement) => {
    setMention(null)
    const r = el.getBoundingClientRect()
    setPalette({
      blockIndex: index,
      blockId,
      mode: 'insertBelow',
      top: r.bottom + 4,
      left: r.left,
      width: Math.min(320, window.innerWidth - 24),
      filter: '',
      highlight: 0,
    })
  }

  const openSlashPalette = (index: number, blockId: string, el: HTMLElement, filter: string) => {
    setMention(null)
    const r = el.getBoundingClientRect()
    setPalette({
      blockIndex: index,
      blockId,
      mode: 'slash',
      top: r.bottom + 4,
      left: r.left,
      width: Math.min(320, window.innerWidth - 24),
      filter,
      highlight: 0,
    })
  }

  const openConvertPalette = (index: number, blockId: string, el: HTMLElement) => {
    setMention(null)
    const r = el.getBoundingClientRect()
    setPalette({
      blockIndex: index,
      blockId,
      mode: 'convert',
      top: r.bottom + 4,
      left: r.left,
      width: Math.min(320, window.innerWidth - 24),
      filter: '',
      highlight: 0,
    })
  }

  const syncMentionFromCaret = (blockId: string, blockIndex: number, el: HTMLTextAreaElement) => {
    const match = mentionMatch(el.value, el.selectionStart)
    if (!match) {
      setMention((m) => (m?.blockId === blockId ? null : m))
      return
    }
    setPalette(null)
    const r = el.getBoundingClientRect()
    const end = el.selectionStart
    setMention((prev) => {
      if (prev?.blockId === blockId) {
        return {
          ...prev,
          start: match.start,
          end,
          query: match.query,
          top: r.bottom + 4,
          left: r.left,
          width: Math.min(320, window.innerWidth - 24),
        }
      }
      return {
        blockId,
        blockIndex,
        start: match.start,
        end,
        query: match.query,
        top: r.bottom + 4,
        left: r.left,
        width: Math.min(320, window.innerWidth - 24),
        highlight: 0,
      }
    })
  }

  const updateBlock = (id: string, patch: Partial<NoteBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  const removeBlock = (id: string, index: number) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((b) => b.id !== id)
      const focusId = index > 0 ? prev[index - 1]?.id : next[0]?.id
      requestAnimationFrame(() => focusId && focusBlock(focusId))
      return next
    })
    setPalette(null)
    setMention(null)
  }

  const reorderBlocks = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return
    setBlocks((prev) => {
      const next = [...prev]
      const [row] = next.splice(from, 1)
      next.splice(to, 0, row)
      return next
    })
  }

  const canManageShare = !!user && (user.id === note.ownerId || isAdmin(user))

  const appendBlock = () => {
    if (blocks.length === 0) {
      const nb = newNoteBlock('paragraph', '')
      setBlocks([nb])
      focusBlock(nb.id)
      return
    }
    insertAfter(blocks.length - 1, 'paragraph', '')
  }

  const paletteSectionLabel =
    palette?.mode === 'convert' ? N.blockMenuTitle : N.slashMenuSection

  return (
    <div ref={rootRef} className="relative min-h-[420px]">
      {showRemoteRefresh ? (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950/40">
          <div>
            <p className="text-sm font-medium text-fg">{N.remoteNoteTitle}</p>
            <p className="mt-1 text-xs text-muted">{N.remoteNoteBody}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={mergeRemoteNote}>
              {N.remoteNoteLoadLatest}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => {
              lastMergedVersionRef.current = note.version
              setShowRemoteRefresh(false)
            }}>
              {N.remoteNoteDismiss}
            </Button>
          </div>
        </div>
      ) : null}
      {palette && filteredItems.length > 0 ? (
        <div
          className="notion-cmd-menu pointer-events-auto fixed z-50 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-xl"
          style={{
            top: palette.top,
            left: palette.left,
            width: palette.width,
            maxHeight: 280,
          }}
          role="listbox"
          aria-label={N.slashMenuLabel}
        >
          <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            {paletteSectionLabel}
          </p>
          <ul className="max-h-[220px] overflow-y-auto scrollbar-thin px-1">
            {filteredItems.map((item, i) => (
              <li key={`${item.type}-${item.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === palette.highlight}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors',
                    i === palette.highlight ? 'bg-accent/15 text-accent' : 'text-fg hover:bg-surface-2',
                  )}
                  onMouseEnter={() => setPalette((p) => (p ? { ...p, highlight: i } : p))}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyPick(item.type)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted">
                    <item.Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-xs text-muted">{item.desc}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mention ? (
        <div
          className="pointer-events-auto fixed z-50 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-xl"
          style={{
            top: mention.top,
            left: mention.left,
            width: mention.width,
            maxHeight: 260,
          }}
          role="listbox"
          aria-label={N.mentionMenuLabel}
        >
          <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            {N.mentionMenuLabel}
          </p>
          <ul className="max-h-[200px] overflow-y-auto scrollbar-thin px-1">
            {filteredMentionUsers.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted">{N.mentionEmpty}</li>
            ) : (
              filteredMentionUsers.map((u, i) => (
                <li key={u.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === mention.highlight}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                      i === mention.highlight ? 'bg-accent/15 text-accent' : 'text-fg hover:bg-surface-2',
                    )}
                    onMouseEnter={() => setMention((m) => (m ? { ...m, highlight: i } : m))}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      insertMentionPick(mention.blockId, mention.start, mention.end, u.name + ' ')
                    }
                  >
                    <Avatar name={u.name} src={u.avatarUrl} size="xs" />
                    <span className="min-w-0 flex-1 font-medium">{u.name}</span>
                    <span className="shrink-0 text-xs text-muted">{u.department}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {emojiOpen ? (
        <div
          className="pointer-events-auto fixed z-50 w-[min(280px,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-2 shadow-xl"
          style={{ top: emojiPopoverPos.top, left: emojiPopoverPos.left }}
        >
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted">
            {N.emojiPickerTitle}
          </p>
          <div className="grid grid-cols-6 gap-1">
            {PAGE_ICON_EMOJIS.map((emo) => (
              <button
                key={emo}
                type="button"
                className="flex h-9 items-center justify-center rounded-md text-lg transition-colors hover:bg-surface-2"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIconEmoji(emo)
                  setEmojiOpen(false)
                }}
              >
                {emo}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {editors.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-surface-2/30 px-3 py-2 text-sm">
          <Users className="h-4 w-4 text-muted" />
          <span className="text-muted">{N.alsoHere}</span>
          <div className="flex flex-wrap gap-2">
            {editors.map((e) => (
              <span key={e.userId} className="inline-flex items-center gap-1.5">
                <Avatar name={e.name} src={e.avatarUrl} size="xs" />
                <span className="font-medium text-fg">{e.name}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-start justify-end gap-1 border-b border-border/40 pb-3">
        <button
          type="button"
          onClick={onOpenShare}
          className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-fg ring-focus"
          title={canManageShare ? N.share : N.shareViewOnly}
        >
          <Share2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger ring-focus"
          title={N.delete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto max-w-[720px] px-1 sm:px-4">
        <div className="mb-2 flex items-start gap-2">
          <button
            ref={iconBtnRef}
            type="button"
            className="group relative mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-4xl leading-none transition-colors hover:bg-surface-2/80"
            title={N.iconLabel}
            onClick={() => {
              const r = iconBtnRef.current?.getBoundingClientRect()
              if (r)
                setEmojiPopoverPos({
                  top: r.bottom + 8,
                  left: Math.min(r.left, window.innerWidth - 300),
                })
              setEmojiOpen((v) => !v)
            }}
          >
            {iconEmoji?.trim() ? (
              iconEmoji.trim()
            ) : (
              <span className="text-2xl text-muted opacity-0 transition-opacity group-hover:opacity-100">＋</span>
            )}
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={flush}
            placeholder={N.untitledPlaceholder}
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-3xl font-bold leading-tight text-fg placeholder:text-muted/50 focus:outline-none focus:ring-0 sm:text-4xl"
            aria-label={N.titleLabel}
          />
        </div>

        <p className="mb-8 text-xs text-muted">
          {N.sharedLabel}: <ShareSummaryLine note={note} /> · {N.footerHint}{' '}
          <span className="text-fg/90">{allUsers.find((u) => u.id === note.updatedById)?.name ?? '—'}</span>
        </p>

        <p className="mb-4 text-sm text-muted">
          {N.slashHint} Type <kbd className="rounded border border-border px-1 text-xs">@</kbd> to mention
          someone.
        </p>

        <div className="space-y-0.5">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className={cn(
                'group relative flex gap-1 rounded-md pr-1 transition-colors hover:bg-surface-2/25',
                dragOverIndex === index && 'ring-1 ring-accent/40',
              )}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverIndex(index)
              }}
              onDragLeave={() => setDragOverIndex((i) => (i === index ? null : i))}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverIndex(null)
                const fromId = e.dataTransfer.getData('text/nf-block-id')
                if (!fromId || fromId === block.id) return
                const fromIdx = blocks.findIndex((b) => b.id === fromId)
                if (fromIdx === -1) return
                reorderBlocks(fromIdx, index)
              }}
            >
              <div
                className={cn(
                  'flex w-8 shrink-0 flex-col items-center gap-0.5 pt-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
                  block.type === 'divider' && 'pt-3',
                )}
              >
                <button
                  type="button"
                  className="cursor-grab rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
                  title={N.gripHint}
                  tabIndex={-1}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/nf-block-id', block.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => setDragOverIndex(null)}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg"
                  title={N.addBlockBelow}
                  onClick={(e) => openInsertPalette(index, block.id, e.currentTarget)}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg"
                  title={N.openBlockMenu}
                  onClick={(e) => openConvertPalette(index, block.id, e.currentTarget)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div
                className={cn(
                  'min-w-0 flex-1 pb-1',
                  block.type === 'quote' &&
                    'rounded-r-lg border-l-4 border-l-accent bg-accent/[0.14] py-2.5 pl-4 pr-3 shadow-sm ring-1 ring-border/60 dark:bg-accent/[0.22] dark:ring-border/50',
                  block.type === 'callout' &&
                    'rounded-lg border border-amber-500/70 bg-amber-50 py-3 pl-3 pr-3 shadow-md ring-1 ring-amber-900/10 dark:border-amber-400/45 dark:bg-amber-950/55 dark:text-amber-100 dark:ring-amber-100/15',
                )}
              >
                {block.type === 'divider' ? (
                  <hr className="my-3 border-border" />
                ) : (
                  <div className="flex gap-2">
                    {block.type === 'quote' ? (
                      <Quote
                        className="mt-2.5 h-5 w-5 shrink-0 text-accent dark:text-accent"
                        aria-hidden
                      />
                    ) : null}
                    {block.type === 'callout' ? (
                      <Megaphone
                        className="mt-2.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
                        aria-hidden
                      />
                    ) : null}
                    {block.type === 'todo' ? (
                      <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1.5">
                        <input
                          type="checkbox"
                          checked={!!block.checked}
                          onChange={(e) => {
                            const checked = e.target.checked
                            updateBlock(block.id, {
                              checked,
                              checkedAt: checked ? new Date().toISOString() : undefined,
                            })
                          }}
                          className="h-4 w-4 rounded border-border"
                          aria-label={block.text ? `${N.todoDoneLabel}: ${block.text}` : N.todoDoneLabel}
                        />
                        {block.checked && block.checkedAt ? (
                          <span className="max-w-[4.5rem] text-center text-[10px] leading-tight text-muted">
                            {N.todoCompletedOn} {fmtShortDate(block.checkedAt)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <textarea
                      ref={(n) => {
                        taRefs.current[block.id] = n
                        resizeTa(n)
                      }}
                      value={block.text}
                      dir="auto"
                      rows={1}
                      onChange={(e) => {
                        const v = e.target.value
                        updateBlock(block.id, { text: v })
                        resizeTa(e.target)
                        const el = e.target
                        const q = slashQueryFromLine(v)
                        const caretAt = el.selectionStart
                        const m = block.type !== 'divider' ? mentionMatch(v, caretAt) : null

                        if (m && block.type !== 'divider') {
                          syncMentionFromCaret(block.id, index, el)
                        } else {
                          setMention((cur) => (cur?.blockId === block.id ? null : cur))
                        }

                        if (block.type !== 'divider' && q !== null && !m) {
                          openSlashPalette(index, block.id, el, q)
                        } else if (
                          palette?.blockId === block.id &&
                          palette.mode === 'slash' &&
                          !v.startsWith('/')
                        ) {
                          setPalette(null)
                        } else if (
                          palette?.blockId === block.id &&
                          palette.mode === 'slash' &&
                          q !== null &&
                          !m
                        ) {
                          setPalette((p) =>
                            p && p.blockId === block.id ? { ...p, filter: q, highlight: 0 } : p,
                          )
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && block.type !== 'divider') {
                          if (mentionRef.current?.blockId === block.id) return
                          const pal = paletteRef.current
                          if (pal && filterSlashItems(pal.filter).length > 0) {
                            e.preventDefault()
                            const items = filterSlashItems(pal.filter)
                            const item = items[pal.highlight]
                            if (item) applyPick(item.type)
                            return
                          }
                          e.preventDefault()
                          if (block.type === 'bullet' || block.type === 'numbered' || block.type === 'quote') {
                            insertAfter(index, block.type, '')
                            return
                          }
                          insertAfter(index, 'paragraph', '')
                          return
                        }
                        if (e.key === 'Backspace' && block.text === '' && blocks.length > 1) {
                          e.preventDefault()
                          removeBlock(block.id, index)
                        }
                      }}
                      onKeyUp={(e) => {
                        if (block.type === 'divider') return
                        const el = e.currentTarget
                        syncMentionFromCaret(block.id, index, el)
                      }}
                      onClick={(e) => {
                        if (block.type === 'divider') return
                        syncMentionFromCaret(block.id, index, e.currentTarget)
                      }}
                      onBlur={flush}
                      placeholder={
                        block.type.startsWith('heading')
                          ? N.headingPh
                          : block.type === 'callout'
                            ? N.calloutPh
                            : N.blockPh
                      }
                      className={cn(
                        'w-full resize-none border-0 bg-transparent py-1.5 text-base leading-relaxed text-fg placeholder:text-muted/45 focus:outline-none focus:ring-0',
                        block.type === 'heading1' && 'pt-1 text-3xl font-bold',
                        block.type === 'heading2' && 'pt-1 text-2xl font-semibold',
                        block.type === 'heading3' && 'pt-1 text-xl font-semibold',
                        block.type === 'bullet' && 'pl-0',
                        block.type === 'numbered' && 'pl-0',
                        block.type === 'todo' && 'pl-0',
                        block.type === 'quote' &&
                          'italic text-fg/90 dark:text-fg/85',
                        block.type === 'callout' && 'font-medium text-fg dark:text-amber-100/95',
                        block.type === 'todo' &&
                          block.checked &&
                          'text-muted line-through decoration-fg/30 decoration-2',
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="w-6 shrink-0 pt-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {blocks.length > 1 ? (
                  <button
                    type="button"
                    className="rounded p-1 text-muted hover:bg-surface-2 hover:text-danger"
                    title={`${N.removeBlock} (${NOTE_BLOCK_LABELS[block.type]})`}
                    onClick={() => removeBlock(block.id, index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pl-9">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted hover:text-fg"
            onClick={appendBlock}
          >
            <Plus className="h-4 w-4" />
            {N.appendBlock}
          </Button>
        </div>
      </div>
    </div>
  )
}
