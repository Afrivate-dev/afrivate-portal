import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { isSupabaseDataEnabled } from '@/lib/dataMode'

/**
 * In production builds, refuse to run without full Supabase configuration.
 * Mock/localStorage mode is for local development only.
 */
export function assertProductionConfig(): void {
  if (!import.meta.env.PROD) return

  const authOk = isSupabaseAuthEnabled()
  const dataOk = isSupabaseDataEnabled()

  if (authOk && dataOk) return

  const msg =
    '[AfriVate Portal] Production requires VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_USE_SUPABASE_AUTH=true, and VITE_USE_SUPABASE_DATA=true.'

  console.error(msg)

  const root = document.getElementById('root')
  if (root) {
    root.textContent = ''
    const wrap = document.createElement('div')
    wrap.style.cssText =
      'font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:1.5rem;text-align:center;'
    const h1 = document.createElement('h1')
    h1.style.fontSize = '1.25rem'
    h1.textContent = 'Portal misconfigured'
    const p = document.createElement('p')
    p.style.cssText = 'color:#666;font-size:0.875rem;'
    p.textContent =
      'Supabase authentication and data mode are required in production. Contact your administrator.'
    wrap.append(h1, p)
    root.append(wrap)
  }

  throw new Error(msg)
}
