/** Consistent full-screen / inline loading indicator — avoids blank ghost states. */
export function ScreenLoader({
  message = 'Loading…',
  className = '',
}: {
  message?: string
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
        aria-hidden
      />
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}
