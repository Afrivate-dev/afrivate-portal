import type { NoteBlock, NoteBlockType, NoteShare, NoteShareScope, User, WorkspaceNote, WorkspaceTeam } from '@/types'
import { uid } from '@/utils/helpers'

const SHARE_SCOPES: NoteShareScope[] = ['private', 'workspace', 'departments', 'teams', 'people']

export function newNoteBlock(type: NoteBlockType = 'paragraph', text = ''): NoteBlock {
  if (type === 'todo') {
    return { id: 'b_' + uid(), type, text, checked: false }
  }
  return { id: 'b_' + uid(), type, text }
}

/** Convert an existing block to another type; preserves meaningful todo / completion state. */
export function noteBlockAsType(blk: NoteBlock, type: NoteBlockType): NoteBlock {
  if (type === 'divider') {
    return { ...blk, type, text: '', checked: undefined, checkedAt: undefined }
  }
  if (type === 'todo') {
    if (blk.type === 'todo') {
      const c = blk.checked ?? false
      return { ...blk, type, checked: c, checkedAt: c ? blk.checkedAt : undefined }
    }
    return { ...blk, type, checked: false, checkedAt: undefined }
  }
  return { ...blk, type, checked: undefined, checkedAt: undefined }
}

export function blocksToPlain(blocks: NoteBlock[]): string {
  return blocks
    .filter((b) => b.type !== 'divider')
    .map((b) => {
      if (b.type === 'todo') return `${b.checked ? '[x]' : '[ ]'} ${b.text}`
      return b.text
    })
    .join('\n')
}

export function legacyBodyToBlocks(body: string): NoteBlock[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return [newNoteBlock('paragraph', '')]
  }
  return lines.map((line) => {
    const todo = line.match(/^\[([ xX])\]\s*(.*)$/)
    if (todo) {
      const b = newNoteBlock('todo', todo[2] ?? '')
      b.checked = todo[1].toLowerCase() === 'x'
      if (b.checked) b.checkedAt = new Date().toISOString()
      return b
    }
    const bullet = line.match(/^[-*]\s+(.*)$/)
    if (bullet) return { ...newNoteBlock('bullet', bullet[1] ?? '') }
    const num = line.match(/^\d+\.\s+(.*)$/)
    if (num) return { ...newNoteBlock('numbered', num[1] ?? '') }
    return newNoteBlock('paragraph', line)
  })
}

function normalizeShare(raw: unknown): NoteShare {
  if (!raw || typeof raw !== 'object') {
    return { scope: 'workspace' }
  }
  const s = raw as NoteShare
  const scope = SHARE_SCOPES.includes(s.scope) ? s.scope : 'workspace'
  return {
    scope,
    departments: Array.isArray(s.departments) ? s.departments.map(String) : undefined,
    teamIds: Array.isArray(s.teamIds) ? s.teamIds.map(String) : undefined,
    peopleUserIds: Array.isArray(s.peopleUserIds) ? s.peopleUserIds.map(String) : undefined,
    inviteEmails: Array.isArray(s.inviteEmails)
      ? s.inviteEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      : undefined,
    linkEnabled: Boolean(s.linkEnabled),
    linkToken: typeof s.linkToken === 'string' && s.linkToken.length > 0 ? s.linkToken : undefined,
  }
}

/** Normalize stored JSON (any version) into the current WorkspaceNote shape. */
export function normalizeWorkspaceNote(raw: Partial<WorkspaceNote> & Record<string, unknown>): WorkspaceNote {
  const ownerId = String(raw.ownerId ?? raw.updatedById ?? 'u_staff')
  const updatedById = String(raw.updatedById ?? ownerId)
  const bodyStr = typeof raw.body === 'string' ? raw.body : ''
  const blocksRaw = raw.blocks
  const blocks: NoteBlock[] = Array.isArray(blocksRaw) && blocksRaw.length > 0
    ? blocksRaw.map((b) => normalizeBlock(b as unknown as Record<string, unknown>))
    : legacyBodyToBlocks(bodyStr)

  const share = normalizeShare(raw.share)

  return {
    id: String(raw.id ?? 'n_unknown'),
    title: typeof raw.title === 'string' ? raw.title : 'Untitled',
    body: blocksToPlain(blocks),
    blocks,
    parentId: raw.parentId === null || raw.parentId === undefined || raw.parentId === ''
      ? null
      : String(raw.parentId),
    iconEmoji: typeof raw.iconEmoji === 'string' ? raw.iconEmoji : undefined,
    ownerId,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    updatedById,
    version: typeof raw.version === 'number' ? raw.version : Date.now(),
    share,
  }
}

function normalizeBlock(b: Record<string, unknown>): NoteBlock {
  const type = typeof b.type === 'string' ? (b.type as NoteBlockType) : 'paragraph'
  const safeType: NoteBlockType = [
    'paragraph',
    'heading1',
    'heading2',
    'heading3',
    'bullet',
    'numbered',
    'todo',
    'divider',
    'quote',
    'callout',
  ].includes(type)
    ? type
    : 'paragraph'
  return {
    id: typeof b.id === 'string' ? b.id : 'b_' + uid(),
    type: safeType,
    text: typeof b.text === 'string' ? b.text : '',
    checked: typeof b.checked === 'boolean' ? b.checked : safeType === 'todo' ? false : undefined,
    checkedAt:
      typeof b.checkedAt === 'string' && b.checkedAt.length > 0
        ? b.checkedAt
        : undefined,
  }
}

export function canUserViewNote(
  user: User,
  note: WorkspaceNote,
  teams: WorkspaceTeam[],
  linkKeyForNote?: string | null,
): boolean {
  if (note.share.linkEnabled && note.share.linkToken && linkKeyForNote === note.share.linkToken) {
    return true
  }
  const emails = note.share.inviteEmails ?? []
  if (emails.length && emails.includes(user.email.trim().toLowerCase())) {
    return true
  }
  switch (note.share.scope) {
    case 'private':
      return user.id === note.ownerId
    case 'workspace':
      return true
    case 'departments': {
      const deps = note.share.departments ?? []
      return deps.length > 0 && deps.includes(user.department)
    }
    case 'teams': {
      const ids = note.share.teamIds ?? []
      if (ids.length === 0) return false
      return teams.some((t) => ids.includes(t.id) && t.memberIds.includes(user.id))
    }
    case 'people': {
      const ids = note.share.peopleUserIds ?? []
      return user.id === note.ownerId || ids.includes(user.id)
    }
    default:
      return true
  }
}

export const NOTE_BLOCK_LABELS: Record<NoteBlockType, string> = {
  paragraph: 'Text',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bullet: 'Bulleted list',
  numbered: 'Numbered list',
  todo: 'To-do',
  divider: 'Divider',
  quote: 'Quote',
  callout: 'Callout',
}
