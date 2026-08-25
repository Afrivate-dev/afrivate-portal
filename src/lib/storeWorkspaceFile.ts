import { isSupabaseAuthEnabled } from '@/lib/authMode'
import {
  deleteLocalPortalFile,
  getLocalPortalFileBlobUrl,
  isLocalPortalPath,
  saveLocalPortalFile,
} from '@/lib/localPortalFiles'
import { supabase } from '@/lib/supabase'
import { getPortalFileBlobUrl, uploadPortalFile } from '@/lib/supabase/fileStorage'

type WorkspaceFolder = 'documents' | 'leave' | 'avatars' | 'media'

export async function storeWorkspaceFile(
  file: File,
  folder: WorkspaceFolder,
  userId: string,
): Promise<{ path: string; sizeLabel: string } | { error: string }> {
  if (isSupabaseAuthEnabled() && supabase) {
    return uploadPortalFile(supabase, folder, file, userId)
  }
  return saveLocalPortalFile(folder, file, userId)
}

export async function resolveWorkspaceFilePreview(
  path: string,
  filenameHint?: string,
): Promise<{ url: string; mimeType?: string; revoke: () => void } | { error: string } | null> {
  if (!path) return { error: 'No file is attached to this record.' }
  if (isLocalPortalPath(path)) {
    const local = await getLocalPortalFileBlobUrl(path)
    if (!local) return { error: 'The file is no longer on this device. Upload it again.' }
    return local
  }
  if (!supabase) {
    return { error: 'Connect the portal to open stored files.' }
  }
  const remote = await getPortalFileBlobUrl(supabase, path, filenameHint)
  if (!remote) {
    return { error: 'Could not open this file. Check your connection and try again.' }
  }
  return remote
}

export async function removeWorkspaceFile(path?: string | null): Promise<void> {
  if (!path) return
  if (isLocalPortalPath(path)) {
    await deleteLocalPortalFile(path)
  }
}
