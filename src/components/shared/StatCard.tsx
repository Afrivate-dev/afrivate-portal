import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { Card } from '@/components/ui/Card'

interface StatCardProps {
  label: string
  value: number | string
  icon?: LucideIcon
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'muted'
  hint?: string
}

const toneStyles = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-300',
  muted: 'bg-surface-2 text-muted',
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint }: StatCardProps) {
  return (
    <Card padding="md" className="flex items-center gap-4">
      {Icon ? (
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
        <div className="mt-0.5 text-2xl font-bold text-fg">{value}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>
    </Card>
  )
}
