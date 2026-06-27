import { useEffect } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AdaptiveMediaImage } from '@/components/shared/AdaptiveMediaImage'
import { MediaEmbedPlayer } from '@/components/shared/MediaEmbedPlayer'
import { PortalVideoPlayer } from '@/components/shared/PortalVideoPlayer'
import { isStorageReference, prefetchMediaUrl, resolveStorageReference } from '@/utils/mediaUpload'
import type { AnnouncementMedia } from '@/types'

export function MediaSlideContent({
  item,
  onDocumentOpen,
  eager,
  imageFullscreen = true,
  className,
}: {
  item: AnnouncementMedia
  onDocumentOpen?: () => void
  eager?: boolean
  imageFullscreen?: boolean
  className?: string
}) {
  const label = item.fileName ?? item.caption ?? 'Attachment'

  useEffect(() => {
    if (item.kind === 'video' && !item.embedUrl && eager) prefetchMediaUrl(item.url)
  }, [item.kind, item.embedUrl, item.url, eager])

  if (item.kind === 'document') {
    const openExternal = async () => {
      if (isStorageReference(item.url)) {
        const resolved = await resolveStorageReference(item.url)
        window.open(resolved, '_blank', 'noopener,noreferrer')
        return
      }
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }

    return (
      <button
        type="button"
        onClick={onDocumentOpen ?? (() => void openExternal())}
        className="flex min-h-[200px] w-full flex-col items-center justify-center gap-3 bg-surface-2 px-6 py-10 ring-focus"
      >
        <FileText className="h-12 w-12 text-muted" />
        <span className="line-clamp-2 text-center text-sm font-medium text-fg">{label}</span>
        <span className="text-xs font-medium text-accent">Tap to preview or open</span>
      </button>
    )
  }

  if (item.kind === 'video' && item.embedUrl) {
    return <MediaEmbedPlayer embedUrl={item.embedUrl} title={label} className={className} />
  }

  if (item.kind === 'video') {
    return <PortalVideoPlayer src={item.url} className={className ?? 'w-full'} eager={eager} />
  }

  return (
    <AdaptiveMediaImage
      src={item.url}
      alt={label}
      eager={eager}
      fullscreen={imageFullscreen}
      className={className ?? 'w-full'}
    />
  )
}

export function ExternalLinkCard({ url, label }: { url: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-2 px-6 py-10 text-center">
      <ExternalLink className="h-10 w-10 text-muted" />
      <p className="text-sm font-medium text-fg">{label}</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      >
        Open link
      </Button>
    </div>
  )
}
