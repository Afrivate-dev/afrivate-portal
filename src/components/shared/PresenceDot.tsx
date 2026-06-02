import { cn, type PresenceVisual } from '@/utils/helpers'

const TONE: Record<PresenceVisual, { dot: string; label: string }> = {
  online: { dot: 'bg-emerald-500', label: 'Online' },
  away: { dot: 'bg-amber-500', label: 'Away' },
  busy: { dot: 'bg-red-500', label: 'Busy' },
  focusing: { dot: 'bg-violet-500', label: 'Focusing' },
  offline: { dot: 'bg-muted', label: 'Offline' },
}

export function PresenceDot({
  availability,
  className,
  size = 'sm',
}: {
  availability: PresenceVisual
  className?: string
  size?: 'sm' | 'md'
}) {
  const t = TONE[availability]
  return (
    <span
      role="img"
      aria-label={t.label}
      title={t.label}
      className={cn(
        'inline-block shrink-0 rounded-full ring-2 ring-surface',
        size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5',
        t.dot,
        className,
      )}
    />
  )
}
