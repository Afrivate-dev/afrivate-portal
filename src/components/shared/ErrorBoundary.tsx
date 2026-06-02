import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Props = { children: ReactNode }

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden />
          <div>
            <h1 className="text-lg font-semibold text-fg">Something went wrong</h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              A part of the portal crashed. You can try reloading this page or going back to the dashboard.
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
