import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getPortalFileBlobUrl, getPortalFileSignedUrl } from '@/lib/supabase/fileStorage'
import type { CandidateAttachment } from '@/types/hr'
import { detectDocumentPreviewKind } from '@/utils/documentPreview'

function kindLabel(kind: CandidateAttachment['kind']): string {
  if (kind === 'cover_letter') return 'Cover letter'
  if (kind === 'resume') return 'Resume / CV'
  return 'Attachment'
}

/** Renders a stored ATS attachment as the original file (PDF / DOCX / image). */
export function AtsAttachmentPreview({ attachment }: { attachment: CandidateAttachment }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const docxHost = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false

    void (async () => {
      setLoading(true)
      setError(null)
      setUrl(null)
      if (!supabase) {
        setError('File storage is unavailable.')
        setLoading(false)
        return
      }
      const signed = await getPortalFileSignedUrl(supabase, attachment.storagePath)
      const blobUrl = signed ? null : await getPortalFileBlobUrl(supabase, attachment.storagePath)
      const resolved = signed || blobUrl
      if (cancelled) {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
        return
      }
      if (!resolved) {
        setError('Could not load this file.')
        setLoading(false)
        return
      }
      if (blobUrl) revoked = blobUrl
      setUrl(resolved)
      setLoading(false)
    })()

    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [attachment.storagePath])

  useEffect(() => {
    if (!url || !docxHost.current) return
    const kind = detectDocumentPreviewKind(attachment.filename, attachment.filename)
    if (kind !== 'docx') return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Could not load file (${res.status})`)
        const buffer = await res.arrayBuffer()
        if (cancelled || !docxHost.current) return
        docxHost.current.innerHTML = ''
        const { renderAsync } = await import('docx-preview')
        await renderAsync(buffer, docxHost.current, undefined, {
          className: 'av-docx-preview',
          inWrapper: true,
          ignoreWidth: true,
          breakPages: true,
        })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not preview Word file')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url, attachment.filename])

  const kind = detectDocumentPreviewKind(attachment.filename, attachment.filename)

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{kindLabel(attachment.kind)}</p>
          <p className="truncate text-sm text-fg">{attachment.filename}</p>
        </div>
        {url ? (
          <a
            href={url}
            download={attachment.filename}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        ) : null}
      </div>
      <div className="min-h-[16rem] bg-white p-2">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading file…
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted">
            <FileText className="h-8 w-8" />
            {error}
          </div>
        ) : kind === 'pdf' && url ? (
          <iframe title={attachment.filename} src={url} className="h-[min(70vh,36rem)] w-full border-0" />
        ) : kind === 'image' && url ? (
          <img src={url} alt={attachment.filename} className="mx-auto max-h-[min(70vh,36rem)] max-w-full object-contain" />
        ) : kind === 'docx' ? (
          <div ref={docxHost} className="max-h-[min(70vh,36rem)] overflow-auto bg-white p-2 text-black" />
        ) : url ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-muted">
            <FileText className="h-8 w-8" />
            Preview not available for this file type.
            <a href={url} download={attachment.filename} className="text-accent hover:underline">
              Download {attachment.filename}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  )
}
