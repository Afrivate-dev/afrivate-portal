import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/helpers'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover shadow-sm disabled:bg-accent/50',
  secondary:
    'bg-surface-2 text-fg hover:bg-surface-3 border border-border',
  ghost:
    'text-fg hover:bg-surface-2',
  danger:
    'bg-danger text-white hover:opacity-90 shadow-sm',
  outline:
    'border border-border bg-transparent text-fg hover:bg-surface-2',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 min-h-[36px] px-3 text-xs sm:text-sm rounded-md',
  md: 'h-11 min-h-[44px] px-4 text-sm sm:px-5 rounded-md',
  lg: 'h-12 min-h-[48px] px-5 text-sm sm:px-6 sm:text-base rounded-lg',
  icon: 'h-10 w-10 min-h-[44px] min-w-[44px] rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
        'ring-focus touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100',
        'disabled:pointer-events-none disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  )
})
