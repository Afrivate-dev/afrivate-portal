import { cn } from '@/utils/helpers'

/** YouTube / Vimeo iframe player for link-based videos. */
export function MediaEmbedPlayer({
  embedUrl,
  title,
  className,
}: {
  embedUrl: string
  title?: string
  className?: string
}) {
  return (
    <div className={cn('relative w-full overflow-hidden bg-black', className)}>
      <div className="aspect-video w-full max-h-[min(85dvh,720px)]">
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
