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
   * When false, tapping/clicking the dimmed backdrop does not close the modal.
   * Use for forms with file inputs — mobile OS pickers commonly synthesize a
   * backdrop tap when the picker closes.
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

function isFileInput(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement && target.type === 'file'
}

/** Residual ghost-click window after a native file picker returns (esp. iOS/Android). */
const FILE_PICKER_RESIDUAL_MS = 1200
/** Soft upper bound while the native picker is open (cancel may not fire `change`). */
const FILE_PICKER_MAX_MS = 120_000

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

  const panelRef = useRef<HTMLDivElement>(null)
  const suppressDismissUntil = useRef(0)
  const filePickerArmed = useRef(false)
  const backdropPointerDown = useRef(false)
  const clearPickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const armSuppress = (ms: number) => {
    const until = Date.now() + ms
    if (until > suppressDismissUntil.current) suppressDismissUntil.current = until
  }

  const clearFilePickerArm = (residualMs = FILE_PICKER_RESIDUAL_MS) => {
    filePickerArmed.current = false
    armSuppress(residualMs)
    if (clearPickerTimer.current) {
      clearTimeout(clearPickerTimer.current)
      clearPickerTimer.current = null
    }
  }

  const armFilePicker = () => {
    filePickerArmed.current = true
    armSuppress(FILE_PICKER_MAX_MS)
    if (clearPickerTimer.current) clearTimeout(clearPickerTimer.current)
    // Safety: if the user cancels and `change` never fires (common on iOS), unlock later.
    clearPickerTimer.current = setTimeout(() => clearFilePickerArm(), FILE_PICKER_MAX_MS)
  }

  const requestClose = () => {
    if (filePickerArmed.current) return
    if (Date.now() < suppressDismissUntil.current) return
    onCloseRef.current()
  }

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !closeOnEscape) return
      requestClose()
    }

    const onWindowBlur = () => armSuppress(FILE_PICKER_RESIDUAL_MS)
    const onWindowFocus = () => {
      if (filePickerArmed.current) clearFilePickerArm()
      else armSuppress(FILE_PICKER_RESIDUAL_MS)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        armSuppress(FILE_PICKER_MAX_MS)
      } else if (filePickerArmed.current) {
        clearFilePickerArm()
      } else {
        armSuppress(FILE_PICKER_RESIDUAL_MS)
      }
    }

    document.addEventListener('keydown', onKey)
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', onWindowFocus)
    document.addEventListener('visibilitychange', onVisibility)
    document.body.style.overflow = 'hidden'
    // iOS Safari: overflow hidden alone often fails — lock position too.
    const prevPosition = document.body.style.position
    const prevTop = document.body.style.top
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', onWindowFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      document.body.style.overflow = ''
      document.body.style.position = prevPosition
      document.body.style.top = prevTop
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
      if (clearPickerTimer.current) {
        clearTimeout(clearPickerTimer.current)
        clearPickerTimer.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closeOnEscape])

  // Capture file-input activation inside the panel (desktop + mobile).
  useEffect(() => {
    if (!open) return
    const root = panelRef.current
    if (!root) return

    const onActivate = (e: Event) => {
      if (isFileInput(e.target)) armFilePicker()
    }
    const onFileChange = (e: Event) => {
      if (isFileInput(e.target)) clearFilePickerArm()
    }

    // pointerdown/touchstart/click: mobile cameras & document pickers arm on different events.
    root.addEventListener('pointerdown', onActivate, true)
    root.addEventListener('touchstart', onActivate, true)
    root.addEventListener('click', onActivate, true)
    root.addEventListener('change', onFileChange, true)

    return () => {
      root.removeEventListener('pointerdown', onActivate, true)
      root.removeEventListener('touchstart', onActivate, true)
      root.removeEventListener('click', onActivate, true)
      root.removeEventListener('change', onFileChange, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) {
      backdropPointerDown.current = false
      suppressDismissUntil.current = 0
      filePickerArmed.current = false
      if (clearPickerTimer.current) {
        clearTimeout(clearPickerTimer.current)
        clearPickerTimer.current = null
      }
    }
  }, [open])

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
          if (!closeOnBackdrop) {
            backdropPointerDown.current = false
            return
          }
          backdropPointerDown.current = e.target === e.currentTarget
        }}
        onClick={(e) => {
          if (!closeOnBackdrop) return
          if (backdropPointerDown.current && e.target === e.currentTarget) requestClose()
          backdropPointerDown.current = false
        }}
      />
      <div
        ref={panelRef}
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
            onClick={requestClose}
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
