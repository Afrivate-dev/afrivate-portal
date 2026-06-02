import { supabase } from '@/lib/supabase'

/** Real Supabase email/password sessions; requires `VITE_USE_SUPABASE_AUTH=true` and Supabase env vars. */
export function isSupabaseAuthEnabled(): boolean {
  return import.meta.env.VITE_USE_SUPABASE_AUTH === 'true' && Boolean(supabase)
}
