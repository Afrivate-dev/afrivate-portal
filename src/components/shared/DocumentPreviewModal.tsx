import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, FileText, X } from 'lucide-react'
import {
  buildHtmlAssetMap,
  detectDocumentPreviewKind,
  rewriteHtmlAssetUrls,
  sanitizeHtmlDocument,
  type DocumentPreviewKind,
} from '@/utils/documentPreview'
import {
  isStorageReference,
  resolveStorageReference,
} from '@/utils/mediaUpload'
import type { AnnouncementMedia } from '@/types'

async function fetchAsText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load file (${res.status})`)
  return res.text()
}

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load file (${res.status})`)
  return res.arrayBuffer()
}

function PreviewChrome({
  title,
  fileName,
  resolved,
  onClose,
  children,
}: {
  title: string
  fileName: string
  resolved: string | null
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-fg">{title}</h2>
          <p className="truncate text-xs text-muted">{fileName}</p>
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
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
      <div className="min-h-[50vh] flex-1 overflow-auto bg-surface-2/30 p-4">{children}</div>
    </>
  )
}

function DownloadFallback({
  resolved,
  fileName,
  message,
}: {
  resolved: string
  fileName: string
  message: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <FileText className="h-12 w-12 text-muted" />
      <p className="max-w-sm text-sm text-muted">{message}</p>
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
  )
}

function HtmlPreview({
  resolved,
  url,
  siblings,
  fileName,
}: {
  resolved: string
  url: string
  siblings?: AnnouncementMedia[]
  fileName: string
}) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [raw, assets] = await Promise.all([
          fetchAsText(resolved),
          buildHtmlAssetMap(siblings, url),
        ])
        if (cancelled) return
        setSrcDoc(sanitizeHtmlDocument(rewriteHtmlAssetUrls(raw, assets)))
      } catch {
        if (!cancelled) setError('Could not load this HTML file for preview.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolved, url, siblings])

  if (error) {
    return <DownloadFallback resolved={resolved} fileName={fileName} message={error} />
  }
  if (!srcDoc) {
    return <p className="py-12 text-center text-sm text-muted">Loading HTML preview…</p>
  }

  return (
    <iframe
      title="HTML preview"
      srcDoc={srcDoc}
      // No allow-scripts / allow-same-origin — uploaded HTML must stay inert.
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="h-[min(70vh,720px)] w-full rounded-md border border-border bg-white"
    />
  )
}

function DocxPreview({ resolved, fileName }: { resolved: string; fileName: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [frameReady, setFrameReady] = useState(false)

  useEffect(() => {
    if (!frameReady) return
    let cancelled = false
    const iframe = iframeRef.current
    if (!iframe) return

    void (async () => {
      setLoading(true)
      setError('')
      try {
        const [{ renderAsync }, buffer] = await Promise.all([
          import('docx-preview'),
          fetchAsArrayBuffer(resolved),
        ])
        if (cancelled) return

        const idoc = iframe.contentDocument
        if (!idoc) throw new Error('Preview frame unavailable')
        idoc.open()
        idoc.write(
          '<!DOCTYPE html><html><head><meta charset="utf-8" /><style>body{margin:0;background:#fff;color:#111;font-family:system-ui,sans-serif}</style></head><body></body></html>',
        )
        idoc.close()
        await renderAsync(buffer, idoc.body, undefined, {
          className: 'av-docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        })
      } catch {
        if (!cancelled) setError('Could not render this Word document in the browser.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [resolved, frameReady])

  return (
    <div className="space-y-3">
      {loading ? <p className="text-center text-sm text-muted">Loading Word preview…</p> : null}
      {error ? <DownloadFallback resolved={resolved} fileName={fileName} message={error} /> : null}
      <iframe
        ref={iframeRef}
        title={`Word preview: ${fileName}`}
        srcDoc="<!DOCTYPE html><html><body></body></html>"
        onLoad={() => setFrameReady(true)}
        // allow-same-origin needed so we can write the rendered DOCX into the frame;
        // scripts stay disabled.
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        className={
          error
            ? 'hidden'
            : 'h-[min(70vh,720px)] w-full rounded-md border border-border bg-white'
        }
      />
    </div>
  )
}

function DocumentPreviewBody({
  fileName,
  url,
  title,
  onClose,
  siblings,
}: {
  fileName: string
  url: string
  title: string
  onClose: () => void
  siblings?: AnnouncementMedia[]
}) {
  const [resolved, setResolved] = useState<string | null>(() =>
    isStorageReference(url) ? null : url,
  )
  const [resolveError, setResolveError] = useState('')
  const kind: DocumentPreviewKind = detectDocumentPreviewKind(fileName, url)

  useEffect(() => {
    if (!isStorageReference(url)) {
      setResolved(url)
      setResolveError('')
      return
    }
    let cancelled = false
    setResolved(null)
    setResolveError('')
    void resolveStorageReference(url).then((next) => {
      if (cancelled) return
      if (!next || next === url) {
        setResolveError('Could not open this file. Try downloading it, or check your connection.')
        setResolved(null)
        return
      }
      setResolved(next)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <PreviewChrome title={title} fileName={fileName} resolved={resolved} onClose={onClose}>
      {resolveError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <FileText className="h-12 w-12 text-muted" />
          <p className="max-w-sm text-sm text-muted">{resolveError}</p>
        </div>
      ) : !resolved ? (
        <p className="py-12 text-center text-sm text-muted">Loading preview…</p>
      ) : kind === 'pdf' ? (
        <iframe
          title={title}
          src={resolved}
          className="h-[min(70vh,720px)] w-full rounded-md border border-border bg-white"
        />
      ) : kind === 'html' ? (
        <HtmlPreview resolved={resolved} url={url} siblings={siblings} fileName={fileName} />
      ) : kind === 'docx' ? (
        <DocxPreview resolved={resolved} fileName={fileName} />
      ) : kind === 'image' ? (
        <img
          src={resolved}
          alt={title}
          className="mx-auto max-h-[70vh] w-auto max-w-full rounded-md object-contain"
        />
      ) : (
        <DownloadFallback
          resolved={resolved}
          fileName={fileName}
          message="Preview is not available for this file type in the browser. Download the file to open it on your device."
        />
      )}
    </PreviewChrome>
  )
}

export function DocumentPreviewModal({
  open,
  onClose,
  title,
  fileName,
  url,
  siblings,
}: {
  open: boolean
  onClose: () => void
  title: string
  fileName: string
  url: string | null
  /** Other attachments on the same memo — used so HTML relative images/css resolve. */
  siblings?: AnnouncementMedia[]
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !url) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${title}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-xl border border-border bg-surface shadow-elevated sm:rounded-xl">
        <DocumentPreviewBody
          key={url}
          fileName={fileName}
          url={url}
          title={title}
          onClose={onClose}
          siblings={siblings}
        />
      </div>
    </div>
  )
}
