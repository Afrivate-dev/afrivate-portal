/** Allowed protocols for user-supplied links rendered in the UI. */
const SAFE_LINK_PROTOCOLS = new Set(['https:', 'http:'])

/** Returns a safe URL string or null if the input is unsafe. */
export function sanitizeHttpUrl(raw: string | undefined | null): string | null {
  const url = raw?.trim()
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!SAFE_LINK_PROTOCOLS.has(parsed.protocol)) return null
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') return null
    return parsed.href
  } catch {
    return null
  }
}

/** LinkedIn profile/company URLs only. */
export function sanitizeLinkedInUrl(raw: string | undefined | null): string | null {
  const safe = sanitizeHttpUrl(raw)
  if (!safe) return null
  try {
    const host = new URL(safe).hostname.replace(/^www\./, '')
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null
    return safe
  } catch {
    return null
  }
}

/** YouTube embed URL — never pass through arbitrary URLs to iframe src. */
export function sanitizeYouTubeEmbedUrl(raw: string | undefined | null): string {
  const url = raw?.trim() ?? ''
  if (!url) return ''
  if (url.includes('/embed/')) {
    const safe = sanitizeHttpUrl(url)
    if (!safe) return ''
    try {
      const host = new URL(safe).hostname.replace(/^www\./, '')
      if (host === 'youtube.com' || host === 'youtube-nocookie.com') return safe
    } catch {
      return ''
    }
    return ''
  }
  const watch = url.match(/[?&]v=([^&]+)/)
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`
  const short = url.match(/youtu\.be\/([^?]+)/)
  if (short) return `https://www.youtube.com/embed/${short[1]}`
  if (/^[\w-]{6,15}$/.test(url)) return `https://www.youtube.com/embed/${url}`
  return ''
}

/** Media URLs for announcements — https only in production, http allowed on localhost. */
export function sanitizeMediaUrl(raw: string | undefined | null): string | null {
  const safe = sanitizeHttpUrl(raw)
  if (!safe) return null
  try {
    const parsed = new URL(safe)
    if (import.meta.env.PROD && parsed.protocol !== 'https:') return null
    return safe
  } catch {
    return null
  }
}
