import { useEffect, useRef, useState } from 'react'
import { Download, Expand, ExternalLink, FileText } from 'lucide-react'
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal'
import {
  buildHtmlAssetMap,
  canPreviewPdfInline,
  detectDocumentPreviewKind,
  rewriteHtmlAssetUrls,
  sanitizeHtmlDocument,
} from '@/utils/documentPreview'
import { isStorageReference, resolveStorageReference } from '@/utils/mediaUpload'
import type { AnnouncementMedia } from '@/types'
import { cn } from '@/utils/helpers'

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

/**
 * Renders an uploaded HTML/PDF/DOCX as the memo body (not a side attachment).
 */
export function MemoDocumentBody({
  item,
  siblings,
  className,
  compact,
}: {
  item: AnnouncementMedia
  siblings?: AnnouncementMedia[]
  className?: string
  /** Shorter height for feed cards */
  compact?: boolean
}) {
  const fileName = item.fileName ?? 'document'
  const kind = detectDocumentPreviewKind(fileName, item.url)
  const [resolved, setResolved] = useState<string | null>(() =>
    isStorageReference(item.url) ? null : item.url,
  )
  const [error, setError] = useState('')
  const [fullOpen, setFullOpen] = useState(false)
  const heightClass = compact ? 'h-[min(52vh,420px)]' : 'h-[min(70vh,720px)]'

  useEffect(() => {
    if (!isStorageReference(item.url)) {
      setResolved(item.url)
      setError('')
      return
    }
    let cancelled = false
    setResolved(null)
    setError('')
    void resolveStorageReference(item.url).then((next) => {
      if (cancelled) return
      if (!next || next === item.url) {
        setError('Could not open this file.')
        setResolved(null)
        return
      }
      setResolved(next)
    })
    return () => {
      cancelled = true
    }
  }, [item.url])

  return (
    <div className={cn('space-y-2', className)} onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="truncate text-xs text-muted">
          <FileText className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
          {fileName}
        </p>
        <button
          type="button"
          onClick={() => setFullOpen(true)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 ring-focus"
        >
          <Expand className="h-3.5 w-3.5" />
          Full screen
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-border bg-surface-2/40 px-3 py-8 text-center text-sm text-muted">
          {error}
        </p>
      ) : !resolved ? (
        <p className="py-10 text-center text-sm text-muted">Loading document…</p>
      ) : kind === 'html' ? (
        <InlineHtml
          resolved={resolved}
          url={item.url}
          siblings={siblings}
          heightClass={heightClass}
        />
      ) : kind === 'pdf' ? (
        canPreviewPdfInline() ? (
          <iframe
            title={fileName}
            src={resolved}
            className={cn('w-full rounded-md border border-border bg-white', heightClass)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface-2/30 px-4 py-10 text-center">
            <FileText className="h-10 w-10 text-muted" />
            <p className="text-sm text-muted">
              This device opens PDFs in its own viewer. Tap below to read the memo.
            </p>
            <a
              href={resolved}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <ExternalLink className="h-4 w-4" />
              Open PDF
            </a>
          </div>
        )
      ) : kind === 'docx' ? (
        <InlineDocx resolved={resolved} fileName={fileName} heightClass={heightClass} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface-2/30 px-4 py-10 text-center">
          <FileText className="h-10 w-10 text-muted" />
          <p className="text-sm text-muted">
            Preview isn’t available for this file type. Download it to read the memo.
          </p>
          <a
            href={resolved}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
          >
            <Download className="h-4 w-4" />
            Download {fileName}
          </a>
        </div>
      )}

      <DocumentPreviewModal
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        title={fileName}
        fileName={fileName}
        url={item.url}
        siblings={siblings}
      />
    </div>
  )
}

function InlineHtml({
  resolved,
  url,
  siblings,
  heightClass,
}: {
  resolved: string
  url: string
  siblings?: AnnouncementMedia[]
  heightClass: string
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
        if (!cancelled) setError('Could not load this HTML memo.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolved, url, siblings])

  if (error) return <p className="py-8 text-center text-sm text-muted">{error}</p>
  if (!srcDoc) return <p className="py-8 text-center text-sm text-muted">Loading…</p>

  return (
    <iframe
      title="Memo"
      srcDoc={srcDoc}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className={cn('w-full rounded-md border border-border bg-white', heightClass)}
    />
  )
}

function InlineDocx({
  resolved,
  fileName,
  heightClass,
}: {
  resolved: string
  fileName: string
  heightClass: string
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState('')
  const [frameReady, setFrameReady] = useState(false)

  useEffect(() => {
    if (!frameReady) return
    let cancelled = false
    const iframe = iframeRef.current
    if (!iframe) return

    void (async () => {
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
        if (!cancelled) setError('Could not render this Word document.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [resolved, frameReady])

  if (error) return <p className="py-8 text-center text-sm text-muted">{error}</p>

  return (
    <iframe
      ref={iframeRef}
      title={`Memo: ${fileName}`}
      srcDoc="<!DOCTYPE html><html><body></body></html>"
      onLoad={() => setFrameReady(true)}
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      className={cn('w-full rounded-md border border-border bg-white', heightClass)}
    />
  )
}
