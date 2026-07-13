import { File as FileIcon, Film, Image as ImageIcon, Loader2, Link2, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { PortalMediaGallery } from '@/components/shared/PortalMediaGallery'
import {
  MediaUploadError,
  parseMediaUrlInput,
  uploadAnnouncementMedia,
} from '@/utils/mediaUpload'
import { MAX_MEMO_ATTACHMENT_BYTES } from '@/utils/documentPreview'
import type { AnnouncementMedia } from '@/types'

/** @deprecated use PortalMediaGallery */
export const AnnouncementMediaGallery = PortalMediaGallery

const labels = {
  heading: 'Attachments',
  urlPlaceholder: 'https://… (image, YouTube, Vimeo, or document link)',
  addLink: 'Add link',
  upload: 'Upload PDF, Word, HTML, or photo',
  uploading: 'Uploading…',
  help: 'Upload photos or files (PDF, Word .docx, HTML, and more). After publish, people can tap the attachment to preview it in the portal. For HTML that uses local images, upload those image files on this same memo too. Video files are not supported — paste a YouTube/Vimeo link instead.',
  remove: 'Remove',
}

export function MediaAttachmentEditor({
  items,
  onChange,
}: {
  items: AnnouncementMedia[]
  onChange: (next: AnnouncementMedia[]) => void
}) {
  const { user } = useAuth()
  const [urlDraft, setUrlDraft] = useState('')
  const [urlError, setUrlError] = useState('')
  const [busy, setBusy] = useState(false)

  const addUrl = () => {
    const parsed = parseMediaUrlInput(urlDraft)
    if (!parsed) {
      setUrlError('Use a full https link to an image, YouTube/Vimeo video, or document.')
      return
    }
    setUrlError('')
    onChange([...items, parsed])
    setUrlDraft('')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    const blockedVideo = files.filter((f) => f.type.startsWith('video/'))
    const tooLarge = files.filter((f) => !f.type.startsWith('video/') && f.size > MAX_MEMO_ATTACHMENT_BYTES)
    const allowed = files.filter(
      (f) => !f.type.startsWith('video/') && f.size <= MAX_MEMO_ATTACHMENT_BYTES,
    )

    if (!allowed.length) {
      if (blockedVideo.length && !tooLarge.length) {
        setUrlError('Video files cannot be uploaded. Paste a YouTube, Vimeo, or direct video link instead.')
      } else if (tooLarge.length) {
        setUrlError('Each file must be 50 MB or smaller.')
      }
      return
    }

    setBusy(true)
    setUrlError('')
    const uploaded: AnnouncementMedia[] = []
    const failures: string[] = []
    try {
      for (const file of allowed) {
        try {
          const row = await uploadAnnouncementMedia(file, user?.id)
          uploaded.push({ ...row, fileName: file.name })
        } catch (err) {
          failures.push(
            err instanceof MediaUploadError
              ? `${file.name}: ${err.message}`
              : `${file.name}: upload failed`,
          )
        }
      }
      if (uploaded.length) onChange([...items, ...uploaded])
      const notes: string[] = []
      if (blockedVideo.length) notes.push('Video files were skipped — paste a YouTube/Vimeo link instead.')
      if (tooLarge.length) notes.push('Some files were over 50 MB and were skipped.')
      if (failures.length) notes.push(failures[0]!)
      if (notes.length) setUrlError(notes.join(' '))
    } finally {
      setBusy(false)
    }
  }

  const kindIcon = (kind: AnnouncementMedia['kind'], embedUrl?: string) => {
    if (kind === 'image') return ImageIcon
    if (kind === 'video' || embedUrl) return Film
    return FileIcon
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface-2/20 p-3">
      <p className="text-sm font-medium text-fg">{labels.heading}</p>
      <p className="text-xs text-muted">{labels.help}</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            label={labels.addLink}
            value={urlDraft}
            onChange={(e) => {
              setUrlDraft(e.target.value)
              setUrlError('')
            }}
            placeholder={labels.urlPlaceholder}
            leadingIcon={<Link2 className="h-4 w-4" />}
          />
        </div>
        <Button type="button" variant="secondary" onClick={addUrl} disabled={!urlDraft.trim()} className="w-full sm:w-auto">
          {labels.addLink}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.html,.htm,.txt,.md,.csv,.rtf,.zip,*/*"
            className="sr-only"
            onChange={onFile}
            disabled={busy}
          />
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? labels.uploading : labels.upload}
          </span>
        </label>
      </div>

      {urlError ? <p className="text-xs text-danger">{urlError}</p> : null}

      {items.length > 0 ? (
        <>
          <PortalMediaGallery media={items} compact />
          <ul className="space-y-2 border-t border-border pt-3">
            {items.map((m, idx) => {
              const Icon = kindIcon(m.kind, m.embedUrl)
              return (
                <li
                  key={`${m.url}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 text-muted">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-fg">{m.fileName ?? m.url}</span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-muted hover:bg-danger/10 hover:text-danger ring-focus"
                    aria-label={labels.remove}
                    onClick={() => onChange(items.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </div>
  )
}
