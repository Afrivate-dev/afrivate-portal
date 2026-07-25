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
  folder: 'documents' | 'leave' | 'avatars' | 'media' | 'ats',
  file: File,
  userId: string,
): Promise<{ path: string; sizeLabel: string } | { error: string }> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const path = `${folder}/${userId}/${Date.now()}-${sanitizeFileName(file.name || `file.${ext}`)}`

  const contentType = file.type || guessMimeFromName(file.name)

  const { error } = await client.storage.from(PORTAL_FILES_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: contentType || undefined,
  })

  if (error) {
    if (error.message.toLowerCase().includes('bucket') || error.message.includes('404')) {
      return { error: 'File storage is not set up yet. Run the latest database migration.' }
    }
    return { error: error.message }
  }

  return { path, sizeLabel: formatFileSize(file.size) }
}

/** Upload a Gmail ATS attachment (bytes) into portal-files/ats/{userId}/… */
export async function uploadAtsAttachmentBytes(
  client: SupabaseClient,
  userId: string,
  messageKey: string,
  filename: string,
  bytes: ArrayBuffer,
  mimeType?: string,
): Promise<{ path: string; size: number } | { error: string }> {
  if (!userId) return { error: 'Sign in again to upload CV files.' }
  const safeUser = sanitizeFileName(userId)
  const safeKey = sanitizeFileName(messageKey || 'msg').slice(0, 80)
  const safeName = sanitizeFileName(filename || 'attachment.bin')
  // Path must be ats/{auth.uid()}/… for storage RLS
  const path = `ats/${safeUser}/${safeKey}-${Date.now()}-${safeName}`
  const type = mimeType || guessMimeFromName(filename) || 'application/octet-stream'
  const blob = new Blob([bytes], { type })
  const { error } = await client.storage.from(PORTAL_FILES_BUCKET).upload(path, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: type,
  })
  if (error) {
    if (error.message.toLowerCase().includes('bucket') || error.message.includes('404')) {
      return { error: 'File storage is not set up yet. Run the latest database migration.' }
    }
    return { error: error.message }
  }
  return { path, size: bytes.byteLength }
}

function guessMimeFromName(name: string): string | undefined {
  const lower = name.toLowerCase()
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4'
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.mov')) return 'video/quicktime'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html'
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (lower.endsWith('.doc')) return 'application/msword'
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (lower.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  }
  if (lower.endsWith('.ppt')) return 'application/vnd.ms-powerpoint'
  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv')) return 'text/plain'
  if (lower.endsWith('.zip')) return 'application/zip'
  return undefined
}

/** Signed URL for inline playback (not forced download). */
export async function getPortalFileSignedUrl(
  client: SupabaseClient,
  path: string,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(PORTAL_FILES_BUCKET)
    .createSignedUrl(path, 3600, { download: false })
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/** @deprecated use getPortalFileSignedUrl */
export async function getPortalFileDownloadUrl(
  client: SupabaseClient,
  path: string,
): Promise<string | null> {
  return getPortalFileSignedUrl(client, path)
}

/** Authenticated download — reliable fallback when signed streaming fails in <video>. */
export async function getPortalFileBlobUrl(
  client: SupabaseClient,
  path: string,
): Promise<string | null> {
  const { data, error } = await client.storage.from(PORTAL_FILES_BUCKET).download(path)
  if (error || !data) return null
  return URL.createObjectURL(data)
}
