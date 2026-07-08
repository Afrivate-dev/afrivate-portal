import type { SupabaseClient } from '@supabase/supabase-js'
import type { TaskCategoryItem } from '@/types'
import type { PulseSurveyTemplate } from '@/types/hr'
import { uid } from '@/utils/helpers'

export function labelToConfigId(label: string, prefix = 'cfg'): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48)
  return base ? `${prefix}_${base}` : `${prefix}_${uid()}`
}

export function labelForConfigId(id: string, items: TaskCategoryItem[]): string {
  return items.find((i) => i.id === id)?.label ?? id.replace(/_/g, ' ')
}

async function fetchConfigTable(client: SupabaseClient, table: string): Promise<TaskCategoryItem[]> {
  const { data, error } = await client.from(table).select('id, label').order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id: String((r as Record<string, unknown>).id),
    label: String((r as Record<string, unknown>).label),
  }))
}

export async function updateConfigLabel(
  client: SupabaseClient,
  table: string,
  id: string,
  label: string,
): Promise<void> {
  const { error } = await client.from(table).update({ label }).eq('id', id)
  if (error) throw error
}

export async function deleteConfigLabel(
  client: SupabaseClient,
  table: string,
  id: string,
): Promise<void> {
  const { error } = await client.from(table).delete().eq('id', id)
  if (error) throw error
}

export function configLabelMap(items: TaskCategoryItem[]): Record<string, string> {
  return Object.fromEntries(items.map((i) => [i.id, i.label]))
}

export function fetchAwardCategories(client: SupabaseClient) {
  return fetchConfigTable(client, 'portal_award_categories')
}

export function fetchGrievanceCategories(client: SupabaseClient) {
  return fetchConfigTable(client, 'portal_grievance_categories')
}

export function fetchExitReasons(client: SupabaseClient) {
  return fetchConfigTable(client, 'portal_exit_reasons')
}

export function fetchMemoCategories(client: SupabaseClient) {
  return fetchConfigTable(client, 'portal_memo_categories')
}

export async function fetchPulseSurveyTemplates(client: SupabaseClient): Promise<PulseSurveyTemplate[]> {
  const { data, error } = await client
    .from('portal_pulse_survey_templates')
    .select('id, label, survey_type, description, questions')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      label: String(row.label),
      surveyType: String(row.survey_type) as PulseSurveyTemplate['surveyType'],
      description: row.description ? String(row.description) : undefined,
      questions: Array.isArray(row.questions) ? (row.questions as PulseSurveyTemplate['questions']) : [],
    }
  })
}

export async function insertPulseSurveyTemplate(
  client: SupabaseClient,
  template: Omit<PulseSurveyTemplate, 'id'> & { id?: string },
  sortOrder: number,
): Promise<PulseSurveyTemplate> {
  const id = template.id ?? labelToConfigId(template.label, 'tpl')
  const { error } = await client.from('portal_pulse_survey_templates').insert({
    id,
    label: template.label,
    survey_type: template.surveyType,
    description: template.description ?? null,
    questions: template.questions,
    sort_order: sortOrder,
  })
  if (error) throw error
  return { id, label: template.label, surveyType: template.surveyType, description: template.description, questions: template.questions }
}

export async function insertConfigLabel(
  client: SupabaseClient,
  table: string,
  label: string,
  sortOrder: number,
  idPrefix: string,
): Promise<TaskCategoryItem> {
  const id = labelToConfigId(label, idPrefix)
  const { error } = await client.from(table).insert({ id, label, sort_order: sortOrder })
  if (error) throw error
  return { id, label }
}

export const DEFAULT_AWARD_CATEGORIES: TaskCategoryItem[] = [
  { id: 'innovation', label: 'Innovation' },
  { id: 'team_spirit', label: 'Team Spirit' },
  { id: 'most_improved', label: 'Most Improved' },
  { id: 'embodied_the_way', label: 'Embodied the Way' },
]

export const DEFAULT_GRIEVANCE_CATEGORIES: TaskCategoryItem[] = [
  { id: 'workplace', label: 'Workplace concern' },
  { id: 'harassment', label: 'Harassment or safety' },
  { id: 'other', label: 'Other' },
]

export const DEFAULT_EXIT_REASONS: TaskCategoryItem[] = [
  { id: 'better_opportunity', label: 'Better opportunity' },
  { id: 'compensation', label: 'Compensation' },
  { id: 'work_life_balance', label: 'Work-life balance' },
  { id: 'relocation', label: 'Relocation' },
  { id: 'career_change', label: 'Career change' },
  { id: 'management_or_culture', label: 'Management or culture' },
  { id: 'role_fit', label: 'Role fit' },
  { id: 'personal_reasons', label: 'Personal reasons' },
  { id: 'retirement', label: 'Retirement' },
  { id: 'other', label: 'Other' },
]

export const DEFAULT_MEMO_CATEGORIES: TaskCategoryItem[] = [
  { id: 'general', label: 'General memo' },
  { id: 'digest', label: 'HR digest (email mirror)' },
  { id: 'policy', label: 'Policy notice' },
]

export const DEFAULT_PULSE_SURVEY_TEMPLATES: PulseSurveyTemplate[] = [
  {
    id: 'tpl_monthly_pulse',
    label: 'Monthly pulse check',
    surveyType: 'pulse',
    description: 'Standard monthly engagement pulse',
    questions: [
      { id: 'eng', text: 'Engagement this month (1–10)', type: 'scale', min: 1, max: 10 },
      { id: 'need', text: 'Do you have what you need? (1–10)', type: 'scale', min: 1, max: 10 },
      { id: 'note', text: 'Optional comment', type: 'text' },
    ],
  },
  {
    id: 'tpl_quarterly_enps',
    label: 'Quarterly eNPS',
    surveyType: 'enps',
    description: 'How likely are you to recommend AfriVate as a place to work?',
    questions: [
      { id: 'nps', text: 'Recommendation score (0–10)', type: 'scale', min: 0, max: 10 },
      { id: 'why', text: 'What is the main reason for your score? (optional)', type: 'text' },
    ],
  },
  {
    id: 'tpl_onboarding_satisfaction',
    label: 'Onboarding satisfaction',
    surveyType: 'onboarding',
    description: 'For new joiners — how was your first-weeks experience at AfriVate?',
    questions: [
      { id: 'welcome', text: 'How welcomed did you feel? (1–10)', type: 'scale', min: 1, max: 10 },
      { id: 'clarity', text: 'How clear were your role and first tasks? (1–10)', type: 'scale', min: 1, max: 10 },
      { id: 'support', text: 'How well-supported were you by your manager and team? (1–10)', type: 'scale', min: 1, max: 10 },
      { id: 'note', text: 'Anything we could improve about onboarding? (optional)', type: 'text' },
    ],
  },
]
