import { useCallback, useEffect, useState } from 'react'

/** Persist state for the current browser tab only — cleared when the tab closes. */
export function useSessionStorage<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial
    if (typeof window === 'undefined') return fallback
    try {
      const raw = window.sessionStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        window.sessionStorage.removeItem(key)
      } else {
        window.sessionStorage.setItem(key, JSON.stringify(value))
      }
    } catch {
      /* private mode / quota */
    }
  }, [key, value])

  const reset = useCallback(
    () => setValue(typeof initial === 'function' ? (initial as () => T)() : initial),
    [initial],
  )

  return [value, setValue, reset] as const
}
