import type { AnnouncementMedia } from '@/types'
import { isStorageReference, resolveStorageReference } from '@/utils/mediaUpload'

export type DocumentPreviewKind =
  | 'pdf'
  | 'html'
  | 'docx'
  | 'image'
  | 'download'

export const MAX_MEMO_ATTACHMENT_BYTES = 50 * 1024 * 1024

function extOf(nameOrUrl: string): string {
  const clean = nameOrUrl.split('?')[0]?.split('#')[0] ?? ''
  const base = clean.includes('/') ? (clean.split('/').pop() ?? clean) : clean
  const dot = base.lastIndexOf('.')
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ''
}

export function detectDocumentPreviewKind(fileName: string, url: string): DocumentPreviewKind {
  const ext = extOf(fileName) || extOf(url)
  if (ext === 'pdf') return 'pdf'
  if (ext === 'html' || ext === 'htm') return 'html'
  if (ext === 'docx') return 'docx'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp'].includes(ext)) return 'image'
  // Legacy .doc / Excel / PowerPoint: download only (no third-party Office Online for private files)
  return 'download'
}

function fileBaseName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name
  return base.trim().toLowerCase()
}

/** Resolve sibling memo attachments so relative HTML assets (images, css) still load. */
export async function buildHtmlAssetMap(
  siblings: AnnouncementMedia[] | undefined,
  currentUrl: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!siblings?.length) return map

  await Promise.all(
    siblings.map(async (item) => {
      if (!item.fileName || item.url === currentUrl) return
      const resolved = isStorageReference(item.url)
        ? await resolveStorageReference(item.url)
        : item.url
      if (!resolved) return
      const ok = /^https?:\/\//i.test(resolved) || resolved.startsWith('blob:')
      if (!ok) return
      const base = fileBaseName(item.fileName)
      map.set(base, resolved)
      try {
        map.set(encodeURI(base), resolved)
      } catch {
        /* ignore */
      }
    }),
  )
  return map
}

/**
 * Rewrite relative src/href in uploaded HTML so sibling attachments and absolute links work.
 * Leaves external https URLs and data/blob URLs untouched.
 */
export function rewriteHtmlAssetUrls(html: string, assetMap: Map<string, string>): string {
  if (!assetMap.size) return html

  const replaceRef = (raw: string): string => {
    const value = raw.trim()
    if (
      !value ||
      /^(https?:|data:|blob:|mailto:|tel:|#)/i.test(value)
    ) {
      return raw
    }
    if (/^javascript:/i.test(value)) return '#'
    const withoutQuery = value.split('?')[0]?.split('#')[0] ?? value
    const base = fileBaseName(withoutQuery)
    let decoded = base
    try {
      decoded = decodeURIComponent(base)
    } catch {
      /* keep base */
    }
    const hit = assetMap.get(base) ?? assetMap.get(decoded)
    return hit ?? raw
  }

  return html.replace(
    /\b(src|href|poster)=["']([^"']+)["']/gi,
    (_full, attr: string, ref: string) => `${attr}="${replaceRef(ref)}"`,
  )
}

/** Strip executable markup from uploaded HTML before srcDoc preview. */
export function sanitizeHtmlDocument(html: string): string {
  let out = html
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  out = out.replace(/<\/?script\b[^>]*>/gi, '')
  out = out.replace(/\son[a-z]+\s*=\s*(['"])[\s\S]*?\1/gi, '')
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
  out = out.replace(/\bhref\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, 'href="#"')
  out = out.replace(/\bsrc\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, 'src=""')
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
  out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
  out = out.replace(/<embed\b[^>]*\/?>/gi, '')
  out = out.replace(/<meta\b[^>]*http-equiv\s*=\s*(['"])?refresh\1[^>]*>/gi, '')
  return out
}

/** Files that can stand in for a written memo body (HTML / PDF / Word). */
export function isMemoBodyDocument(item: AnnouncementMedia): boolean {
  if (item.kind !== 'document') return false
  const kind = detectDocumentPreviewKind(item.fileName ?? '', item.url)
  return kind === 'html' || kind === 'pdf' || kind === 'docx' || kind === 'download'
}

/** Prefer HTML, then PDF, then DOCX, then other downloadable docs. */
export function pickMemoBodyDocument(media?: AnnouncementMedia[]): AnnouncementMedia | null {
  if (!media?.length) return null
  const docs = media.filter(isMemoBodyDocument)
  if (!docs.length) return null
  const order: DocumentPreviewKind[] = ['html', 'pdf', 'docx', 'download']
  for (const kind of order) {
    const hit = docs.find((d) => detectDocumentPreviewKind(d.fileName ?? '', d.url) === kind)
    if (hit) return hit
  }
  return docs[0] ?? null
}

/** When the message is empty, the primary uploaded document is the memo body. */
export function usesDocumentAsMemoBody(body: string, media?: AnnouncementMedia[]): boolean {
  return !body.trim() && !!pickMemoBodyDocument(media)
}

export function titleFromAttachmentName(fileName: string): string {
  const base = (fileName.split(/[/\\]/).pop() ?? fileName).trim()
  const withoutExt = base.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return withoutExt || base || 'Memo'
}

export function resolveMemoTitle(title: string, media?: AnnouncementMedia[]): string {
  const trimmed = title.trim()
  if (trimmed) return trimmed
  const doc = pickMemoBodyDocument(media)
  if (doc?.fileName) return titleFromAttachmentName(doc.fileName)
  return ''
}

export function canPublishMemo(title: string, body: string, media?: AnnouncementMedia[]): boolean {
  if (!resolveMemoTitle(title, media)) return false
  if (body.trim()) return true
  return !!pickMemoBodyDocument(media)
}

/** Gallery items excluding the document used as the memo body. */
export function memoGalleryMedia(
  body: string,
  media?: AnnouncementMedia[],
): AnnouncementMedia[] | undefined {
  if (!media?.length) return undefined
  if (!usesDocumentAsMemoBody(body, media)) return media
  const primary = pickMemoBodyDocument(media)
  const rest = primary ? media.filter((m) => m.url !== primary.url) : media
  return rest.length ? rest : undefined
}
