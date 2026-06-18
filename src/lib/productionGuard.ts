import { isSupabaseAuthEnabled } from '@/lib/authMode'

/**
 * In production builds, refuse to run without Supabase auth configured.
 * Mock/localStorage mode is for local development only.
 */
export function assertProductionConfig(): void {
  if (!import.meta.env.PROD) return
  if (isSupabaseAuthEnabled()) return

  const msg =
    '[AfriVate Portal] Production requires VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_USE_SUPABASE_AUTH=true.'

  console.error(msg)

  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:1.5rem;text-align:center;">
        <h1 style="font-size:1.25rem;margin-bottom:0.5rem;">Portal misconfigured</h1>
        <p style="color:#666;font-size:0.875rem;">Supabase authentication is required in production. Contact your administrator.</p>
      </div>`
  }

  throw new Error(msg)
}
