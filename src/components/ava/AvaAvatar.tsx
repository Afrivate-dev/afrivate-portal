import { cn } from '@/utils/helpers'

/** Brand mark for AVA — soft face orb with orbit ring. */
export function AvaAvatar({
  size = 'md',
  className,
  thinking = false,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  thinking?: boolean
}) {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'

  return (
    <div className={cn('relative shrink-0', dim, className)} aria-hidden>
      <span
        className={cn(
          'absolute inset-0 rounded-full bg-brand/30 blur-[7px] motion-reduce:hidden',
          thinking ? 'animate-ava-glow' : 'animate-ava-breathe',
        )}
      />
      <span
        className={cn(
          'absolute -inset-[3px] rounded-full border border-dashed border-brand/35 motion-reduce:hidden',
          thinking ? 'animate-ava-orbit' : 'animate-ava-breathe',
        )}
      />
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-full',
          'bg-gradient-to-br from-brand-300 via-brand-500 to-brand-800',
          'shadow-md ring-2 ring-white/25',
        )}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_55%)]" />
        <svg
          viewBox="0 0 40 40"
          className={cn(
            'relative z-[1] text-white',
            size === 'sm' ? 'h-[18px] w-[18px]' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5',
          )}
          fill="none"
          aria-hidden
        >
          <circle cx="14" cy="16" r="2.2" fill="currentColor" opacity="0.95" />
          <circle cx="26" cy="16" r="2.2" fill="currentColor" opacity="0.95" />
          <path
            d="M13 24c2.2 2.4 11.8 2.4 14 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M8 8.5c3-2.5 21-2.5 24 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>
      </div>
    </div>
  )
}

export function AvaTypingBubble() {
  return (
    <div
      className="flex items-end gap-2 animate-ava-msg-in motion-reduce:animate-none"
      role="status"
      aria-live="polite"
    >
      <AvaAvatar size="sm" thinking />
      <div className="rounded-2xl rounded-bl-md border border-brand/15 bg-surface-2 px-3.5 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand/70 animate-ava-dot motion-reduce:animate-none" />
          <span className="h-2 w-2 rounded-full bg-brand/70 animate-ava-dot motion-reduce:animate-none [animation-delay:140ms]" />
          <span className="h-2 w-2 rounded-full bg-brand/70 animate-ava-dot motion-reduce:animate-none [animation-delay:280ms]" />
        </div>
        <span className="sr-only">AVA is thinking</span>
      </div>
    </div>
  )
}
