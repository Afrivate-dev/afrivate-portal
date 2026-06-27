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
  resolveStorageReference,
} from '@/utils/mediaUpload'
import type { AnnouncementMedia } from '@/types'
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal'

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
    return (
      <video
        src={src}
        controls
        playsInline
        className="max-h-[min(75vh,680px)] w-full rounded-lg bg-black"
        preload="metadata"
      />
    )
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
}: {
  media?: AnnouncementMedia[]
  compact?: boolean
}) {
  const items = media?.filter(Boolean) ?? []
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [docPreview, setDocPreview] = useState<AnnouncementMedia | null>(null)

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

  return (
    <>
      <div
        className={cn(
          'grid gap-2',
          compact ? 'mt-3 grid-cols-2 sm:grid-cols-3' : 'mt-3 grid-cols-1 sm:grid-cols-2',
        )}
      >
        {items.map((m, i) => (
          <MediaThumb
            key={`${m.url}-${i}`}
            item={m}
            compact={compact}
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
  compact,
  onOpen,
}: {
  item: AnnouncementMedia
  compact?: boolean
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
          className={cn('w-full object-cover', compact ? 'aspect-video max-h-28' : 'aspect-video max-h-56')}
          loading="lazy"
        />
      ) : item.kind === 'video' ? (
        <div
          className={cn(
            'relative flex w-full items-center justify-center bg-black',
            compact ? 'aspect-video max-h-36' : 'aspect-video max-h-64',
          )}
        >
          <video src={src} className="h-full w-full object-cover opacity-80" preload="metadata" muted />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-white/90">
            Video
          </span>
        </div>
      ) : (
        <div
          className={cn(
            'flex aspect-video w-full flex-col items-center justify-center gap-2 bg-surface-2 px-3',
            compact ? 'max-h-28' : 'max-h-40',
          )}
        >
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
