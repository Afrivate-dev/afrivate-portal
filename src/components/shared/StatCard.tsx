import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/helpers'
import { Card } from '@/components/ui/Card'

interface StatCardProps {
  label: string
  value: number | string
  icon?: LucideIcon
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'muted'
  hint?: string
  /** When set, the whole card becomes a tappable link (mobile-friendly). */
  to?: string
}

const toneStyles = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-300',
  muted: 'bg-surface-2 text-muted',
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint, to }: StatCardProps) {
  const body = (
    <>
      {Icon ? (
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
        <div className="mt-0.5 text-xl font-bold text-fg sm:text-2xl">{value}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className="block min-h-[44px] touch-manipulation ring-focus rounded-xl">
        <Card padding="md" className="flex items-center gap-3 transition-all duration-200 hover:bg-surface-2/80 active:scale-[0.99] sm:gap-4 motion-reduce:active:scale-100">
          {body}
        </Card>
      </Link>
    )
  }

  return (
    <Card padding="md" className="flex items-center gap-4">
      {body}
    </Card>
  )
}
