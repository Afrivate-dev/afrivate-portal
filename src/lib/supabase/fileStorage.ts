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

/** Upload a tiny probe object to verify ATS storage RLS before a long sync. */
export async function probeAtsStorageAccess(
  client: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  const { data: authData } = await client.auth.getUser()
  const uid = authData.user?.id || userId
  if (!uid) return { error: 'Sign in again to upload CV files.' }
  const path = `ats/${uid}/probe-${Date.now()}.txt`
  const { error } = await client.storage.from(PORTAL_FILES_BUCKET).upload(path, new Blob(['ok']), {
    contentType: 'text/plain',
    upsert: false,
  })
  if (error) {
    if (/row-level security|policy/i.test(error.message)) {
      return {
        error:
          'Storage blocked by security policy. Run supabase/migrations/20260726_ats_attachments_admin_fix.sql in the SQL Editor, then Sync again.',
      }
    }
    if (error.message.toLowerCase().includes('bucket') || error.message.includes('404')) {
      return { error: 'File storage bucket is not set up. Run the latest database migration.' }
    }
    return { error: error.message }
  }
  await client.storage.from(PORTAL_FILES_BUCKET).remove([path])
  return { ok: true }
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
  // Prefer the live auth uid so storage RLS (folder[2] = auth.uid()) always matches
  const { data: authData } = await client.auth.getUser()
  const uid = authData.user?.id || userId
  if (!uid) return { error: 'Sign in again to upload CV files.' }
  if (!bytes || bytes.byteLength === 0) return { error: `Empty file: ${filename}` }

  const safeUser = uid // keep UUID intact — do not strip hyphens
  const safeKey = sanitizeFileName(messageKey || 'msg').slice(0, 80)
  const safeName = sanitizeFileName(filename || 'attachment.bin')
  const path = `ats/${safeUser}/${safeKey}-${Date.now()}-${safeName}`
  const type = mimeType || guessMimeFromName(filename) || 'application/octet-stream'
  const blob = new Blob([bytes], { type })
  // upsert:false — no UPDATE policy required on storage.objects
  const { error } = await client.storage.from(PORTAL_FILES_BUCKET).upload(path, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: type,
  })
  if (error) {
    if (error.message.toLowerCase().includes('bucket') || error.message.includes('404')) {
      return { error: 'File storage is not set up yet. Run the latest database migration.' }
    }
    if (/row-level security|policy/i.test(error.message)) {
      return {
        error:
          'Storage blocked by security policy. Run supabase/migrations/20260726_ats_attachments_admin_fix.sql in the SQL Editor.',
      }
    }
    return { error: error.message }
  }
  return { path, size: bytes.byteLength }
}

/** Authenticated download with correct MIME for preview/download. */
export async function getPortalFileBlobUrl(
  client: SupabaseClient,
  path: string,
  filenameHint?: string,
): Promise<{ url: string; mimeType: string; revoke: () => void } | null> {
  const { data, error } = await client.storage.from(PORTAL_FILES_BUCKET).download(path)
  if (error || !data) return null
  const mime =
    (data.type && data.type !== 'application/octet-stream' ? data.type : undefined) ||
    guessMimeFromName(filenameHint || path) ||
    data.type ||
    'application/octet-stream'
  const blob = data.type === mime ? data : new Blob([await data.arrayBuffer()], { type: mime })
  const url = URL.createObjectURL(blob)
  return {
    url,
    mimeType: mime,
    revoke: () => URL.revokeObjectURL(url),
  }
}

/**
 * Trigger a real file download that works on mobile (blob + temporary <a download>).
 * Prefer this over relying on the HTML download attribute alone.
 */
export async function downloadPortalFile(
  client: SupabaseClient,
  path: string,
  filename: string,
): Promise<{ ok: true } | { error: string }> {
  if (!path) return { error: 'File was not saved. Sync Gmail again.' }
  const resolved = await getPortalFileBlobUrl(client, path, filename)
  if (!resolved) {
    const signed = await getPortalFileSignedUrl(client, path)
    if (!signed) return { error: 'Could not download this file. Check storage permissions.' }
    const a = document.createElement('a')
    a.href = signed
    a.download = filename
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
    return { ok: true }
  }
  const a = document.createElement('a')
  a.href = resolved.url
  a.download = filename || 'attachment'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Keep blob alive briefly so the browser can finish the download
  window.setTimeout(resolved.revoke, 60_000)
  return { ok: true }
}

/** Prefer a blob URL for inline preview (signed URLs often fail in PDF iframes). */
export async function resolvePortalFilePreviewUrl(
  client: SupabaseClient,
  path: string,
  filenameHint?: string,
): Promise<{ url: string; mimeType?: string; revoke?: () => void } | null> {
  if (!path) return null
  const blobUrl = await getPortalFileBlobUrl(client, path, filenameHint)
  if (blobUrl) {
    return { url: blobUrl.url, mimeType: blobUrl.mimeType, revoke: blobUrl.revoke }
  }
  const signed = await getPortalFileSignedUrl(client, path)
  if (!signed) return null
  return { url: signed, mimeType: guessMimeFromName(filenameHint || path) }
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
