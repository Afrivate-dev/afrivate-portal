import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import type { TaskCategoryItem } from '@/types'

/** Compact HR/admin label list — add, rename, delete. */
export function InlineCategoryManager({
  title,
  description,
  items,
  onAdd,
  onUpdate,
  onDelete,
}: {
  title: string
  description: string
  items: TaskCategoryItem[]
  onAdd: (label: string) => void
  onUpdate: (id: string, label: string) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  return (
    <Card padding="md" className="h-full">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 text-xs text-muted">{description}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="New"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Label name"
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!draft.trim()}
          onClick={() => {
            onAdd(draft.trim())
            setDraft('')
          }}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <ul className="mt-3 max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border">
        {items.length === 0 ? (
          <li className="px-3 py-4 text-center text-xs text-muted">No items yet.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2">
              {editId === item.id ? (
                <>
                  <Input
                    aria-label="Edit label"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={!editLabel.trim()}
                    onClick={() => {
                      onUpdate(item.id, editLabel.trim())
                      setEditId(null)
                    }}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(item.id)
                      setEditLabel(item.label)
                    }}
                    className="rounded p-1.5 text-muted hover:bg-surface-2 ring-focus"
                    aria-label={`Edit ${item.label}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger ring-focus"
                    aria-label={`Delete ${item.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </Card>
  )
}
