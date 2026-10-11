import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { assertProductionConfig } from '@/lib/productionGuard'
import './styles/index.css'
import App from './App'

assertProductionConfig()

registerSW({ immediate: true })

/**
 * Stale-deploy recovery for lazy chunks: Vite names bundle files with a
 * content hash, so after we deploy a new build the previously-cached
 * `index-xxxx.js` file is a 404. Importing it rejects with
 * `TypeError: Failed to fetch dynamically imported module` — which does
 * NOT always flow through React's error boundary (e.g. when the import
 * happens from a sidebar prefetch or a Suspense boundary with no catch).
 * Catch those at the window level and reload the tab once.
 */
const CHUNK_RELOAD_KEY = 'av-chunk-reload-at'
const CHUNK_RELOAD_COOLDOWN_MS = 30_000
function isChunkLoadError(message: unknown): boolean {
  const text =
    typeof message === 'string'
      ? message
      : (message as { message?: unknown } | null)?.message
      ? String((message as { message?: unknown }).message)
      : ''
  return /ChunkLoadError|Loading chunk \d+ failed|dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    text,
  )
}
function shouldReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0')
    return !last || Date.now() - last > CHUNK_RELOAD_COOLDOWN_MS
  } catch {
    return true
  }
}
function markReload(): void {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  } catch {
    /* storage unavailable — reload anyway */
  }
}
window.addEventListener('error', (event) => {
  if (!isChunkLoadError(event.error ?? event.message)) return
  if (!shouldReload()) return
  markReload()
  window.location.reload()
})
window.addEventListener('unhandledrejection', (event) => {
  if (!isChunkLoadError(event.reason)) return
  if (!shouldReload()) return
  markReload()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
