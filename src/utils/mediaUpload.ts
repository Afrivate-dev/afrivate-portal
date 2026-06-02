import type { AnnouncementMedia } from '@/types'

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaUploadError'
  }
}

function inferKind(file: File): AnnouncementMedia['kind'] {
  return file.type.startsWith('video/') ? 'video' : 'image'
}

/**
 * POST multipart field `file` to the workspace media endpoint (see `.env.example`).
 * Expects JSON: `{ "url": "https://..." }` or `{ "ok": true, "url": "..." }`.
 */
export async function uploadHostedMediaFile(file: File): Promise<AnnouncementMedia> {
  const endpoint = import.meta.env.VITE_MEDIA_UPLOAD_URL?.trim()
  if (!endpoint) {
    throw new MediaUploadError(
      'File upload is not connected for this workspace yet. Paste a direct https link instead, or ask your administrator.',
    )
  }

  const body = new FormData()
  body.append('file', file)

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      body,
      credentials: 'omit',
      mode: 'cors',
    })
  } catch {
    throw new MediaUploadError('Could not reach the upload service. Check your connection and try again.')
  }

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new MediaUploadError(t || `Upload did not succeed (${res.status}).`)
  }

  const data = (await res.json()) as { url?: string; ok?: boolean; kind?: AnnouncementMedia['kind'] }
  const url = typeof data.url === 'string' ? data.url.trim() : ''
  if (!url) {
    throw new MediaUploadError('The server did not return a usable link. Try again or paste a link manually.')
  }

  const kind = data.kind ?? inferKind(file)
  return { kind, url }
}

/** Announcements use the same upload endpoint as other workspace media. */
export const uploadAnnouncementMedia = uploadHostedMediaFile

export function parseMediaUrlInput(raw: string): AnnouncementMedia | null {
  const url = raw.trim()
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    const path = u.pathname.toLowerCase()
    const video =
      path.endsWith('.mp4') ||
      path.endsWith('.webm') ||
      path.endsWith('.mov') ||
      path.endsWith('.m4v')
    return { kind: video ? 'video' : 'image', url }
  } catch {
    return null
  }
}
