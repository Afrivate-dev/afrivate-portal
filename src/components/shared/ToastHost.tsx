import { useEffect, useState } from 'react'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { setNotifyListener, type ToastMessage } from '@/lib/notify'

const ICON = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
} as const

const STYLE = {
  error: 'border-danger/30 bg-danger/10 text-danger',
  success: 'border-success/30 bg-success/10 text-success',
  info: 'border-accent/30 bg-accent/10 text-fg',
} as const

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    setNotifyListener((toast) => {
      setToasts((prev) => [...prev, toast])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 6000)
    })
    return () => setNotifyListener(null)
  }, [])

  if (!toasts.length) return null

  return (
    <div
      className="pointer-events-none fixed bottom-20 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 lg:bottom-6"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = ICON[t.kind]
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg',
              STYLE[t.kind],
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{t.text}</p>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
