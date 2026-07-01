import { useEffect, useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import { AdaptiveMediaFrame } from '@/components/shared/AdaptiveMediaFrame'
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl'
import { cn } from '@/utils/helpers'
import { MEDIA_MAX_HEIGHT, type MediaDimensions } from '@/utils/mediaAspectRatio'

function AdaptiveMediaImageLoaded({
  url,
  alt,
  className,
  eager,
  fullscreen,
}: {
  url: string
  alt: string
  className?: string
  eager?: boolean
  fullscreen?: boolean
}) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null)
  const [displayReady, setDisplayReady] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      if (img.naturalWidth && img.naturalHeight) {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      }
      setDisplayReady(true)
    }
    img.onerror = () => {
      if (!cancelled) setFailed(true)
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [url])

  if (!failed && !displayReady) {
    return (
      <div
        className={cn('relative overflow-hidden bg-black', className)}
        style={{ aspectRatio: '1 / 1', maxHeight: MEDIA_MAX_HEIGHT, marginInline: 'auto', width: '100%' }}
        aria-busy="true"
        aria-label={`Loading ${alt}`}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      </div>
    )
  }

  const imageBody =
    displayReady && !failed ? (
      <img
        src={url}
        alt={alt}
        className="h-full w-full object-contain opacity-100 transition-opacity duration-200 motion-reduce:transition-none"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    ) : null

  return (
    <>
      <AdaptiveMediaFrame dimensions={dimensions} className={className}>
        {fullscreen && displayReady && !failed ? (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="group relative block h-full w-full cursor-zoom-in ring-focus"
            aria-label="View full screen"
          >
            {imageBody}
            <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/55 p-1.5 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
          </button>
        ) : (
          imageBody
        )}
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2 px-4 text-center text-sm text-muted">
            Could not load this image.
          </div>
        ) : null}
      </AdaptiveMediaFrame>

      {lightbox && displayReady && !failed ? (
        <div
          className="fixed inset-0 z-[120] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <div className="flex justify-end p-3">
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="rounded-md p-2 text-white hover:bg-white/10 ring-focus touch-manipulation"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-2 pb-6">
            <img src={url} alt={alt} className="max-h-[90dvh] max-w-full object-contain" />
          </div>
        </div>
      ) : null}
    </>
  )
}

export function AdaptiveMediaImage({
  src,
  alt,
  className,
  eager = false,
  fullscreen = true,
}: {
  src: string
  alt: string
  className?: string
  eager?: boolean
  /** Tap to open full-screen lightbox */
  fullscreen?: boolean
}) {
  const { url, loading, ready } = useResolvedMediaUrl(src)

  if (!ready || !url) {
    return (
      <div
        className={cn('relative overflow-hidden bg-black', className)}
        style={{ aspectRatio: '1 / 1', maxHeight: MEDIA_MAX_HEIGHT, marginInline: 'auto', width: '100%' }}
        aria-busy="true"
        aria-label={`Loading ${alt}`}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <AdaptiveMediaImageLoaded
      key={url}
      url={url}
      alt={alt}
      className={className}
      eager={eager}
      fullscreen={fullscreen}
    />
  )
}

function AdaptiveMediaThumbLoaded({
  url,
  alt,
  className,
}: {
  url: string
  alt: string
  className?: string
}) {
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      if (img.naturalWidth && img.naturalHeight) {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      }
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div
      className={cn(
        'relative flex max-h-36 w-full items-center justify-center overflow-hidden bg-black',
        className,
      )}
      style={
        dimensions
          ? {
              aspectRatio: `${dimensions.width} / ${dimensions.height}`,
              maxHeight: '9rem',
            }
          : {
              aspectRatio: '1 / 1',
              maxHeight: '9rem',
            }
      }
    >
      {dimensions ? (
        <img src={url} alt={alt} className="h-full w-full object-contain" loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-black/40" aria-hidden />
      )}
    </div>
  )
}

/** Compact thumbnail — preserves aspect ratio within a bounded box. */
export function AdaptiveMediaThumb({
  src,
  alt,
  kind,
  className,
  embedUrl,
  embedAspect,
}: {
  src: string
  alt: string
  kind: 'image' | 'video'
  className?: string
  embedUrl?: string
  embedAspect?: { width: number; height: number }
}) {
  const { url, ready } = useResolvedMediaUrl(src)
  const fallbackAspect = embedAspect ?? (embedUrl || kind === 'video' ? { width: 16, height: 9 } : { width: 1, height: 1 })

  if (embedUrl) {
    return (
      <div
        className={cn(
          'relative flex max-h-36 w-full items-center justify-center overflow-hidden bg-black',
          className,
        )}
        style={{
          aspectRatio: `${fallbackAspect.width} / ${fallbackAspect.height}`,
          maxHeight: '9rem',
        }}
      >
        <div className="flex h-full w-full items-center justify-center bg-black text-xs font-semibold uppercase tracking-wide text-white/80">
          Video
        </div>
      </div>
    )
  }

  if (kind === 'video' || !ready || !url) {
    return (
      <div
        className={cn(
          'relative flex max-h-36 w-full items-center justify-center overflow-hidden bg-black',
          className,
        )}
        style={{
          aspectRatio: `${fallbackAspect.width} / ${fallbackAspect.height}`,
          maxHeight: '9rem',
        }}
      >
        {kind === 'video' ? (
          <div className="flex h-full w-full items-center justify-center bg-black text-xs font-semibold uppercase tracking-wide text-white/80">
            Video
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/40" aria-hidden />
        )}
      </div>
    )
  }

  return <AdaptiveMediaThumbLoaded key={url} url={url} alt={alt} className={className} />
}
