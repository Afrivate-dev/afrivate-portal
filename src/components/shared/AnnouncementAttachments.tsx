import { Image as ImageIcon, Film, Loader2, Link2, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  MediaUploadError,
  parseMediaUrlInput,
  uploadAnnouncementMedia,
} from '@/utils/mediaUpload'
import type { AnnouncementMedia } from '@/types'
import { cn } from '@/utils/helpers'

export function AnnouncementMediaGallery({
  media,
  compact,
}: {
  media?: AnnouncementMedia[]
  compact?: boolean
}) {
  if (!media?.length) return null

  return (
    <div
      className={cn(
        'grid gap-2',
        compact ? 'mt-3 grid-cols-2 sm:grid-cols-3' : 'mt-3 grid-cols-1 sm:grid-cols-2',
      )}
    >
      {media.map((m, i) => (
        <figure key={`${m.url}-${i}`} className="overflow-hidden rounded-md border border-border bg-surface-2/30">
          {m.kind === 'image' ? (
            <img
              src={m.url}
              alt=""
              className={cn(
                'w-full object-cover',
                compact ? 'max-h-28' : 'max-h-56',
              )}
              loading="lazy"
            />
          ) : (
            <video
              src={m.url}
              controls
              className={cn('w-full bg-black', compact ? 'max-h-36' : 'max-h-64')}
              preload="metadata"
            />
          )}
          {m.caption ? (
            <figcaption className="px-2 py-1 text-[11px] text-muted">{m.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  )
}

const labels = {
  heading: 'Images & video',
  urlPlaceholder: 'https://www.afrivate.org/uploads/…',
  addLink: 'Add link',
  upload: 'Upload file',
  uploading: 'Uploading…',
  help: 'Upload sends files to your company hosting, same as other workspace media. You can always paste a direct https link instead.',
  remove: 'Remove',
}

export function MediaAttachmentEditor({
  items,
  onChange,
}: {
  items: AnnouncementMedia[]
  onChange: (next: AnnouncementMedia[]) => void
}) {
  const [urlDraft, setUrlDraft] = useState('')
  const [urlError, setUrlError] = useState('')
  const [busy, setBusy] = useState(false)

  const addUrl = () => {
    const parsed = parseMediaUrlInput(urlDraft)
    if (!parsed) {
      setUrlError('Use a full https link to an image or video file.')
      return
    }
    setUrlError('')
    onChange([...items, parsed])
    setUrlDraft('')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setUrlError('')
    try {
      const row = await uploadAnnouncementMedia(file)
      onChange([...items, row])
    } catch (err) {
      setUrlError(err instanceof MediaUploadError ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface-2/20 p-3">
      <p className="text-sm font-medium text-fg">{labels.heading}</p>
      <p className="text-xs text-muted">{labels.help}</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
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
        <Button type="button" variant="secondary" onClick={addUrl} disabled={!urlDraft.trim()}>
          {labels.addLink}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer">
          <input type="file" accept="image/*,video/*" className="sr-only" onChange={onFile} disabled={busy} />
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? labels.uploading : labels.upload}
          </span>
        </label>
      </div>

      {urlError ? <p className="text-xs text-danger">{urlError}</p> : null}

      {items.length > 0 ? (
        <ul className="space-y-2 border-t border-border pt-3">
          {items.map((m, idx) => (
            <li
              key={`${m.url}-${idx}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-muted">
                {m.kind === 'image' ? (
                  <ImageIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <Film className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate text-fg">{m.url}</span>
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
          ))}
        </ul>
      ) : null}
    </div>
  )
}
