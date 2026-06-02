import { supabase } from '@/lib/supabase'

/** When true, `DataProvider` loads domain data from Postgres (`portal_*` tables + `profiles`). */
export function isSupabaseDataEnabled(): boolean {
  return import.meta.env.VITE_USE_SUPABASE_DATA === 'true' && Boolean(supabase)
}
