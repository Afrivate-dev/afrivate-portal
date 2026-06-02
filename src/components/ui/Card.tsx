import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/helpers'

type Padding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding
  hoverable?: boolean
  accentBorder?: 'info' | 'warning' | 'danger' | 'none'
}

const paddings: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

const accentBorders = {
  info: '',
  warning: 'border-l-4 border-l-warning',
  danger: 'border-l-4 border-l-danger',
  none: '',
}

export function Card({
  className,
  padding = 'md',
  hoverable = false,
  accentBorder = 'none',
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface shadow-card transition-shadow',
        paddings[padding],
        accentBorders[accentBorder],
        hoverable && 'hover:shadow-elevated cursor-pointer',
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 flex items-start justify-between gap-3', className)} {...rest} />
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-fg', className)} {...rest} />
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted', className)} {...rest} />
}
