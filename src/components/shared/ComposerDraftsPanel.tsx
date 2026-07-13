import { FilePenLine, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { relativeTime } from '@/utils/helpers'
import type { ComposerDraft } from '@/lib/composerDrafts'

export function ComposerDraftsPanel({
  title = 'Saved drafts',
  description = 'Saved on this device — resume anytime without posting.',
  drafts,
  onResume,
  onDelete,
  emptyHint,
}: {
  title?: string
  description?: string
  drafts: ComposerDraft[]
  onResume: (draft: ComposerDraft) => void
  onDelete: (id: string) => void
  emptyHint?: string
}) {
  if (drafts.length === 0 && !emptyHint) return null

  return (
    <Card padding="md">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          <p className="text-xs text-muted">{description}</p>
        </div>
        {drafts.length > 0 ? (
          <span className="text-xs font-medium tabular-nums text-muted">{drafts.length} saved</span>
        ) : null}
      </div>
      {drafts.length === 0 ? (
        <p className="text-sm text-muted">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {drafts.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{d.label}</p>
                <p className="text-[11px] text-muted">Updated {relativeTime(d.updatedAt)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="secondary" type="button" onClick={() => onResume(d)}>
                  <FilePenLine className="h-3.5 w-3.5" /> Resume
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => onDelete(d.id)}
                  aria-label={`Delete draft ${d.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
