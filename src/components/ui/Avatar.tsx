import { useEffect, useState } from 'react'
import { cn, colorForName, initials } from '@/utils/helpers'
import { isStorageReference, resolveStorageReference } from '@/utils/mediaUpload'

interface AvatarProps {
  name: string
  /** Square headshot URL; falls back to initials on error or if omitted. */
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const frame: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-6 w-6 min-h-6 min-w-6',
  sm: 'h-8 w-8 min-h-8 min-w-8',
  md: 'h-10 w-10 min-h-10 min-w-10',
  lg: 'h-14 w-14 min-h-14 min-w-14',
  xl: 'h-20 w-20 min-h-20 min-w-20',
}

const textSize: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)

  useEffect(() => {
    setImgFailed(false)
    const raw = src?.trim()
    if (!raw) {
      setResolvedSrc(null)
      return
    }
    if (!isStorageReference(raw)) {
      setResolvedSrc(raw)
      return
    }
    let cancelled = false
    void resolveStorageReference(raw).then((url) => {
      if (!cancelled) setResolvedSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [src])

  const showImg = Boolean(resolvedSrc) && !imgFailed

  if (showImg) {
    return (
      <img
        src={resolvedSrc!}
        alt=""
        className={cn(
          'inline-flex shrink-0 rounded-full object-cover ring-2 ring-border/60',
          frame[size],
          className,
        )}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        frame[size],
        textSize[size],
        className,
      )}
      style={{ background: colorForName(name) }}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </span>
  )
}
