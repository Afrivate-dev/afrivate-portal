/** Session key so a magic-link round trip can return to the page that was requested. */
export const AUTH_NEXT_STORAGE_KEY = 'av-auth-next'

const BLOCKED_PATHS = new Set(['/login', '/request-access', '/forgot-password', '/reset-password'])

function pageOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'http://localhost'
}

/** Accept only a same-origin path. Anything else, including open redirects, becomes `/`. */
export function sanitizeInternalPath(next: string | null | undefined): string {
  if (!next) return '/'
  const value = next.trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  if (value.includes('://') || value.includes('\\')) return '/'

  let url: URL
  try {
    url = new URL(value, pageOrigin())
  } catch {
    return '/'
  }
  if (url.origin !== pageOrigin()) return '/'

  const pathname = url.pathname.replace(/\/$/, '') || '/'
  if (BLOCKED_PATHS.has(pathname)) return '/'

  const path = `${url.pathname}${url.search}${url.hash}`
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

function pathFromState(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('from' in state)) return null
  const from = (state as { from?: { pathname?: string; search?: string; hash?: string } }).from
  if (!from?.pathname || typeof from.pathname !== 'string') return null
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
}

function rememberedNext(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY)
}

export function rememberAuthNext(path: string): void {
  if (typeof sessionStorage === 'undefined') return
  const safe = sanitizeInternalPath(path)
  if (safe === '/') sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY)
  else sessionStorage.setItem(AUTH_NEXT_STORAGE_KEY, safe)
}

export function clearRememberedAuthNext(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY)
}

/**
 * Where to send someone after sign-in.
 * Query `next` wins, then router state `{ from }`, then the value stored before a magic link.
 * An unsafe or auth-page target returns `/` and does not fall through to another source.
 */
export function getSafeNext(searchParams: URLSearchParams, state: unknown): string {
  const query = searchParams.get('next')
  if (query != null && query.trim() !== '') return sanitizeInternalPath(query)
  const fromState = pathFromState(state)
  if (fromState) return sanitizeInternalPath(fromState)
  const stored = rememberedNext()
  if (stored) return sanitizeInternalPath(stored)
  return '/'
}

/** Login URL Supabase should return to, keeping a safe in-app path. */
export function loginRedirectUrl(nextPath?: string): string {
  const safe = sanitizeInternalPath(nextPath)
  const url = new URL('/login', pageOrigin())
  if (safe !== '/') url.searchParams.set('next', safe)
  return url.toString()
}
