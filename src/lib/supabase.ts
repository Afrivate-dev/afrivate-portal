import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { clearLegacyMockAuthStorage } from '@/lib/sessionPolicy'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (import.meta.env.DEV && key && !key.startsWith('eyJ')) {
  console.warn(
    '[supabase] VITE_SUPABASE_ANON_KEY should be the JWT anon key from Supabase Dashboard → Project Settings → API (starts with eyJ). Publishable keys may break profile loading.',
  )
}

if (typeof window !== 'undefined') {
  // Only wipe the mock-auth session-storage blob. NEVER touch Supabase's
  // `sb-*-auth-token` entries in localStorage — doing so wipes the signed-in
  // session on every page load and causes surprise sign-outs.
  clearLegacyMockAuthStorage()
}

/**
 * Null unless both URL and anon key are set — enables Realtime presence + broadcast.
 *
 * Session persistence: we deliberately use `window.localStorage` so a signed-in
 * session survives tab closes, page reloads, and refresh-token rotation across
 * tabs. Idle sign-out is enforced separately by `useAutoLogout`, which clears
 * the session after `SESSION_IDLE_MS` of inactivity.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          // localStorage keeps the session across tab closes AND across tabs
          // (so refresh-token rotation in one tab never signs out the others).
          // Use the default `sb-<project-ref>-auth-token` key so any existing
          // in-flight session stays usable after this deploy.
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: { params: { eventsPerSecond: 20 } },
        global: {
          // Supabase defaults to no timeout; a hung REST call would otherwise
          // leave the UI stuck on "Loading your portal…". Abort individual
          // requests after 15s so the resilient loader can surface a per-panel
          // warning instead of blocking the whole page.
          fetch: (input, init) => {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 15_000)
            const signal = init?.signal
            if (signal) {
              if (signal.aborted) controller.abort()
              else signal.addEventListener('abort', () => controller.abort(), { once: true })
            }
            return fetch(input, { ...init, signal: controller.signal }).finally(() =>
              clearTimeout(timer),
            )
          },
        },
      })
    : null

export const isSupabaseRealtimeConfigured = () => Boolean(supabase)
