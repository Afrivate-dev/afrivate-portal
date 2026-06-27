import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import { getPortalFileDownloadUrl, uploadPortalFile } from '@/lib/supabase/fileStorage'
import { sanitizeMediaUrl } from '@/utils/safeUrl'
import type { AnnouncementMedia } from '@/types'

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaUploadError'
  }
}

function inferKind(file: File): AnnouncementMedia['kind'] {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('image/')) return 'image'
  return 'document'
}

/** Prefix stored in avatar_url / media url fields when using Supabase Storage. */
export const STORAGE_URL_PREFIX = 'storage:'

export function isStorageReference(url?: string | null): boolean {
  return !!url?.startsWith(STORAGE_URL_PREFIX)
}

export function storagePathFromReference(url: string): string {
  return url.startsWith(STORAGE_URL_PREFIX) ? url.slice(STORAGE_URL_PREFIX.length) : url
}

export async function resolveStorageReference(url: string): Promise<string> {
  if (!isStorageReference(url) || !supabase) return url
  const signed = await getPortalFileDownloadUrl(supabase, storagePathFromReference(url))
  return signed ?? url
}

/**
 * Upload a workspace file — Supabase Storage first, then optional external endpoint.
 */
export async function uploadHostedMediaFile(
  file: File,
  userId?: string,
  folder: 'documents' | 'leave' | 'avatars' | 'media' = 'media',
): Promise<AnnouncementMedia> {
  if (isSupabaseAuthEnabled() && supabase) {
    let uid = userId
    if (!uid) {
      const { data } = await supabase.auth.getUser()
      uid = data.user?.id
    }
    if (uid) {
      const uploaded = await uploadPortalFile(supabase, folder, file, uid)
      if (!('error' in uploaded)) {
        const signed = await getPortalFileDownloadUrl(supabase, uploaded.path)
        if (signed) {
          return { kind: inferKind(file), url: `${STORAGE_URL_PREFIX}${uploaded.path}` }
        }
        return { kind: inferKind(file), url: `${STORAGE_URL_PREFIX}${uploaded.path}` }
      }
      throw new MediaUploadError(uploaded.error)
    }
  }

  const endpoint = import.meta.env.VITE_MEDIA_UPLOAD_URL?.trim()
  if (!endpoint) {
    throw new MediaUploadError(
      'File upload is not available yet. Paste a direct link instead, or ask your administrator for help.',
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

export const uploadAnnouncementMedia = uploadHostedMediaFile

export function parseMediaUrlInput(raw: string): AnnouncementMedia | null {
  const url = sanitizeMediaUrl(raw)
  if (!url) return null
  try {
    const path = new URL(url).pathname.toLowerCase()
    const video =
      path.endsWith('.mp4') ||
      path.endsWith('.webm') ||
      path.endsWith('.mov') ||
      path.endsWith('.m4v')
    const image =
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.gif') ||
      path.endsWith('.webp') ||
      path.endsWith('.svg')
    const kind: AnnouncementMedia['kind'] = video ? 'video' : image ? 'image' : 'document'
    const fileName = path.split('/').pop() || undefined
    return { kind, url, fileName }
  } catch {
    return null
  }
}
