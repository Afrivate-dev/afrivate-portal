import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Maximize2,
  X,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import { prefetchMediaUrl } from '@/utils/mediaUpload'
import type { AnnouncementMedia } from '@/types'
import { AdaptiveMediaThumb } from '@/components/shared/AdaptiveMediaImage'
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal'
import { MediaSlideContent } from '@/components/shared/MediaSlideContent'

function FeedMediaCarousel({
  items,
  onDocumentOpen,
}: {
  items: AnnouncementMedia[]
  onDocumentOpen: (item: AnnouncementMedia) => void
}) {
  const [index, setIndex] = useState(0)
  const current = items[index] ?? items[0]

  useEffect(() => {
    items.forEach((item, i) => {
      if (item.kind !== 'video' || item.embedUrl) return
      if (i === index || i === index + 1 || i === index - 1) prefetchMediaUrl(item.url)
    })
  }, [items, index])

  if (!current) return null

  return (
    <div className="relative flex w-full justify-center bg-black">
      <div className="w-full max-w-full">
        <MediaSlideContent
          item={current}
          eager
          onDocumentOpen={() => onDocumentOpen(current)}
        />
      </div>
      {items.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 ring-focus touch-manipulation"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % items.length)}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 ring-focus touch-manipulation"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5 sm:bottom-16">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all touch-manipulation',
                  i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function PortalMediaGallery({
  media,
  compact,
  variant = compact ? 'grid' : 'feed',
}: {
  media?: AnnouncementMedia[]
  compact?: boolean
  variant?: 'feed' | 'grid'
}) {
  const items = media?.filter(Boolean) ?? []
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [docPreview, setDocPreview] = useState<AnnouncementMedia | null>(null)
  const mode = variant === 'feed' && !compact ? 'feed' : 'grid'

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i == null || items.length === 0 ? null : (i - 1 + items.length) % items.length))
  }, [items.length])
  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i == null || items.length === 0 ? null : (i + 1) % items.length))
  }, [items.length])

  useEffect(() => {
    if (lightboxIndex == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        closeLightbox()
        return
      }
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [lightboxIndex, closeLightbox, goPrev, goNext])

  if (!items.length) return null

  if (mode === 'feed') {
    return (
      <>
        <FeedMediaCarousel items={items} onDocumentOpen={setDocPreview} />
        <DocumentPreviewModal
          open={!!docPreview}
          onClose={() => setDocPreview(null)}
          title={docPreview?.fileName ?? 'Document'}
          fileName={docPreview?.fileName ?? 'file'}
          url={docPreview?.url ?? null}
          siblings={items}
        />
      </>
    )
  }

  return (
    <>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
        {items.map((m, i) => (
          <MediaThumb
            key={`${m.url}-${i}`}
            item={m}
            onOpen={() => {
              if (m.kind === 'document') setDocPreview(m)
              else setLightboxIndex(i)
            }}
          />
        ))}
      </div>

      {lightboxIndex != null && items[lightboxIndex] && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[110] flex flex-col bg-black/90"
              role="dialog"
              aria-modal="true"
              aria-label="Media viewer"
            >
              <div className="flex items-center justify-between px-4 py-3 text-white">
                <span className="text-sm font-medium">
                  {lightboxIndex + 1} / {items.length}
                </span>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="rounded-md p-2 hover:bg-white/10 ring-focus touch-manipulation"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-2 pb-6 sm:px-4">
                {items.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 ring-focus touch-manipulation sm:left-4"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 ring-focus touch-manipulation sm:right-4"
                      aria-label="Next"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                ) : null}
                <div className="w-full max-w-4xl">
                  <MediaSlideContent
                    item={items[lightboxIndex]}
                    eager
                    imageFullscreen
                    onDocumentOpen={
                      items[lightboxIndex].kind === 'document'
                        ? () => {
                            setDocPreview(items[lightboxIndex])
                            closeLightbox()
                          }
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <DocumentPreviewModal
        open={!!docPreview}
        onClose={() => setDocPreview(null)}
        title={docPreview?.fileName ?? 'Document'}
        fileName={docPreview?.fileName ?? 'file'}
        url={docPreview?.url ?? null}
        siblings={items}
      />
    </>
  )
}

function MediaThumb({
  item,
  onOpen,
}: {
  item: AnnouncementMedia
  onOpen: () => void
}) {
  const label = item.fileName ?? item.caption ?? 'Open attachment'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative overflow-hidden rounded-lg border border-border bg-surface-2/30 text-left ring-focus transition hover:border-accent/40"
    >
      {item.kind === 'image' || item.kind === 'video' ? (
        <AdaptiveMediaThumb
          src={item.url}
          alt={label}
          kind={item.kind}
          embedUrl={item.embedUrl}
          embedAspect={item.embedAspect}
        />
      ) : (
        <div className="flex aspect-square max-h-36 w-full flex-col items-center justify-center gap-2 bg-surface-2 px-3">
          <FileText className="h-8 w-8 text-muted" />
          <span className="line-clamp-2 text-center text-xs font-medium text-fg">{label}</span>
        </div>
      )}
      {item.kind === 'video' ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-white/90">
          Video
        </span>
      ) : null}
      <span className="absolute bottom-2 right-2 rounded-md bg-black/55 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
        <Maximize2 className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}
