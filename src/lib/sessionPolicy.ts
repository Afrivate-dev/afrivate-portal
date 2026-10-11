/**
 * Sign out after this much time of real foreground inactivity.
 *
 * Previously 12 h — which combined with the fact that the client ticked
 * even while the browser tab was hidden meant that leaving a tab open
 * over a weekend reliably signed the user out. The guard now also pauses
 * while the tab is hidden (see `useAutoLogout`), so this threshold only
 * counts time the user actually had the portal in front of them. 14 days
 * is a safe outer bound — Supabase's refresh-token expiry remains the
 * real security boundary.
 */
export const SESSION_IDLE_MS = 14 * 24 * 60 * 60 * 1000

/** How often open tabs re-check the shared last-activity timestamp. */
export const SESSION_IDLE_CHECK_MS = 5 * 60 * 1000

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
