import type { SupabaseClient } from '@supabase/supabase-js'
import type { TaskCategoryItem } from '@/types'

export const DEFAULT_DOCUMENT_CATEGORIES: TaskCategoryItem[] = [
  { id: 'policies', label: 'Policies' },
  { id: 'sops', label: 'SOPs' },
  { id: 'brand', label: 'Brand Assets' },
  { id: 'templates', label: 'Templates' },
  { id: 'reports', label: 'Reports' },
]

export const DEFAULT_RECOGNITION_TAGS: TaskCategoryItem[] = [
  { id: 'great_work', label: 'Great Work' },
  { id: 'team_player', label: 'Team Player' },
  { id: 'innovation', label: 'Innovation' },
  { id: 'above_beyond', label: 'Above & Beyond' },
  { id: 'leadership', label: 'Leadership' },
]

async function fetchLabelTable(
  client: SupabaseClient,
  table: 'portal_document_categories' | 'portal_recognition_tags',
): Promise<TaskCategoryItem[]> {
  const { data, error } = await client.from(table).select('id, label').order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id: String((r as Record<string, unknown>).id),
    label: String((r as Record<string, unknown>).label),
  }))
}

export function fetchDocumentCategories(client: SupabaseClient) {
  return fetchLabelTable(client, 'portal_document_categories')
}

export function fetchRecognitionTags(client: SupabaseClient) {
  return fetchLabelTable(client, 'portal_recognition_tags')
}
