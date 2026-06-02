import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/helpers'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, hint, error, id, ...rest },
  ref,
) {
  const textareaId = id ?? rest.name
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-fg">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          'w-full rounded-md border bg-surface text-fg placeholder:text-muted',
          'min-h-[88px] px-3.5 py-2.5 text-sm',
          'transition-colors ring-focus',
          error ? 'border-danger focus:border-danger' : 'border-border focus:border-accent',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
})
