import { useEffect, useRef, useState } from 'react'
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { downloadPortalFile, resolvePortalFilePreviewUrl } from '@/lib/supabase/fileStorage'
import { notifyError, notifySuccess } from '@/lib/notify'
import type { CandidateAttachment } from '@/types/hr'
import { detectDocumentPreviewKind } from '@/utils/documentPreview'

function kindLabel(kind: CandidateAttachment['kind']): string {
  if (kind === 'cover_letter') return 'Cover letter'
  if (kind === 'resume') return 'Resume / CV'
  return 'Attachment'
}

function isMobileLike(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.matchMedia('(max-width: 768px)').matches
}

/** Renders a stored ATS attachment as the original file (PDF / DOCX / image). */
export function AtsAttachmentPreview({
  attachment,
  embedded = false,
}: {
  attachment: CandidateAttachment
  /** When true, hide the outer card chrome (used inside reading-pane chips). */
  embedded?: boolean
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const docxHost = useRef<HTMLDivElement>(null)
  const revokeRef = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    revokeRef.current?.()
    revokeRef.current = undefined

    void (async () => {
      setLoading(true)
      setError(null)
      setUrl(null)
      if (!supabase) {
        setError('File storage is unavailable.')
        setLoading(false)
        return
      }
      if (!attachment.storagePath) {
        setError('This file was not saved. Sync Gmail again to upload it.')
        setLoading(false)
        return
      }
      const resolved = await resolvePortalFilePreviewUrl(
        supabase,
        attachment.storagePath,
        attachment.filename,
      )
      if (cancelled) {
        if (resolved && 'revoke' in resolved) resolved.revoke?.()
        return
      }
      if (!resolved?.url) {
        setError(
          (resolved && 'error' in resolved && resolved.error) ||
            'Could not load this file. Sync again or run the ATS storage SQL migration.',
        )
        setLoading(false)
        return
      }
      revokeRef.current = resolved.revoke
      setUrl(resolved.url)
      setLoading(false)
    })()

    return () => {
      cancelled = true
      revokeRef.current?.()
      revokeRef.current = undefined
    }
  }, [attachment.storagePath, attachment.filename])

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
  const mobile = isMobileLike()

  const handleDownload = async () => {
    if (!supabase || !attachment.storagePath) return
    setDownloading(true)
    const result = await downloadPortalFile(supabase, attachment.storagePath, attachment.filename)
    setDownloading(false)
    if ('error' in result) notifyError(result.error)
    else notifySuccess(`Downloading ${attachment.filename}`)
  }

  const handleOpen = () => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {url ? (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-fg hover:bg-surface-2"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </button>
      ) : null}
      {attachment.storagePath ? (
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={downloading}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-accent hover:bg-surface-2 disabled:opacity-60"
        >
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download
        </button>
      ) : null}
    </div>
  )

  const previewBody = (
    <div className={embedded ? 'min-h-[12rem] bg-white' : 'min-h-[16rem] bg-white p-2'}>
      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading file…
        </div>
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 px-3 text-center text-sm text-muted">
          <FileText className="h-8 w-8" />
          <p>{error}</p>
          {attachment.storagePath ? actions : null}
        </div>
      ) : kind === 'pdf' && url ? (
        mobile ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 px-3 text-center text-sm text-muted">
            <FileText className="h-8 w-8" />
            <p>PDF preview works best in a new tab on phones.</p>
            {actions}
          </div>
        ) : (
          <object
            data={url}
            type="application/pdf"
            title={attachment.filename}
            className="h-[min(70vh,36rem)] w-full border-0"
          >
            <iframe title={attachment.filename} src={url} className="h-[min(70vh,36rem)] w-full border-0" />
          </object>
        )
      ) : kind === 'image' && url ? (
        <img src={url} alt={attachment.filename} className="mx-auto max-h-[min(70vh,36rem)] max-w-full object-contain" />
      ) : kind === 'docx' ? (
        <div ref={docxHost} className="max-h-[min(70vh,36rem)] overflow-auto bg-white p-2 text-black" />
      ) : url ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-muted">
          <FileText className="h-8 w-8" />
          Preview not available for this file type.
          {actions}
        </div>
      ) : null}
    </div>
  )

  if (embedded) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end px-1">{actions}</div>
        {previewBody}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{kindLabel(attachment.kind)}</p>
          <p className="truncate text-sm text-fg">{attachment.filename}</p>
        </div>
        {actions}
      </div>
      {previewBody}
    </div>
  )
}
