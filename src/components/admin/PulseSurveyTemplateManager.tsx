import { useState } from 'react'
import { BarChart3, Pencil, Plus, Trash2 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import type { PulseQuestion, PulseSurveyTemplate, PulseSurveyType } from '@/types/hr'
import { uid } from '@/utils/helpers'

const DEFAULT_QUESTIONS: Record<PulseSurveyType, PulseQuestion[]> = {
  pulse: [
    { id: 'eng', text: 'Engagement this month (1–10)', type: 'scale', min: 1, max: 10 },
    { id: 'need', text: 'Do you have what you need to do your best work? (1–10)', type: 'scale', min: 1, max: 10 },
    { id: 'note', text: 'Optional comment', type: 'text' },
  ],
  enps: [
    { id: 'nps', text: 'Recommendation score (0–10)', type: 'scale', min: 0, max: 10 },
    { id: 'why', text: 'What is the main reason for your score? (optional)', type: 'text' },
  ],
}

export function PulseSurveyTemplateManager() {
  const {
    pulseSurveyTemplates,
    addPulseSurveyTemplate,
    updatePulseSurveyTemplate,
    deletePulseSurveyTemplate,
  } = useData()
  const [draftOpen, setDraftOpen] = useState(false)
  const [editing, setEditing] = useState<PulseSurveyTemplate | null>(null)
  const [label, setLabel] = useState('')
  const [surveyType, setSurveyType] = useState<PulseSurveyType>('pulse')
  const [description, setDescription] = useState('')
  const [questionsJson, setQuestionsJson] = useState('')

  const openCreate = () => {
    setEditing(null)
    setLabel('')
    setSurveyType('pulse')
    setDescription('')
    setQuestionsJson(JSON.stringify(DEFAULT_QUESTIONS.pulse, null, 2))
    setDraftOpen(true)
  }

  const openEdit = (t: PulseSurveyTemplate) => {
    setEditing(t)
    setLabel(t.label)
    setSurveyType(t.surveyType)
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
      updatePulseSurveyTemplate(editing.id, {
        label: trimmed,
        surveyType,
        description: description.trim() || undefined,
        questions,
      })
    } else {
      addPulseSurveyTemplate({
        label: trimmed,
        surveyType,
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
            <BarChart3 className="h-5 w-5 text-accent" />
            Pulse & eNPS templates
          </h2>
          <p className="text-sm text-muted">
            Reusable survey blueprints — launch from the HR dashboard when ready.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New template
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {pulseSurveyTemplates.map((t) => (
          <Card key={t.id} padding="md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-fg">{t.label}</p>
                {t.description ? <p className="mt-1 text-xs text-muted">{t.description}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={t.surveyType === 'enps' ? 'info' : 'brand'}>
                    {t.surveyType === 'enps' ? 'eNPS' : 'Pulse'}
                  </Badge>
                  <Badge tone="muted">{t.questions.length} question{t.questions.length === 1 ? '' : 's'}</Badge>
                </div>
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
                  onClick={() => deletePulseSurveyTemplate(t.id)}
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
        title={editing ? 'Edit survey template' : 'New survey template'}
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
          <Select
            label="Survey type"
            value={surveyType}
            onChange={(e) => {
              const next = e.target.value as PulseSurveyType
              setSurveyType(next)
              if (!editing) setQuestionsJson(JSON.stringify(DEFAULT_QUESTIONS[next], null, 2))
            }}
            options={[
              { value: 'pulse', label: 'Pulse check' },
              { value: 'enps', label: 'eNPS' },
            ]}
          />
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
