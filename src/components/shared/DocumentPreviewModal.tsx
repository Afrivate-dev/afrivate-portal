import { useEffect, useState } from 'react'
import { Download, FileText, X } from 'lucide-react'
import {
  isStorageReference,
  resolveStorageReference,
} from '@/utils/mediaUpload'

function isPdf(nameOrUrl: string): boolean {
  return /\.pdf($|\?)/i.test(nameOrUrl)
}

function isPreviewableImage(nameOrUrl: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(nameOrUrl)
}

function DocumentPreviewBody({
  fileName,
  url,
  title,
  onClose,
}: {
  fileName: string
  url: string
  title: string
  onClose: () => void
}) {
  const [resolved, setResolved] = useState<string | null>(() =>
    isStorageReference(url) ? null : url,
  )

  useEffect(() => {
    if (!isStorageReference(url)) return
    let cancelled = false
    void resolveStorageReference(url).then((next) => {
      if (!cancelled) setResolved(next)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  const canEmbedPdf = isPdf(fileName) || isPdf(url)
  const canShowImage = isPreviewableImage(fileName) || isPreviewableImage(url)

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-fg">{title}</h2>
          <p className="truncate text-xs text-muted">{fileName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {resolved ? (
            <a
              href={resolved}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
            >
              <Download className="h-4 w-4" /> Download
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg ring-focus"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="min-h-[50vh] flex-1 overflow-auto bg-surface-2/30 p-4">
        {!resolved ? (
          <p className="py-12 text-center text-sm text-muted">Loading preview…</p>
        ) : canEmbedPdf ? (
          <iframe
            title={title}
            src={resolved}
            className="h-[min(70vh,720px)] w-full rounded-md border border-border bg-white"
          />
        ) : canShowImage ? (
          <img
            src={resolved}
            alt={title}
            className="mx-auto max-h-[70vh] w-auto max-w-full rounded-md object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <FileText className="h-12 w-12 text-muted" />
            <p className="max-w-sm text-sm text-muted">
              Preview is not available for this file type in the browser. Download the file to open
              it on your device.
            </p>
            <a
              href={resolved}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Download className="h-4 w-4" /> Download file
            </a>
          </div>
        )}
      </div>
    </>
  )
}

export function DocumentPreviewModal({
  open,
  onClose,
  title,
  fileName,
  url,
}: {
  open: boolean
  onClose: () => void
  title: string
  fileName: string
  url: string | null
}) {
  if (!open || !url) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${title}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-xl border border-border bg-surface shadow-elevated sm:rounded-xl">
        <DocumentPreviewBody key={url} fileName={fileName} url={url} title={title} onClose={onClose} />
      </div>
    </div>
  )
}
