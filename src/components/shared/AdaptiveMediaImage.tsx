import { AdaptiveMediaFrame } from '@/components/shared/AdaptiveMediaFrame'
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl'
import { cn } from '@/utils/helpers'
import type { MediaDimensions } from '@/utils/mediaAspectRatio'
import { useState } from 'react'

export function AdaptiveMediaImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string
  alt: string
  className?: string
  eager?: boolean
}) {
  const { url, loading, ready } = useResolvedMediaUrl(src)
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null)

  return (
    <AdaptiveMediaFrame dimensions={dimensions} className={className}>
      {ready ? (
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
          }}
        />
      ) : null}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : null}
    </AdaptiveMediaFrame>
  )
}

/** Compact thumbnail — preserves aspect ratio within a bounded box. */
export function AdaptiveMediaThumb({
  src,
  alt,
  kind,
  className,
}: {
  src: string
  alt: string
  kind: 'image' | 'video'
  className?: string
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
          : { aspectRatio: '1 / 1', maxHeight: '9rem' }
      }
    >
      {ready && kind === 'image' ? (
        <img
          src={url}
          alt={alt}
          className="h-full w-full object-contain"
          loading="lazy"
          onLoad={(e) => onDimensions(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
        />
      ) : ready && kind === 'video' ? (
        <video
          src={url}
          className="h-full w-full object-contain opacity-90"
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={(e) =>
            onDimensions(e.currentTarget.videoWidth, e.currentTarget.videoHeight)
          }
        />
      ) : null}
    </div>
  )
}
