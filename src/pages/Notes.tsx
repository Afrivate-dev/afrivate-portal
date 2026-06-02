import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  StickyNote,
  Plus,
  Radio,
  Laptop,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCollab } from '@/context/CollabContext'
import { useData } from '@/context/DataContext'
import { NotionNotesEditor } from '@/components/notes/NotionNotesEditor'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Avatar } from '@/components/ui/Avatar'
import { cn, isAdmin, uid } from '@/utils/helpers'
import { pages } from '@/content/copy'
import type { NoteShare, WorkspaceNote } from '@/types'

const N = pages.notes

function useNoteTree(notes: WorkspaceNote[]) {
  return useMemo(() => {
    const visibleIds = new Set(notes.map((n) => n.id))
    const effectiveParent = (n: WorkspaceNote) =>
      n.parentId && visibleIds.has(n.parentId) ? n.parentId : null
    const byParent = new Map<string | null, WorkspaceNote[]>()
    for (const n of notes) {
      const p = effectiveParent(n)
      if (!byParent.has(p)) byParent.set(p, [])
      byParent.get(p)!.push(n)
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
    return byParent
  }, [notes])
}

function ShareReadOnlyPanel({ note }: { note: WorkspaceNote }) {
  const { users, teams } = useData()
  const [linkCopied, setLinkCopied] = useState(false)
  const s = note.share

  const shareLinkUrl =
    s.linkEnabled && s.linkToken
      ? `${window.location.origin}/notes?open=${encodeURIComponent(note.id)}&key=${encodeURIComponent(s.linkToken)}`
      : ''

  const owner = users.find((u) => u.id === note.ownerId)

  const accessSummary = useMemo(() => {
    switch (s.scope) {
      case 'private':
        return N.sharePrivate
      case 'workspace':
        return N.shareWorkspace
      case 'departments':
        return s.departments?.length ? s.departments.join(', ') : N.sharePickDept
      case 'teams':
        return (
          s.teamIds?.map((id) => teams.find((t) => t.id === id)?.name ?? id).join(', ') || N.sharePickTeam
        )
      case 'people': {
        const names = (s.peopleUserIds ?? []).map((id) => users.find((u) => u.id === id)?.name ?? id)
        return names.length ? names.join(', ') : N.sharePickPeople
      }
      default:
        return String(s.scope)
    }
  }, [s, teams, users])

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted">{N.shareReadOnlyHint}</p>

      <div className="rounded-xl border border-border bg-surface-2/40 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{N.shareWho}</h3>
        <p className="text-sm font-medium text-fg">{accessSummary}</p>
        {owner ? (
          <p className="mt-3 text-xs text-muted">
            <span className="font-medium text-fg/90">{N.sharePageOwner}:</span> {owner.name}
            {owner.email ? ` · ${owner.email}` : ''}
          </p>
        ) : null}
      </div>

      {(s.inviteEmails?.length ?? 0) > 0 ? (
        <div className="rounded-xl border border-border bg-surface-2/40 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {N.shareInvitedEmailsList}
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-fg">
            {(s.inviteEmails ?? []).map((em) => (
              <li key={em}>{em}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-surface-2/40 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{N.shareLinkToPage}</h3>
        {shareLinkUrl ? (
          <>
            <p className="mb-3 text-sm text-muted">{N.shareLinkCopyHelp}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <input
                readOnly
                value={shareLinkUrl}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-xs text-fg"
              />
              <Button
                type="button"
                className="w-full shrink-0 sm:w-auto sm:min-w-[8rem]"
                onClick={() => {
                  void navigator.clipboard.writeText(shareLinkUrl)
                  setLinkCopied(true)
                  window.setTimeout(() => setLinkCopied(false), 2000)
                }}
              >
                {linkCopied ? N.shareLinkCopied : N.shareLinkCopy}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">{N.shareNoLinkActive}</p>
            {owner ? (
              <p className="mt-3 text-sm text-fg">
                <span className="text-muted">{N.sharePageOwner}: </span>
                <span className="font-medium">{owner.name}</span>
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function ShareModal({
  note,
  open,
  onClose,
  onSave,
  canEdit,
}: {
  note: WorkspaceNote | null
  open: boolean
  onClose: () => void
  onSave: (share: NoteShare) => void
  canEdit: boolean
}) {
  const { users, teams } = useData()
  const [draft, setDraft] = useState<NoteShare>({ scope: 'workspace' })
  const [emailInput, setEmailInput] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (!note) return
    setDraft({
      ...note.share,
      departments: [...(note.share.departments ?? [])],
      teamIds: [...(note.share.teamIds ?? [])],
      peopleUserIds: [...(note.share.peopleUserIds ?? [])],
      inviteEmails: [...(note.share.inviteEmails ?? [])],
      linkEnabled: note.share.linkEnabled ?? false,
      linkToken: note.share.linkToken,
    })
    setEmailInput('')
    setLinkCopied(false)
  }, [note])

  const departments = useMemo(() => {
    const set = new Set(users.map((u) => u.department))
    return Array.from(set).sort()
  }, [users])

  const toggleDepartment = (name: string) => {
    const cur = draft.departments ?? []
    const next = cur.includes(name) ? cur.filter((d) => d !== name) : [...cur, name]
    setDraft({ ...draft, departments: next })
  }

  const toggleTeam = (id: string) => {
    const cur = draft.teamIds ?? []
    const next = cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]
    setDraft({ ...draft, teamIds: next })
  }

  const togglePerson = (id: string) => {
    const cur = draft.peopleUserIds ?? []
    const next = cur.includes(id) ? cur.filter((p) => p !== id) : [...cur, id]
    setDraft({ ...draft, peopleUserIds: next })
  }

  const addInviteEmail = () => {
    const raw = emailInput.trim().toLowerCase()
    if (!raw || !raw.includes('@')) return
    const cur = draft.inviteEmails ?? []
    if (cur.includes(raw)) return
    setDraft({ ...draft, inviteEmails: [...cur, raw] })
    setEmailInput('')
  }

  const removeInviteEmail = (email: string) => {
    setDraft({
      ...draft,
      inviteEmails: (draft.inviteEmails ?? []).filter((e) => e !== email),
    })
  }

  const shareLinkUrl =
    note && draft.linkToken
      ? `${window.location.origin}/notes?open=${encodeURIComponent(note.id)}&key=${encodeURIComponent(draft.linkToken)}`
      : ''

  return (
    <Modal
      open={open && !!note}
      onClose={onClose}
      title={N.shareTitle}
      size="lg"
      footer={
        canEdit ? (
          <>
            <Button type="button" variant="ghost" onClick={onClose}>
              {N.shareCancel}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onSave(draft)
                onClose()
              }}
            >
              {N.shareSave}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={onClose}>
            {N.shareClose}
          </Button>
        )
      }
    >
      {canEdit ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">{N.shareIntro}</p>
        <Select
          label={N.shareWho}
          value={draft.scope}
          disabled={!canEdit}
          onChange={(e) => {
            const scope = e.target.value as NoteShare['scope']
            setDraft((prev) => ({
              ...prev,
              scope,
              departments: scope === 'departments' ? prev.departments ?? [] : undefined,
              teamIds: scope === 'teams' ? prev.teamIds ?? [] : undefined,
              peopleUserIds: scope === 'people' ? prev.peopleUserIds ?? [] : undefined,
            }))
          }}
          options={[
            { value: 'private', label: N.scopePrivate },
            { value: 'workspace', label: N.scopeWorkspace },
            { value: 'departments', label: N.scopeDepartments },
            { value: 'teams', label: N.scopeTeams },
            { value: 'people', label: N.scopePeople },
          ]}
        />

        {draft.scope === 'departments' ? (
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {N.departmentsPick}
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
              {departments.map((d) => (
                <li key={d}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-2">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={draft.departments?.includes(d) ?? false}
                      onChange={() => toggleDepartment(d)}
                      className="rounded border-border"
                    />
                    {d}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.scope === 'teams' ? (
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{N.teamsPick}</p>
            <ul className="space-y-1">
              {teams.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-2">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={draft.teamIds?.includes(t.id) ?? false}
                      onChange={() => toggleTeam(t.id)}
                      className="rounded border-border"
                    />
                    <span className="font-medium text-fg">{t.name}</span>
                    {t.description ? (
                      <span className="text-xs text-muted">— {t.description}</span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.scope === 'people' ? (
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{N.peoplePick}</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto scrollbar-thin">
              {users
                .filter((u) => u.active)
                .map((u) => (
                  <li key={u.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-2">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={draft.peopleUserIds?.includes(u.id) ?? false}
                        onChange={() => togglePerson(u.id)}
                        className="rounded border-border"
                      />
                      <Avatar name={u.name} src={u.avatarUrl} size="xs" />
                      <span>{u.name}</span>
                      <span className="text-xs text-muted">{u.department}</span>
                    </label>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-lg border border-border bg-surface-2/40 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{N.shareInviteEmails}</p>
          <p className="mb-3 text-xs text-muted">{N.shareInviteEmailsHint}</p>
          <div className="flex flex-wrap gap-2">
            {(draft.inviteEmails ?? []).map((em) => (
              <span
                key={em}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs"
              >
                {em}
                <button
                  type="button"
                  disabled={!canEdit}
                  className="rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent"
                  aria-label={`Remove ${em}`}
                  onClick={() => removeInviteEmail(em)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="email"
              disabled={!canEdit}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addInviteEmail()
                }
              }}
              placeholder={N.shareInvitePlaceholder}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
            <Button type="button" variant="secondary" size="sm" disabled={!canEdit} onClick={addInviteEmail}>
              {N.shareInviteAdd}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-2/40 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{N.shareLinkSection}</p>
          <p className="mb-3 text-xs text-muted">{N.shareLinkHelp}</p>
          <label className={cn('flex items-center gap-2 text-sm', canEdit && 'cursor-pointer')}>
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={!!draft.linkEnabled}
              onChange={(e) => {
                const on = e.target.checked
                setDraft((prev) => ({
                  ...prev,
                  linkEnabled: on,
                  linkToken: on ? prev.linkToken ?? `lnk_${uid()}${uid()}` : prev.linkToken,
                }))
              }}
              className="rounded border-border"
            />
            {draft.linkEnabled ? N.shareLinkOn : N.shareLinkOff}
          </label>
          {draft.linkEnabled && draft.linkToken ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                readOnly
                value={shareLinkUrl}
                className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs"
              />
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(shareLinkUrl)
                    setLinkCopied(true)
                    window.setTimeout(() => setLinkCopied(false), 2000)
                  }}
                >
                  {linkCopied ? N.shareLinkCopied : N.shareLinkCopy}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      linkToken: `lnk_${uid()}${uid()}`,
                    }))
                  }
                >
                  {N.shareLinkRegenerate}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">{N.shareNoLinkActive}</p>
          )}
        </div>
      </div>
      ) : note ? (
        <ShareReadOnlyPanel note={note} />
      ) : null}
    </Modal>
  )
}

function NoteTreeRows({
  parentId,
  depth,
  byParent,
  activeId,
  onSelect,
  onAddChild,
}: {
  parentId: string | null
  depth: number
  byParent: Map<string | null, WorkspaceNote[]>
  activeId: string | null
  onSelect: (id: string) => void
  onAddChild: (parentId: string) => void
}) {
  const items = byParent.get(parentId) ?? []
  return (
    <>
      {items.map((n) => (
        <li key={n.id} className="list-none">
          <div className="group flex items-stretch gap-0.5" style={{ paddingLeft: depth * 12 }}>
            <button
              type="button"
              onClick={() => onSelect(n.id)}
              className={cn(
                'mb-0.5 flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug transition-colors ring-focus',
                n.id === activeId
                  ? 'bg-surface-2 font-medium text-fg shadow-sm'
                  : 'text-fg/80 hover:bg-surface-2/50',
              )}
            >
              <span className="shrink-0 text-[15px] leading-none opacity-90">
                {n.iconEmoji?.trim() ? n.iconEmoji : <FileText className="h-[15px] w-[15px] text-muted" />}
              </span>
              <span className="line-clamp-2 min-w-0">{n.title || N.untitledPlaceholder}</span>
            </button>
            <button
              type="button"
              title={N.subPage}
              className="mb-0.5 shrink-0 self-start rounded p-1.5 text-muted opacity-0 transition-opacity hover:bg-surface-2 hover:text-fg group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(n.id)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="list-none">
            <NoteTreeRows
              parentId={n.id}
              depth={depth + 1}
              byParent={byParent}
              activeId={activeId}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          </ul>
        </li>
      ))}
    </>
  )
}

export function NotesPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const {
    notes,
    createNote,
    saveNote,
    deleteNote,
    setActivity,
    editorsForNote,
    multiplayerLive,
    connection,
    registerNoteLinkKey,
  } = useCollab()

  const byParent = useNoteTree(notes)
  const roots = useMemo(() => byParent.get(null) ?? [], [byParent])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shareForId, setShareForId] = useState<string | null>(null)

  const openFromUrl = searchParams.get('open')
  const keyFromUrl = searchParams.get('key')

  useEffect(() => {
    if (!openFromUrl || !keyFromUrl) return
    registerNoteLinkKey(openFromUrl, keyFromUrl)
    return () => registerNoteLinkKey(openFromUrl, null)
  }, [openFromUrl, keyFromUrl, registerNoteLinkKey])

  useEffect(() => {
    if (!openFromUrl) return
    if (notes.some((n) => n.id === openFromUrl)) setSelectedId(openFromUrl)
  }, [openFromUrl, notes])
  const shareNote = useMemo(
    () => (shareForId ? notes.find((n) => n.id === shareForId) ?? null : null),
    [notes, shareForId],
  )

  const sortedFlat = useMemo(() => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [notes])

  const activeId = useMemo(() => {
    if (selectedId && notes.some((n) => n.id === selectedId)) return selectedId
    return roots[0]?.id ?? sortedFlat[0]?.id ?? null
  }, [notes, selectedId, roots, sortedFlat])

  useEffect(() => {
    if (!activeId) {
      setActivity({ editingNoteId: undefined })
      return
    }
    setActivity({ editingNoteId: activeId })
    return () => setActivity({ editingNoteId: undefined })
  }, [activeId, setActivity])

  const selected = activeId ? notes.find((n) => n.id === activeId) ?? null : null
  const editors = activeId ? editorsForNote(activeId) : []

  const openShareFor = (note: WorkspaceNote) => {
    setShareForId(note.id)
  }

  if (!user) return null

  const connLabel =
    connection === 'live'
      ? N.statusLive
      : connection === 'connecting'
        ? N.statusConnecting
        : connection === 'local_tabs'
          ? N.statusLocalTabs
          : connection === 'error'
            ? N.statusError
            : N.statusSolo

  return (
    <div className="space-y-6">
      <PageHeader
        title={N.title}
        description={N.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={multiplayerLive ? 'success' : 'muted'} className="gap-1">
              {multiplayerLive ? <Radio className="h-3 w-3" /> : <Laptop className="h-3 w-3" />}
              {connLabel}
            </Badge>
            <Button
              type="button"
              onClick={() => {
                const id = createNote(null)
                setSelectedId(id)
              }}
            >
              <Plus className="h-4 w-4" />
              {N.newNote}
            </Button>
          </div>
        }
      />

      {!multiplayerLive && connection !== 'local_tabs' ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          {N.liveSyncHint}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,280px)_1fr] lg:items-start">
        <aside className="overflow-hidden rounded-xl border border-border/60 bg-surface-2/20 shadow-sm lg:sticky lg:top-20">
          <div className="border-b border-border/50 px-3 py-2.5">
            <p className="text-xs font-medium text-muted">{N.allNotes}</p>
          </div>
          <ul className="max-h-[60vh] list-none overflow-y-auto p-1.5 scrollbar-thin lg:max-h-[calc(100vh-200px)]">
            {roots.length === 0 ? (
              <li className="px-2 py-6 text-center text-xs text-muted">{N.emptyList}</li>
            ) : (
              <NoteTreeRows
                parentId={null}
                depth={0}
                byParent={byParent}
                activeId={activeId}
                onSelect={setSelectedId}
                onAddChild={(parentId) => {
                  const id = createNote(parentId)
                  setSelectedId(id)
                }}
              />
            )}
          </ul>
        </aside>

        <div className="min-h-[min(72vh,760px)] rounded-xl border border-border/60 bg-surface shadow-sm">
          <div className="px-4 py-6 sm:px-10 sm:py-8">
            {!selected ? (
              <EmptyState
                icon={StickyNote}
                title={N.emptyTitle}
                description={N.emptyBody}
                action={
                  <Button
                    type="button"
                    onClick={() => {
                      const id = createNote(null)
                      setSelectedId(id)
                    }}
                  >
                    <Plus className="h-4 w-4" /> {N.newNote}
                  </Button>
                }
              />
            ) : (
              <NotionNotesEditor
                key={selected.id}
                note={selected}
                editors={editors}
                onSave={saveNote}
                onDelete={() => {
                  if (window.confirm(N.deleteConfirm)) {
                    deleteNote(selected.id)
                    setSelectedId(sortedFlat.find((n) => n.id !== selected.id)?.id ?? null)
                  }
                }}
                onOpenShare={() => openShareFor(selected)}
              />
            )}
          </div>
        </div>
      </div>

      <ShareModal
        note={shareNote}
        open={!!shareForId}
        canEdit={!!user && !!shareNote && (user.id === shareNote.ownerId || isAdmin(user))}
        onClose={() => setShareForId(null)}
        onSave={(share) => {
          if (shareForId) saveNote(shareForId, { share })
        }}
      />
    </div>
  )
}
