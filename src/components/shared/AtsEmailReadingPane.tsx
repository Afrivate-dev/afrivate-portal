import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, FileText, Loader2, Paperclip } from 'lucide-react'
import { AtsAttachmentPreview } from '@/components/shared/AtsAttachmentPreview'
import { formatFileSize, downloadPortalFile, resolvePortalFilePreviewUrl } from '@/lib/supabase/fileStorage'
import { notifyError } from '@/lib/notify'
import { supabase } from '@/lib/supabase'
import {
  buildEmailPreviewDocument,
  cleanEmailBodyForDisplay,
  extractAttachmentNamesFromNotes,
  isWeakEmailHtml,
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
  for (; i < Math.min(lines.length, 16); i += 1) {
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
    if (!/^(Subject|From|Date|To|Cc|Reply-To):/i.test(line)) break
  }
  const body = lines.slice(i).join('\n').trim()
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
  const [downloading, setDownloading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    let revoke: (() => void) | undefined
    void (async () => {
      if (!supabase || !attachment.storagePath) return
      setLoadError(false)
      const resolved = await resolvePortalFilePreviewUrl(
        supabase,
        attachment.storagePath,
        attachment.filename,
      )
      if (cancelled) {
        resolved?.revoke?.()
        return
      }
      if (!resolved) {
        setLoadError(true)
        return
      }
      revoke = resolved.revoke
      setUrl(resolved.url)
    })()
    return () => {
      cancelled = true
      revoke?.()
    }
  }, [attachment.storagePath, attachment.filename])

  const kind =
    attachment.kind === 'cover_letter'
      ? 'Cover letter'
      : attachment.kind === 'resume'
        ? 'Resume / CV'
        : 'Attachment'
  const canPreview = Boolean(attachment.storagePath)

  const handleDownload = async () => {
    if (!supabase || !attachment.storagePath) return
    setDownloading(true)
    const result = await downloadPortalFile(supabase, attachment.storagePath, attachment.filename)
    setDownloading(false)
    if ('error' in result) notifyError(result.error)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#dadce0] bg-white">
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-[#5f6368]" />
          <div className="min-w-0">
            <p className="break-all text-sm font-medium text-[#202124] sm:truncate sm:break-normal">
              {attachment.filename}
            </p>
            <p className="text-[11px] text-[#5f6368]">
              {kind}
              {attachment.size ? ` · ${formatFileSize(attachment.size)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {canPreview ? (
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="inline-flex items-center gap-1 rounded-md border border-[#dadce0] px-2.5 py-1.5 text-xs text-[#202124] hover:bg-[#f1f3f4] disabled:opacity-60"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download
            </button>
          ) : null}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-[#dadce0] px-2.5 py-1.5 text-xs text-[#202124] hover:bg-[#f1f3f4]"
            >
              Open
            </a>
          ) : null}
          {canPreview ? (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-md bg-[#e8f0fe] px-2.5 py-1.5 text-xs font-medium text-[#1967d2] hover:bg-[#d2e3fc]"
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
          ) : (
            <span className="text-[11px] text-[#5f6368]">File not saved yet — Sync Gmail again</span>
          )}
          {canPreview && !url && !loadError ? (
            <span className="inline-flex items-center gap-1 px-1 text-xs text-[#5f6368]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
          ) : null}
          {loadError ? (
            <span className="text-[11px] text-red-600">Could not load — try Download or re-sync</span>
          ) : null}
        </div>
      </div>
      {expanded && canPreview ? (
        <div className="border-t border-[#dadce0] p-2">
          <AtsAttachmentPreview attachment={attachment} embedded />
        </div>
      ) : null}
    </div>
  )
}

function guessAttachmentKind(filename: string): CandidateAttachment['kind'] {
  const n = filename.toLowerCase()
  if (/(cover|letter|motivation)/i.test(n)) return 'cover_letter'
  if (/(resume|cv|curriculum)/i.test(n)) return 'resume'
  return 'other'
}

/** Gmail-style reading pane: headers, letter body, attachment chips with preview/download. */
export function AtsEmailReadingPane({ candidate }: { candidate: JobCandidate }) {
  const { text, html } = useMemo(() => splitApplicationNotes(candidate.notes), [candidate.notes])
  const headers = useMemo(() => parseEmailHeaders(text), [text])
  const cleanedBody = useMemo(() => cleanEmailBodyForDisplay(headers.body), [headers.body])

  const displayAttachments = useMemo(() => {
    if (candidate.attachments?.length) return candidate.attachments
    // Older imports only stored filenames in notes — show chips so the UI isn't a raw text list
    const names = extractAttachmentNamesFromNotes(text)
    return names.map(
      (filename, i): CandidateAttachment => ({
        id: `name_only_${i}_${filename}`,
        filename,
        mimeType: 'application/octet-stream',
        storagePath: '',
        kind: guessAttachmentKind(filename),
      }),
    )
  }, [candidate.attachments, text])

  const [expandedId, setExpandedId] = useState<string | null>(
    () => displayAttachments.find((a) => a.storagePath)?.id ?? null,
  )

  const emailDoc = useMemo(() => {
    const richHtml = html?.trim()
    if (richHtml && looksLikeHtmlMarkup(richHtml) && !isWeakEmailHtml(richHtml)) {
      return buildEmailPreviewDocument(richHtml)
    }
    if (cleanedBody.trim()) return buildEmailPreviewDocument(plainTextToEmailHtml(cleanedBody))
    return null
  }, [html, cleanedBody])

  const subject = headers.subject || '(No subject)'
  const from = headers.from || candidate.email || 'Unknown sender'
  const when = headers.date || (candidate.appliedAt ? new Date(candidate.appliedAt).toLocaleString() : '')

  return (
    <div className="overflow-hidden rounded-xl border border-[#dadce0] bg-white shadow-sm">
      <div className="border-b border-[#dadce0] bg-[#f8f9fa] px-3 py-3 sm:px-4">
        <p className="break-words text-base font-semibold leading-snug text-[#202124]">{subject}</p>
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2">
          <div className="min-w-0">
            <p className="break-words text-sm font-medium text-[#202124]">{from}</p>
            <p className="text-xs text-[#5f6368]">to me · Afrivate HR</p>
          </div>
          {when ? <p className="shrink-0 text-xs text-[#5f6368]">{when}</p> : null}
        </div>
      </div>

      {displayAttachments.length > 0 ? (
        <div className="space-y-2 border-b border-[#dadce0] bg-[#fafafa] px-3 py-3 sm:px-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#5f6368]">
            {displayAttachments.length} attachment{displayAttachments.length === 1 ? '' : 's'}
          </p>
          {displayAttachments.map((att) => (
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
          className="h-[min(70vh,28rem)] w-full border-0 bg-white sm:h-[min(65vh,32rem)]"
          srcDoc={emailDoc}
        />
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-sm text-[#5f6368]">
          <FileText className="h-8 w-8" />
          {displayAttachments.length > 0
            ? 'No message body — open an attachment above.'
            : 'No email content stored. Sync again to pull the original message.'}
        </div>
      )}
    </div>
  )
}
