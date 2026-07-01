import type { ReactNode } from 'react'
import { cn } from '@/utils/helpers'

/** Instagram-style post shell: edge-to-edge media, padded header/caption/actions. */
export function InstagramFeedCard({
  className,
  header,
  media,
  caption,
  actions,
  footer,
  onClick,
}: {
  className?: string
  header: ReactNode
  media?: ReactNode
  caption?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  onClick?: () => void
}) {
  return (
    <article
      className={cn(
        'min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-surface shadow-sm',
        'transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none',
        'animate-fade-in-up motion-reduce:animate-none',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">{header}</div>
      {media ? <div className="min-w-0 max-w-full overflow-hidden">{media}</div> : null}
      {actions ? (
        <div className="flex items-center gap-1 px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      ) : null}
      {caption ? <div className="space-y-1 px-4 pb-3">{caption}</div> : null}
      {footer ? (
        <div className="border-t border-border px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {footer}
        </div>
      ) : null}
    </article>
  )
}
