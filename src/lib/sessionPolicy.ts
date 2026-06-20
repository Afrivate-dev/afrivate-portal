/** Sign out after this much time without mouse, keyboard, or touch activity. */
export const SESSION_IDLE_MS = 10 * 60 * 1000

/** How often open tabs re-check the shared last-activity timestamp. */
export const SESSION_IDLE_CHECK_MS = 30_000

export const SESSION_ACTIVITY_KEY = 'av-last-activity-at'

/** Mock-auth user blob — sessionStorage so closing the tab clears the session. */
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

/** Drop legacy localStorage sessions after switching to tab-scoped storage. */
export function clearLegacyAuthStorage(): void {
  try {
    localStorage.removeItem('av-auth-user')
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    /* ignore */
  }
}
