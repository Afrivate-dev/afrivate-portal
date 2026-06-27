import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { TaskCategoryItem } from '@/types'

export function ManageLabelCategoriesModal({
  open,
  onClose,
  title,
  description,
  items,
  onAdd,
  onUpdate,
  onDelete,
}: {
  open: boolean
  onClose: () => void
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

  const reset = () => {
    setDraft('')
    setEditId(null)
    setEditLabel('')
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={title}
      description={description}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label="New label"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Marketing"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!draft.trim()}
            onClick={() => {
              onAdd(draft.trim())
              setDraft('')
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        <ul className="divide-y divide-border rounded-md border border-border">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted">No labels yet.</li>
          ) : (
            items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                {editId === item.id ? (
                  <>
                    <Input
                      label=""
                      aria-label="Edit label"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
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
                    <span className="min-w-0 flex-1 text-sm font-medium text-fg">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(item.id)
                        setEditLabel(item.label)
                      }}
                      className="rounded p-1.5 text-muted hover:bg-surface-2 ring-focus"
                      aria-label={`Edit ${item.label}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger ring-focus"
                      aria-label={`Delete ${item.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </Modal>
  )
}
