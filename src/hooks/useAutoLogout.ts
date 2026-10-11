import { useEffect } from 'react'
import {
  SESSION_ACTIVITY_KEY,
  SESSION_IDLE_CHECK_MS,
  SESSION_IDLE_MS,
  clearSessionActivity,
  recordSessionActivity,
} from '@/lib/sessionPolicy'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

/**
 * Signs the user out after {@link SESSION_IDLE_MS} of real foreground
 * inactivity. "Real" means the browser tab is actually visible — a tab
 * sitting in the background all weekend doesn't accumulate idle time, so
 * users don't come back on Monday to a surprise /login redirect.
 *
 * Activity is shared across tabs via localStorage so one idle workspace
 * signs out everywhere once the threshold is actually crossed.
 */
export function useAutoLogout(enabled: boolean, logout: () => void): void {
  useEffect(() => {
    if (!enabled) return

    recordSessionActivity()

    const isVisible = () =>
      typeof document === 'undefined' || document.visibilityState !== 'hidden'

    const onActivity = () => {
      if (!isVisible()) return
      recordSessionActivity()
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true })
    }

    const checkIdle = () => {
      // Never evaluate idle while the tab is hidden. The user may have been
      // offline for hours and we don't want to pre-emptively punish them when
      // they come back and the tab fires its interval tick.
      if (!isVisible()) return
      const last = Number(localStorage.getItem(SESSION_ACTIVITY_KEY) ?? 0)
      if (last > 0 && Date.now() - last >= SESSION_IDLE_MS) {
        clearSessionActivity()
        logout()
      }
    }

    const interval = window.setInterval(checkIdle, SESSION_IDLE_CHECK_MS)

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_ACTIVITY_KEY) return
      checkIdle()
    }
    window.addEventListener('storage', onStorage)

    // When the tab returns to the foreground, treat that as a fresh touch so
    // the idle timer starts from "now". The user has clearly come back to
    // work, and we'd rather let Supabase's own session TTL be the final word.
    const onVisibilityChange = () => {
      if (isVisible()) recordSessionActivity()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity)
      }
      window.clearInterval(interval)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, logout])
}
