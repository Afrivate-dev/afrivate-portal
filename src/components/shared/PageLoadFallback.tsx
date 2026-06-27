/** Lightweight route fallback — avoids full-screen loader flash between pages. */
export function PageLoadFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  )
}
