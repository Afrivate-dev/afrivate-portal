import { cn } from '@/utils/helpers'
import { MEDIA_MAX_HEIGHT } from '@/utils/mediaAspectRatio'

/** Embedded video player (YouTube, TikTok, Instagram, X, etc.) with provider-specific aspect ratio. */
export function MediaEmbedPlayer({
  embedUrl,
  title,
  className,
  aspect = { width: 16, height: 9 },
}: {
  embedUrl: string
  title?: string
  className?: string
  aspect?: { width: number; height: number }
}) {
  const isPortrait = aspect.height > aspect.width

  return (
    <div className={cn('relative w-full overflow-hidden bg-black', className)}>
      <div
        className="w-full"
        style={{
          aspectRatio: `${aspect.width} / ${aspect.height}`,
          width: isPortrait
            ? `min(100%, calc(${MEDIA_MAX_HEIGHT} * ${aspect.width} / ${aspect.height}))`
            : '100%',
          maxHeight: MEDIA_MAX_HEIGHT,
          marginInline: 'auto',
        }}
      >
        <iframe
          src={embedUrl}
          title={title ?? 'Embedded video'}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  )
}
