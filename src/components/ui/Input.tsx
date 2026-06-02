import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/helpers'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leadingIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, leadingIcon, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-fg">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leadingIcon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            {leadingIcon}
          </div>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-md border bg-surface text-fg placeholder:text-muted',
            'h-11 px-3.5 text-sm',
            'transition-colors ring-focus',
            'disabled:cursor-not-allowed disabled:opacity-60',
            leadingIcon && 'pl-10',
            error
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-accent',
            className,
          )}
          {...rest}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
})
