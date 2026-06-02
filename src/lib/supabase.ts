import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** Null unless both URL and anon key are set — enables Realtime presence + broadcast. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } }) : null

export const isSupabaseRealtimeConfigured = () => Boolean(supabase)
