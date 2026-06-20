import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { clearLegacyAuthStorage } from '@/lib/sessionPolicy'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (import.meta.env.DEV && key && !key.startsWith('eyJ')) {
  console.warn(
    '[supabase] VITE_SUPABASE_ANON_KEY should be the JWT anon key from Supabase Dashboard → Project Settings → API (starts with eyJ). Publishable keys may break profile loading.',
  )
}

if (typeof window !== 'undefined') {
  clearLegacyAuthStorage()
}

/** Null unless both URL and anon key are set — enables Realtime presence + broadcast. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          // Session lives in sessionStorage — closing the tab always ends the session.
          storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: { params: { eventsPerSecond: 20 } },
      })
    : null

export const isSupabaseRealtimeConfigured = () => Boolean(supabase)
