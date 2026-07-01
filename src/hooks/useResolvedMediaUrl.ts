import { useEffect, useState } from 'react'
import { isStorageReference, resolveStorageReference } from '@/utils/mediaUpload'

function isPlayableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')
}

function initialResolved(url: string): string {
  return isStorageReference(url) ? '' : url
}

/** Resolve storage: references to signed URLs; expose loading until playable. */
export function useResolvedMediaUrl(url: string) {
  const [resolved, setResolved] = useState(() => initialResolved(url))
  const [loading, setLoading] = useState(() => isStorageReference(url))

  useEffect(() => {
    let cancelled = false

    const sync = () => {
      if (!url) {
        setResolved('')
        setLoading(false)
        return
      }

      if (!isStorageReference(url)) {
        setResolved(url)
        setLoading(false)
        return
      }

      setLoading(true)
      setResolved('')
      void resolveStorageReference(url).then((next) => {
        if (cancelled) return
        if (isPlayableUrl(next)) {
          setResolved(next)
          setLoading(false)
        } else {
          setResolved('')
          setLoading(false)
        }
      })
    }

    queueMicrotask(sync)

    return () => {
      cancelled = true
    }
  }, [url])

  const ready = !loading && !!resolved && isPlayableUrl(resolved)

  return { url: resolved, loading, ready }
}
