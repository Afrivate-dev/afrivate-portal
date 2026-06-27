import { useEffect, useState } from 'react'
import { isStorageReference, resolveStorageReference } from '@/utils/mediaUpload'

function isPlayableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')
}

/** Resolve storage: references to signed URLs; expose loading until playable. */
export function useResolvedMediaUrl(url: string) {
  const [resolved, setResolved] = useState(() => (isStorageReference(url) ? '' : url))
  const [loading, setLoading] = useState(() => isStorageReference(url))

  useEffect(() => {
    let cancelled = false

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

    return () => {
      cancelled = true
    }
  }, [url])

  const ready = !loading && !!resolved && isPlayableUrl(resolved)

  return { url: resolved, loading, ready }
}
