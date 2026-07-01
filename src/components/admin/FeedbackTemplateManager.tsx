import { useState } from 'react'
import { MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react'
import { useHr } from '@/context/HrContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import type { FeedbackTemplate, PulseQuestion } from '@/types/hr'
import { uid } from '@/utils/helpers'

const DEFAULT_QUESTIONS: PulseQuestion[] = [
  { id: 'values', text: 'Embodies the Afrivate Way', type: 'scale', min: 1, max: 10 },
  { id: 'collab', text: 'Collaborates effectively', type: 'scale', min: 1, max: 10 },
]

export function FeedbackTemplateManager() {
  const {
    feedbackTemplates,
    addFeedbackTemplate,
    updateFeedbackTemplate,
    deleteFeedbackTemplate,
  } = useHr()
  const [draftOpen, setDraftOpen] = useState(false)
  const [editing, setEditing] = useState<FeedbackTemplate | null>(null)
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [questionsJson, setQuestionsJson] = useState('')

  const openCreate = () => {
    setEditing(null)
    setLabel('')
    setDescription('')
    setQuestionsJson(JSON.stringify(DEFAULT_QUESTIONS, null, 2))
    setDraftOpen(true)
  }

  const openEdit = (t: FeedbackTemplate) => {
    setEditing(t)
    setLabel(t.label)
    setDescription(t.description ?? '')
    setQuestionsJson(JSON.stringify(t.questions, null, 2))
    setDraftOpen(true)
  }

  const closeDraft = () => {
    setDraftOpen(false)
    setEditing(null)
  }

  const parseQuestions = (): PulseQuestion[] | null => {
    try {
      const parsed = JSON.parse(questionsJson) as PulseQuestion[]
      if (!Array.isArray(parsed) || parsed.length === 0) return null
      return parsed.map((q) => ({
        id: q.id || uid(),
        text: String(q.text),
        type: q.type === 'text' ? 'text' : 'scale',
        min: q.type === 'scale' ? (q.min ?? 1) : undefined,
        max: q.type === 'scale' ? (q.max ?? 10) : undefined,
      }))
    } catch {
      return null
    }
  }

  const saveDraft = () => {
    const trimmed = label.trim()
    const questions = parseQuestions()
    if (!trimmed || !questions) return
    if (editing) {
      updateFeedbackTemplate(editing.id, {
        label: trimmed,
        description: description.trim() || undefined,
        questions,
      })
    } else {
      addFeedbackTemplate({
        label: trimmed,
        description: description.trim() || undefined,
        questions,
      })
    }
    closeDraft()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-fg">
            <MessageSquare className="h-5 w-5 text-accent" />
            360° feedback templates
          </h2>
          <p className="text-sm text-muted">
            Reusable question sets — open a cycle from the HR dashboard when ready.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New template
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {feedbackTemplates.map((t) => (
          <Card key={t.id} padding="md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-fg">{t.label}</p>
                {t.description ? <p className="mt-1 text-xs text-muted">{t.description}</p> : null}
                <Badge tone="muted" className="mt-2">
                  {t.questions.length} question{t.questions.length === 1 ? '' : 's'}
                </Badge>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="rounded p-1.5 text-muted hover:bg-surface-2 ring-focus"
                  aria-label={`Edit ${t.label}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteFeedbackTemplate(t.id)}
                  className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger ring-focus"
                  aria-label={`Delete ${t.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={draftOpen}
        onClose={closeDraft}
        title={editing ? 'Edit feedback template' : 'New feedback template'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeDraft}>
              Cancel
            </Button>
            <Button onClick={saveDraft} disabled={!label.trim() || !parseQuestions()}>
              Save template
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Template name" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Textarea
            label="Questions (JSON)"
            rows={10}
            value={questionsJson}
            onChange={(e) => setQuestionsJson(e.target.value)}
            hint='Array of { "id", "text", "type": "scale"|"text", "min"?, "max"? }'
          />
        </div>
      </Modal>
    </div>
  )
}
