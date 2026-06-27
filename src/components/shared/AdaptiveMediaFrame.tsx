import type { ReactNode } from 'react'
import { cn } from '@/utils/helpers'
import { adaptiveMediaContainerStyle, type MediaDimensions } from '@/utils/mediaAspectRatio'

export function AdaptiveMediaFrame({
  dimensions,
  className,
  children,
}: {
  dimensions: MediaDimensions | null
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn('relative overflow-hidden bg-black', className)}
      style={adaptiveMediaContainerStyle(dimensions)}
    >
      {children}
    </div>
  )
}
