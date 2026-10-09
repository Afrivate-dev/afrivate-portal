/**
 * Sign out after this much time without mouse, keyboard, or touch activity.
 *
 * Previously 10 minutes, which combined with the old sessionStorage-only
 * auth storage caused "Constant sign-outs" after very short periods. The
 * Supabase session itself now persists in localStorage; this guard is the
 * only reason a user is logged out mid-day. 12h keeps the security intent
 * (idle machines sign out overnight) without surprising normal workdays.
 */
export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000

/** How often open tabs re-check the shared last-activity timestamp. */
export const SESSION_IDLE_CHECK_MS = 60_000

export const SESSION_ACTIVITY_KEY = 'av-last-activity-at'

/** Mock-auth user blob — sessionStorage so closing the tab clears the mock login. */
export const SESSION_USER_STORAGE_KEY = 'av-auth-user'

export function recordSessionActivity(): void {
  try {
    localStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()))
  } catch {
    /* quota / private mode */
  }
}

export function clearSessionActivity(): void {
  try {
    localStorage.removeItem(SESSION_ACTIVITY_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Drop the legacy mock-auth user blob only. NEVER remove Supabase
 * `sb-*-auth-token` entries — that is the live signed-in session and wiping
 * it on every page load causes constant surprise sign-outs.
 */
export function clearLegacyMockAuthStorage(): void {
  try {
    localStorage.removeItem('av-auth-user')
  } catch {
    /* ignore */
  }
}
