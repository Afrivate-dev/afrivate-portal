import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Props = { children: ReactNode }

type State = { error: Error | null }

/** Keys we flip to avoid an infinite reload loop when a deploy really is broken. */
const CHUNK_RELOAD_KEY = 'av-chunk-reload-at'
const CHUNK_RELOAD_COOLDOWN_MS = 30_000

/**
 * Classic SPA problem: after a deploy, every previous bundle chunk is a 404.
 * React.lazy throws `Failed to fetch dynamically imported module` /
 * `ChunkLoadError`, which otherwise shows up as "A part of the portal
 * crashed" and traps users on a stale tab. We detect that specific error
 * class and reload the tab once, with a short cooldown so we never loop.
 */
function isChunkLoadError(error: Error): boolean {
  const message = `${error.name || ''} ${error.message || ''}`
  if (!message) return false
  return /ChunkLoadError|Loading chunk \d+ failed|dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    message,
  )
}

function shouldAttemptChunkReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0')
    if (!last) return true
    return Date.now() - last > CHUNK_RELOAD_COOLDOWN_MS
  } catch {
    return true
  }
}

function markChunkReload(): void {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  } catch {
    /* storage disabled — fine, we'll still reload */
  }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)

    // Stale-deploy recovery: if the browser can't fetch a bundle chunk, the
    // user is holding an old tab after a deploy. Reload once to pick up the
    // new asset manifest.
    if (isChunkLoadError(error) && shouldAttemptChunkReload()) {
      markChunkReload()
      window.location.reload()
    }
  }

  render() {
    if (this.state.error) {
      const chunk = isChunkLoadError(this.state.error)
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden />
          <div>
            <h1 className="text-lg font-semibold text-fg">Something went wrong</h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              {chunk
                ? 'The portal was updated while this tab was open. Reload to pick up the latest version.'
                : 'A part of the portal crashed. You can try reloading this page or going back to the dashboard.'}
            </p>
            {import.meta.env.DEV ? (
              <pre className="mt-4 max-h-40 max-w-lg overflow-auto rounded-md border border-border bg-surface-2 p-3 text-left text-xs text-danger">
                {this.state.error.message}
              </pre>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => window.location.assign('/')}>
              Go to dashboard
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
