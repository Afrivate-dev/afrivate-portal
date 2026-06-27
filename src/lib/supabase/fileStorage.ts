import type { SupabaseClient } from '@supabase/supabase-js'

export const PORTAL_FILES_BUCKET = 'portal-files'

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 180)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Upload a file to portal storage. Returns storage path or null on failure. */
export async function uploadPortalFile(
  client: SupabaseClient,
  folder: 'documents' | 'leave' | 'avatars' | 'media',
  file: File,
  userId: string,
): Promise<{ path: string; sizeLabel: string } | { error: string }> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const path = `${folder}/${userId}/${Date.now()}-${sanitizeFileName(file.name || `file.${ext}`)}`

  const { error } = await client.storage.from(PORTAL_FILES_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })

  if (error) {
    if (error.message.toLowerCase().includes('bucket') || error.message.includes('404')) {
      return { error: 'File storage is not set up yet. Run the latest database migration.' }
    }
    return { error: error.message }
  }

  return { path, sizeLabel: formatFileSize(file.size) }
}

/** Signed download URL (1 hour). */
export async function getPortalFileDownloadUrl(
  client: SupabaseClient,
  path: string,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(PORTAL_FILES_BUCKET)
    .createSignedUrl(path, 3600)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
