import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Maximize2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'
import {
  isStorageReference,
  prefetchMediaUrl,
  resolveStorageReference,
} from '@/utils/mediaUpload'
import type { AnnouncementMedia } from '@/types'
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal'
import { PortalVideoPlayer } from '@/components/shared/PortalVideoPlayer'

function useResolvedUrl(url: string) {
  const [src, setSrc] = useState(url)
  useEffect(() => {
    if (isStorageReference(url)) {
      void resolveStorageReference(url).then(setSrc)
    } else {
      setSrc(url)
    }
  }, [url])
  return src
}

function FeedMediaSlide({
  item,
  onDocumentOpen,
  eager,
}: {
  item: AnnouncementMedia
  onDocumentOpen?: () => void
  eager?: boolean
}) {
  const src = useResolvedUrl(item.url)
  const label = item.fileName ?? item.caption ?? 'Attachment'

  useEffect(() => {
    if (item.kind === 'video' && eager) prefetchMediaUrl(item.url)
  }, [item.kind, item.url, eager])

  if (item.kind === 'document') {
    return (
      <button
        type="button"
        onClick={onDocumentOpen}
        className="flex min-h-[200px] w-full flex-col items-center justify-center gap-3 bg-surface-2 px-6 py-10 ring-focus"
      >
        <FileText className="h-12 w-12 text-muted" />
        <span className="line-clamp-2 text-center text-sm font-medium text-fg">{label}</span>
        <span className="text-xs font-medium text-accent">Tap to preview</span>
      </button>
    )
  }

  if (item.kind === 'video') {
    return <PortalVideoPlayer src={src} className="w-full" eager={eager} />
  }

  return (
    <img
      src={src}
      alt={label}
      className="max-h-[min(80vh,720px)] w-full bg-black object-contain"
      loading="lazy"
    />
  )
}

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
      if (item.kind !== 'video') return
      if (i === index || i === index + 1 || i === index - 1) {
        prefetchMediaUrl(item.url)
      }
    })
  }, [items, index])

  if (!current) return null

  return (
    <div className="relative bg-black">
      <FeedMediaSlide
        item={current}
        eager
        onDocumentOpen={() => onDocumentOpen(current)}
      />
      {items.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 ring-focus"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % items.length)}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 ring-focus"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
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

function LightboxSlide({
  item,
  onExpand,
}: {
  item: AnnouncementMedia
  onExpand?: () => void
}) {
  const src = useResolvedUrl(item.url)
  const label = item.fileName ?? item.caption ?? 'Attachment'

  if (item.kind === 'document') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <FileText className="h-14 w-14 text-muted" />
        <p className="text-sm font-medium text-fg">{label}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {onExpand ? (
            <Button type="button" variant="secondary" size="sm" onClick={onExpand}>
              Preview document
            </Button>
          ) : null}
          <a
            href={src}
            download={item.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
          >
            <Download className="h-4 w-4" /> Download
          </a>
        </div>
      </div>
    )
  }

  if (item.kind === 'video') {
    return <PortalVideoPlayer src={src} className="w-full rounded-lg" eager />
  }

  return (
    <img
      src={src}
      alt={label}
      className="max-h-[min(75vh,680px)] w-full rounded-lg object-contain"
    />
  )
}

export function PortalMediaGallery({
  media,
  compact,
  variant = compact ? 'grid' : 'feed',
}: {
  media?: AnnouncementMedia[]
  /** @deprecated use variant="grid" */
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
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
        />
      </>
    )
  }

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((m, i) => (
          <MediaThumb
            key={`${m.url}-${i}`}
            item={m}
            onOpen={() => {
              if (m.kind === 'document') {
                setDocPreview(m)
              } else {
                setLightboxIndex(i)
              }
            }}
          />
        ))}
      </div>

      {lightboxIndex != null && items[lightboxIndex] ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
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
              className="rounded-md p-2 hover:bg-white/10 ring-focus"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-4 pb-6">
            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 ring-focus sm:left-4"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 ring-focus sm:right-4"
                  aria-label="Next"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}
            <div className="w-full max-w-4xl">
              <LightboxSlide
                item={items[lightboxIndex]}
                onExpand={
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
        </div>
      ) : null}

      <DocumentPreviewModal
        open={!!docPreview}
        onClose={() => setDocPreview(null)}
        title={docPreview?.fileName ?? 'Document'}
        fileName={docPreview?.fileName ?? 'file'}
        url={docPreview?.url ?? null}
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
  const src = useResolvedUrl(item.url)
  const label = item.fileName ?? item.caption ?? 'Open attachment'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative overflow-hidden rounded-lg border border-border bg-surface-2/30 text-left ring-focus transition hover:border-accent/40"
    >
      {item.kind === 'image' ? (
        <img
          src={src}
          alt=""
          className="aspect-video max-h-28 w-full object-cover"
          loading="lazy"
        />
      ) : item.kind === 'video' ? (
        <div className="relative flex aspect-video max-h-36 w-full items-center justify-center bg-black">
          <video src={src} className="h-full w-full object-cover opacity-80" preload="metadata" muted />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-white/90">
            Video
          </span>
        </div>
      ) : (
        <div className="flex aspect-video max-h-28 w-full flex-col items-center justify-center gap-2 bg-surface-2 px-3">
          <FileText className="h-8 w-8 text-muted" />
          <span className="line-clamp-2 text-center text-xs font-medium text-fg">{label}</span>
        </div>
      )}
      <span className="absolute bottom-2 right-2 rounded-md bg-black/55 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
        <Maximize2 className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}
