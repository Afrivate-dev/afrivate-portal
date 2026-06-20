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
 * Signs the user out after {@link SESSION_IDLE_MS} without interaction.
 * Activity is shared across tabs via localStorage so one idle workspace signs out everywhere.
 */
export function useAutoLogout(enabled: boolean, logout: () => void): void {
  useEffect(() => {
    if (!enabled) return

    recordSessionActivity()

    const onActivity = () => recordSessionActivity()

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true })
    }

    const checkIdle = () => {
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

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity)
      }
      window.clearInterval(interval)
      window.removeEventListener('storage', onStorage)
    }
  }, [enabled, logout])
}
