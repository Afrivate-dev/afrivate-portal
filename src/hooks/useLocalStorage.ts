import { useCallback, useEffect, useState } from 'react'

/**
 * Persist a piece of state to localStorage. Falls back to the initial
 * value on first load and when JSON parsing fails (corrupt data).
 */
export function useLocalStorage<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial
    if (typeof window === 'undefined') return fallback
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // quota exceeded or disabled — silently drop
    }
  }, [key, value])

  const reset = useCallback(
    () => setValue(typeof initial === 'function' ? (initial as () => T)() : initial),
    [initial],
  )

  return [value, setValue, reset] as const
}
