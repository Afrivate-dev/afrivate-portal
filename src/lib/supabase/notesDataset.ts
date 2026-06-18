import type { SupabaseClient } from '@supabase/supabase-js'
import type { NoteBlock, NoteShare, WorkspaceNote } from '@/types'
import { normalizeWorkspaceNote } from '@/utils/noteModel'

export function rowToWorkspaceNote(row: Record<string, unknown>): WorkspaceNote {
  const parentRaw = row.parent_id
  return normalizeWorkspaceNote({
    id: String(row.id),
    title: String(row.title ?? 'Untitled note'),
    body: String(row.body ?? ''),
    blocks: row.blocks as NoteBlock[] | undefined,
    parentId:
      parentRaw === null || parentRaw === undefined || parentRaw === ''
        ? null
        : String(parentRaw),
    iconEmoji: row.icon_emoji ? String(row.icon_emoji) : undefined,
    ownerId: String(row.owner_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    updatedById: String(row.updated_by_id),
    version: typeof row.version === 'number' ? row.version : Number(row.version ?? 0),
    share: row.share as NoteShare | undefined,
  })
}

export function noteToRow(note: WorkspaceNote): Record<string, unknown> {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    blocks: note.blocks,
    parent_id: note.parentId,
    icon_emoji: note.iconEmoji ?? null,
    owner_id: note.ownerId,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    updated_by_id: note.updatedById,
    version: note.version,
    share: note.share,
  }
}

export async function fetchWorkspaceNotes(client: SupabaseClient): Promise<WorkspaceNote[]> {
  const { data, error } = await client
    .from('portal_workspace_notes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToWorkspaceNote(r as Record<string, unknown>))
}

export async function fetchWorkspaceNoteById(
  client: SupabaseClient,
  id: string,
): Promise<WorkspaceNote | null> {
  const { data, error } = await client
    .from('portal_workspace_notes')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return rowToWorkspaceNote(data as Record<string, unknown>)
}

export async function upsertWorkspaceNote(
  client: SupabaseClient,
  note: WorkspaceNote,
): Promise<void> {
  const { error } = await client.from('portal_workspace_notes').upsert(noteToRow(note), {
    onConflict: 'id',
  })
  if (error) throw new Error(error.message)
}

export async function deleteWorkspaceNote(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('portal_workspace_notes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
