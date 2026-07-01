import type { SupabaseClient } from '@supabase/supabase-js'
import type { FeedbackTemplate } from '@/types/hr'
import { labelToConfigId } from '@/lib/portalConfig'

export async function checkConfigLabelInUse(
  client: SupabaseClient,
  kind: string,
  id: string,
): Promise<number> {
  const { data, error } = await client.rpc('portal_config_label_in_use', {
    p_kind: kind,
    p_id: id,
  })
  if (error) throw error
  return Number(data ?? 0)
}

export async function fetchFeedbackTemplates(client: SupabaseClient): Promise<FeedbackTemplate[]> {
  const { data, error } = await client
    .from('portal_feedback_templates')
    .select('id, label, description, questions')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      label: String(row.label),
      description: row.description ? String(row.description) : undefined,
      questions: Array.isArray(row.questions) ? (row.questions as FeedbackTemplate['questions']) : [],
    }
  })
}

export async function insertFeedbackTemplate(
  client: SupabaseClient,
  template: Omit<FeedbackTemplate, 'id'> & { id?: string },
  sortOrder: number,
): Promise<FeedbackTemplate> {
  const id = template.id ?? labelToConfigId(template.label, 'ftpl')
  const { error } = await client.from('portal_feedback_templates').insert({
    id,
    label: template.label,
    description: template.description ?? null,
    questions: template.questions,
    sort_order: sortOrder,
  })
  if (error) throw error
  return { id, label: template.label, description: template.description, questions: template.questions }
}

export const DEFAULT_FEEDBACK_TEMPLATES: FeedbackTemplate[] = [
  {
    id: 'tpl_360_standard',
    label: 'Standard 360° review',
    description: 'Values and collaboration scales',
    questions: [
      { id: 'values', text: 'Embodies the Afrivate Way', type: 'scale', min: 1, max: 10 },
      { id: 'collab', text: 'Collaborates effectively', type: 'scale', min: 1, max: 10 },
    ],
  },
]
