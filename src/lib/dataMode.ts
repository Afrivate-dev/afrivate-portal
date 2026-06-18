import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'

/** When true, `DataProvider` loads domain data from Postgres (`portal_*` tables + `profiles`). */
export function isSupabaseDataEnabled(): boolean {
  if (import.meta.env.VITE_USE_SUPABASE_DATA !== 'true') return false
  if (!supabase) return false
  if (!isSupabaseAuthEnabled()) {
    if (import.meta.env.DEV) {
      console.warn('[data] VITE_USE_SUPABASE_DATA requires Supabase auth to be enabled.')
    }
    return false
  }
  return true
}
