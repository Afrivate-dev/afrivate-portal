import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, FileText, Loader2, Paperclip } from 'lucide-react'
import { AtsAttachmentPreview } from '@/components/shared/AtsAttachmentPreview'
import { formatFileSize, getPortalFileBlobUrl, getPortalFileSignedUrl } from '@/lib/supabase/fileStorage'
import { supabase } from '@/lib/supabase'
import {
  buildEmailPreviewDocument,
  looksLikeHtmlMarkup,
  plainTextToEmailHtml,
  splitApplicationNotes,
} from '@/lib/atsEmailHtml'
import type { CandidateAttachment, JobCandidate } from '@/types/hr'

function parseEmailHeaders(text: string): { subject?: string; from?: string; date?: string; body: string } {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let subject: string | undefined
  let from: string | undefined
  let date: string | undefined
  let i = 0
  for (; i < Math.min(lines.length, 12); i += 1) {
    const line = lines[i] ?? ''
    const sub = line.match(/^Subject:\s*(.+)$/i)
    if (sub) {
      subject = sub[1]?.trim()
      continue
    }
    const fr = line.match(/^From:\s*(.+)$/i)
    if (fr) {
      from = fr[1]?.trim()
      continue
    }
    const dt = line.match(/^Date:\s*(.+)$/i)
    if (dt) {
      date = dt[1]?.trim()
      continue
    }
    if (line.trim() === '') {
      i += 1
      break
    }
    // Stop header scan once body content starts
    if (!/^(Subject|From|Date|To|Cc|Reply-To):/i.test(line)) break
  }
  const body = lines.slice(i).join('\n').replace(/\n---\s*Resume:[\s\S]*$/i, '').trim()
  return { subject, from, date, body }
}

function AttachmentChip({
  attachment,
  expanded,
  onToggle,
}: {
  attachment: CandidateAttachment
  expanded: boolean
  onToggle: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    void (async () => {
      if (!supabase) return
      const signed = await getPortalFileSignedUrl(supabase, attachment.storagePath)
      const blobUrl = signed ? null : await getPortalFileBlobUrl(supabase, attachment.storagePath)
      if (cancelled) {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
        return
      }
      if (blobUrl) revoked = blobUrl
      setUrl(signed || blobUrl)
    })()
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [attachment.storagePath])

  const kind =
    attachment.kind === 'cover_letter'
      ? 'Cover letter'
      : attachment.kind === 'resume'
        ? 'Resume / CV'
        : 'Attachment'

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <Paperclip className="h-4 w-4 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{attachment.filename}</p>
          <p className="text-[11px] text-muted">
            {kind}
            {attachment.size ? ` · ${formatFileSize(attachment.size)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {url ? (
            <a
              href={url}
              download={attachment.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-fg hover:bg-surface-2"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/15"
          >
            {expanded ? (
              <>
                Hide preview <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Preview <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="border-t border-border p-2">
          <AtsAttachmentPreview attachment={attachment} embedded />
        </div>
      ) : null}
    </div>
  )
}

/** Gmail-style reading pane: headers, HTML body, attachment chips with preview/download. */
export function AtsEmailReadingPane({ candidate }: { candidate: JobCandidate }) {
  const { text, html } = useMemo(() => splitApplicationNotes(candidate.notes), [candidate.notes])
  const headers = useMemo(() => parseEmailHeaders(text), [text])
  const [expandedId, setExpandedId] = useState<string | null>(
    candidate.attachments?.[0]?.id ?? null,
  )

  const emailDoc = useMemo(() => {
    if (html?.trim()) return buildEmailPreviewDocument(html)
    if (looksLikeHtmlMarkup(headers.body)) return buildEmailPreviewDocument(headers.body)
    if (headers.body.trim()) return buildEmailPreviewDocument(plainTextToEmailHtml(headers.body))
    return null
  }, [html, headers.body])

  const subject = headers.subject || '(No subject)'
  const from = headers.from || candidate.email || 'Unknown sender'
  const when = headers.date || (candidate.appliedAt ? new Date(candidate.appliedAt).toLocaleString() : '')

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border bg-[#f8f9fa] px-4 py-3">
        <p className="text-base font-semibold text-[#202124]">{subject}</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#202124]">{from}</p>
            <p className="text-xs text-[#5f6368]">to me · Afrivate HR</p>
          </div>
          {when ? <p className="shrink-0 text-xs text-[#5f6368]">{when}</p> : null}
        </div>
      </div>

      {(candidate.attachments?.length ?? 0) > 0 ? (
        <div className="space-y-2 border-b border-border bg-[#fafafa] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#5f6368]">
            {candidate.attachments!.length} attachment{candidate.attachments!.length === 1 ? '' : 's'}
          </p>
          {candidate.attachments!.map((att) => (
            <AttachmentChip
              key={att.id}
              attachment={att}
              expanded={expandedId === att.id}
              onToggle={() => setExpandedId((id) => (id === att.id ? null : att.id))}
            />
          ))}
        </div>
      ) : null}

      {emailDoc ? (
        <iframe
          title={`Email from ${candidate.name}`}
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          referrerPolicy="no-referrer"
          className="h-[min(65vh,32rem)] w-full border-0 bg-white"
          srcDoc={emailDoc}
        />
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-sm text-muted">
          <FileText className="h-8 w-8" />
          {(candidate.attachments?.length ?? 0) > 0
            ? 'No message body — open an attachment above.'
            : 'No email content stored. Sync again to pull the original message.'}
        </div>
      )}
    </div>
  )
}
