import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/helpers'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /**
   * When false, backdrop taps do not close the modal.
   * Required for forms with file inputs (mobile OS pickers synthesize backdrop taps).
   * @default true
   */
  closeOnBackdrop?: boolean
  /** @default true */
  closeOnEscape?: boolean
}

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const backdropPointerDown = useRef(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, closeOnEscape])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onPointerDown={(e) => {
          backdropPointerDown.current = closeOnBackdrop && e.target === e.currentTarget
        }}
        onClick={(e) => {
          if (!closeOnBackdrop) return
          if (backdropPointerDown.current && e.target === e.currentTarget) onCloseRef.current()
          backdropPointerDown.current = false
        }}
      />
      <div
        className={cn(
          'relative w-full max-w-full min-w-0 bg-surface text-fg shadow-elevated',
          'rounded-t-xl sm:rounded-xl',
          'max-h-[90vh] flex flex-col',
          'animate-slide-up sm:animate-scale-in motion-reduce:animate-none',
          'sm:w-full sm:mx-4',
          sizes[size],
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-4 sm:gap-4 sm:p-5">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-base font-semibold text-fg sm:text-lg">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs text-muted sm:text-sm">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close"
            className="av-tap shrink-0 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg ring-focus"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-w-0 flex-1 overflow-x-clip overflow-y-auto p-4 scrollbar-thin sm:p-5 overscroll-contain">
          {children}
        </div>
        {footer ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
