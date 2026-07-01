import { useEffect, useState } from 'react'

/** Subscribe to a CSS media query — updates on resize and orientation change. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export function useIsMobileViewport() {
  return useMediaQuery('(max-width: 639px)')
}

export function useIsTabletOrBelow() {
  return useMediaQuery('(max-width: 1023px)')
}
