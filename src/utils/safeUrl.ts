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

/** Vimeo embed URL for iframe playback. */
export function sanitizeVimeoEmbedUrl(raw: string | undefined | null): string {
  const safe = sanitizeHttpUrl(raw)
  if (!safe) return ''
  try {
    const parsed = new URL(safe)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'player.vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean).pop()
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : ''
    }
    if (host === 'vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean).pop()
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : ''
    }
  } catch {
    return ''
  }
  return ''
}

/** TikTok embed URL — portrait 9:16. */
export function sanitizeTikTokEmbedUrl(raw: string | undefined | null): string {
  const safe = sanitizeHttpUrl(raw)
  if (!safe) return ''
  try {
    const parsed = new URL(safe)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host !== 'tiktok.com' && !host.endsWith('.tiktok.com')) return ''
    const videoMatch = parsed.pathname.match(/\/video\/(\d+)/)
    if (videoMatch) return `https://www.tiktok.com/embed/v2/${videoMatch[1]}`
  } catch {
    return ''
  }
  return ''
}

/** Instagram reel/post/tv embed — aspect varies by format. */
export function sanitizeInstagramEmbedUrl(
  raw: string | undefined | null,
): { embedUrl: string; aspect: { width: number; height: number } } | null {
  const safe = sanitizeHttpUrl(raw)
  if (!safe) return null
  try {
    const parsed = new URL(safe)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host !== 'instagram.com') return null

    const reelMatch = parsed.pathname.match(/\/reel\/([\w-]+)/)
    if (reelMatch) {
      return {
        embedUrl: `https://www.instagram.com/reel/${reelMatch[1]}/embed`,
        aspect: { width: 9, height: 16 },
      }
    }

    const postMatch = parsed.pathname.match(/\/p\/([\w-]+)/)
    if (postMatch) {
      return {
        embedUrl: `https://www.instagram.com/p/${postMatch[1]}/embed`,
        aspect: { width: 4, height: 5 },
      }
    }

    const tvMatch = parsed.pathname.match(/\/tv\/([\w-]+)/)
    if (tvMatch) {
      return {
        embedUrl: `https://www.instagram.com/tv/${tvMatch[1]}/embed`,
        aspect: { width: 16, height: 9 },
      }
    }
  } catch {
    return null
  }
  return null
}

/** X (Twitter) status embed for posts with video. */
export function sanitizeXEmbedUrl(raw: string | undefined | null): string {
  const safe = sanitizeHttpUrl(raw)
  if (!safe) return ''
  try {
    const parsed = new URL(safe)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host !== 'twitter.com' && host !== 'x.com') return ''
    const statusMatch = parsed.pathname.match(/\/status\/(\d+)/)
    if (statusMatch) {
      return `https://platform.twitter.com/embed/Tweet.html?id=${statusMatch[1]}&dnt=true`
    }
  } catch {
    return ''
  }
  return ''
}

export type VideoEmbedResult = {
  embedUrl: string
  aspect: { width: number; height: number }
  label: string
}

const LANDSCAPE = { width: 16, height: 9 } as const
const PORTRAIT = { width: 9, height: 16 } as const

/** Resolve a social or streaming URL to a safe iframe embed + aspect ratio. */
export function resolveVideoEmbedUrl(raw: string | undefined | null): VideoEmbedResult | null {
  const url = raw?.trim() ?? ''
  if (!url) return null

  const youtubeEmbed = sanitizeYouTubeEmbedUrl(url)
  if (youtubeEmbed) {
    return { embedUrl: youtubeEmbed, aspect: LANDSCAPE, label: 'YouTube video' }
  }

  const vimeoEmbed = sanitizeVimeoEmbedUrl(url)
  if (vimeoEmbed) {
    return { embedUrl: vimeoEmbed, aspect: LANDSCAPE, label: 'Vimeo video' }
  }

  const tiktokEmbed = sanitizeTikTokEmbedUrl(url)
  if (tiktokEmbed) {
    return { embedUrl: tiktokEmbed, aspect: PORTRAIT, label: 'TikTok video' }
  }

  const instagramEmbed = sanitizeInstagramEmbedUrl(url)
  if (instagramEmbed) {
    return {
      embedUrl: instagramEmbed.embedUrl,
      aspect: instagramEmbed.aspect,
      label: 'Instagram video',
    }
  }

  const xEmbed = sanitizeXEmbedUrl(url)
  if (xEmbed) {
    return { embedUrl: xEmbed, aspect: LANDSCAPE, label: 'X video' }
  }

  return null
}

const VIDEO_PAGE_HOSTS = [
  'tiktok.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'fb.watch',
  'twitch.tv',
  'dailymotion.com',
  'loom.com',
]

/** Hostname looks like a video page even when embed parsing failed. */
export function isLikelyVideoPageUrl(raw: string | undefined | null): boolean {
  const safe = sanitizeHttpUrl(raw)
  if (!safe) return false
  try {
    const host = new URL(safe).hostname.replace(/^www\./, '')
    return VIDEO_PAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
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
