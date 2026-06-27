import { useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import { AdaptiveMediaFrame } from '@/components/shared/AdaptiveMediaFrame'
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl'
import { cn } from '@/utils/helpers'
import type { MediaDimensions } from '@/utils/mediaAspectRatio'

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
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [failed, setFailed] = useState(false)

  const imageBody = ready && !failed ? (
    <img
      src={url}
      alt={alt}
      className="h-full w-full object-contain"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={(e) => {
        const img = e.currentTarget
        if (img.naturalWidth && img.naturalHeight) {
          setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
        }
        setFailed(false)
      }}
      onError={() => setFailed(true)}
    />
  ) : null

  return (
    <>
      <AdaptiveMediaFrame dimensions={dimensions} className={className}>
        {fullscreen && ready && !failed ? (
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
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        ) : null}
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2 px-4 text-center text-sm text-muted">
            Could not load this image.
          </div>
        ) : null}
      </AdaptiveMediaFrame>

      {lightbox && ready && !failed ? (
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

/** Compact thumbnail — preserves aspect ratio within a bounded box. */
export function AdaptiveMediaThumb({
  src,
  alt,
  kind,
  className,
  embedUrl,
}: {
  src: string
  alt: string
  kind: 'image' | 'video'
  className?: string
  embedUrl?: string
}) {
  const { url, ready } = useResolvedMediaUrl(src)
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null)

  const onDimensions = (width: number, height: number) => {
    if (width && height) setDimensions({ width, height })
  }

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
          : { aspectRatio: embedUrl || kind === 'video' ? '16 / 9' : '1 / 1', maxHeight: '9rem' }
      }
    >
      {embedUrl ? (
        <div className="flex h-full w-full items-center justify-center bg-black text-xs font-semibold uppercase tracking-wide text-white/80">
          Video
        </div>
      ) : ready && kind === 'image' ? (
        <img
          src={url}
          alt={alt}
          className="h-full w-full object-contain"
          loading="lazy"
          onLoad={(e) => onDimensions(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
        />
      ) : ready && kind === 'video' ? (
        <div className="flex h-full w-full items-center justify-center bg-black text-xs font-semibold uppercase tracking-wide text-white/80">
          Video
        </div>
      ) : null}
    </div>
  )
}
