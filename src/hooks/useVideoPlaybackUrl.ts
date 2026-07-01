import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isStorageReference,
  resolveVideoPlaybackUrl,
  revokeVideoBlobUrl,
} from '@/utils/mediaUpload'

export function useVideoPlaybackUrl(src: string) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingBlob, setUsingBlob] = useState(false)
  const blobUrlRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)

  const clearBlob = useCallback(() => {
    if (blobUrlRef.current) {
      revokeVideoBlobUrl(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [])

  const load = useCallback(
    async (forceBlob: boolean) => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      setError(null)

      if (!src) {
        setUrl('')
        setLoading(false)
        setError('No video source')
        return
      }

      if (!isStorageReference(src) && !forceBlob) {
        setUrl(src)
        setUsingBlob(false)
        setLoading(false)
        return
      }

      const result = await resolveVideoPlaybackUrl(src, { forceBlob })
      if (requestId !== requestIdRef.current) return

      if (!result) {
        setUrl('')
        setUsingBlob(false)
        setError('This video could not be loaded. Try again in a moment.')
        setLoading(false)
        return
      }

      clearBlob()
      if (result.isBlob) {
        blobUrlRef.current = result.url
        setUsingBlob(true)
      } else {
        setUsingBlob(false)
      }

      setUrl(result.url)
      setLoading(false)
    },
    [src, clearBlob],
  )

  useEffect(() => {
    queueMicrotask(() => {
      void load(false)
    })
    return () => {
      requestIdRef.current += 1
      clearBlob()
    }
  }, [load, clearBlob])

  const retryWithBlob = useCallback(() => {
    if (usingBlob) return
    void load(true)
  }, [load, usingBlob])

  const retry = useCallback(() => {
    void load(usingBlob)
  }, [load, usingBlob])

  return {
    url,
    loading,
    error,
    ready: !loading && !!url && !error,
    usingBlob,
    retryWithBlob,
    retry,
  }
}
