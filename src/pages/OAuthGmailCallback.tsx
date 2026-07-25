import { useEffect, useState } from 'react'
import {
  GMAIL_OAUTH_CHANNEL,
  GMAIL_OAUTH_MESSAGE_TYPE,
  GMAIL_OAUTH_STORAGE_KEY,
} from '@/lib/gmailAtsSync'

/**
 * Popup landing page for Gmail OAuth.
 * Uses BroadcastChannel + localStorage so Cross-Origin-Opener-Policy cannot break Sync.
 */
export function OAuthGmailCallbackPage() {
  const [status, setStatus] = useState('Finishing Google sign-in…')

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    const accessToken = hash.get('access_token') || undefined
    const error =
      hash.get('error_description') ||
      hash.get('error') ||
      query.get('error_description') ||
      query.get('error') ||
      undefined

    const payload = {
      type: GMAIL_OAUTH_MESSAGE_TYPE,
      accessToken,
      error,
      at: Date.now(),
    }

    try {
      localStorage.setItem(GMAIL_OAUTH_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore quota */
    }

    try {
      const channel = new BroadcastChannel(GMAIL_OAUTH_CHANNEL)
      channel.postMessage(payload)
      channel.close()
    } catch {
      /* BroadcastChannel unavailable */
    }

    // Best-effort for older browsers / when opener is still available
    try {
      if (window.opener) {
        window.opener.postMessage(payload, window.location.origin)
      }
    } catch {
      /* COOP may block opener */
    }

    setStatus(error ? 'Sign-in failed. You can close this window.' : 'Signed in. You can close this window.')
    window.setTimeout(() => {
      try {
        window.close()
      } catch {
        /* ignore */
      }
    }, 500)
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 text-center">
      <div className="space-y-2">
        <p className="text-sm text-muted">{status}</p>
        <p className="text-xs text-muted">If this window stays open, close it and return to Recruitment.</p>
      </div>
    </main>
  )
}
