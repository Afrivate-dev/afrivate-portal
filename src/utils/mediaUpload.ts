import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import { getPortalFileBlobUrl, getPortalFileSignedUrl, uploadPortalFile } from '@/lib/supabase/fileStorage'
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

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()
const blobUrlCache = new Map<string, string>()
const SIGNED_URL_TTL_MS = 50 * 60 * 1000

function isPlayableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')
}

export function revokeVideoBlobUrl(url: string): void {
  if (!url.startsWith('blob:')) return
  URL.revokeObjectURL(url)
  for (const [path, cached] of blobUrlCache.entries()) {
    if (cached === url) blobUrlCache.delete(path)
  }
}

export type VideoPlaybackResult = {
  url: string
  isBlob: boolean
}

/** Resolve storage videos for playback — signed stream first, authenticated blob fallback. */
export async function resolveVideoPlaybackUrl(
  url: string,
  opts?: { forceBlob?: boolean },
): Promise<VideoPlaybackResult | null> {
  if (!url) return null

  if (!isStorageReference(url)) {
    return isPlayableUrl(url) ? { url, isBlob: false } : null
  }

  if (!supabase) return null

  const path = storagePathFromReference(url)
  const forceBlob = opts?.forceBlob ?? false

  if (!forceBlob) {
    const cached = signedUrlCache.get(path)
    if (cached && cached.expiresAt > Date.now()) {
      return { url: cached.url, isBlob: false }
    }

    const signed = await getPortalFileSignedUrl(supabase, path)
    if (signed) {
      signedUrlCache.set(path, { url: signed, expiresAt: Date.now() + SIGNED_URL_TTL_MS })
      return { url: signed, isBlob: false }
    }
  }

  const cachedBlob = blobUrlCache.get(path)
  if (cachedBlob) return { url: cachedBlob, isBlob: true }

  const blob = await getPortalFileBlobUrl(supabase, path)
  if (blob) {
    blobUrlCache.set(path, blob)
    return { url: blob, isBlob: true }
  }

  return null
}

export async function resolveStorageReference(url: string): Promise<string> {
  if (!isStorageReference(url) || !supabase) return url
  const path = storagePathFromReference(url)
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  const signed = await getPortalFileSignedUrl(supabase, path)
  if (signed) {
    signedUrlCache.set(path, { url: signed, expiresAt: Date.now() + SIGNED_URL_TTL_MS })
    return signed
  }
  const blob = await getPortalFileBlobUrl(supabase, path)
  if (blob) {
    blobUrlCache.set(path, blob)
    return blob
  }
  return url
}

/** Warm signed URL cache (and browser cache) before playback. */
export function prefetchMediaUrl(url: string): void {
  if (isStorageReference(url)) {
    void resolveStorageReference(url)
    return
  }
  if (typeof document === 'undefined') return
  const existing = document.querySelector(`link[data-prefetch-media="${url}"]`)
  if (existing) return
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = url.includes('.mp4') || url.includes('.webm') ? 'video' : 'fetch'
  link.href = url
  link.setAttribute('data-prefetch-media', url)
  document.head.appendChild(link)
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
        return { kind: inferKind(file), url: `${STORAGE_URL_PREFIX}${uploaded.path}`, fileName: file.name }
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
