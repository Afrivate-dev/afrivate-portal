import { useEffect, useState } from 'react'
import { GMAIL_OAUTH_MESSAGE_TYPE } from '@/lib/gmailAtsSync'

/**
 * Popup landing page for Gmail OAuth (implicit token in the URL hash).
 * Posts the token back to the opener and closes itself.
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

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: GMAIL_OAUTH_MESSAGE_TYPE,
          accessToken,
          error,
        },
        window.location.origin,
      )
      setStatus(error ? 'Sign-in failed. You can close this window.' : 'Signed in. Closing…')
      window.setTimeout(() => {
        try {
          window.close()
        } catch {
          /* ignore */
        }
      }, 400)
      return
    }

    setStatus(
      error
        ? `Sign-in failed: ${error}`
        : accessToken
          ? 'Signed in. You can close this tab and return to Recruitment.'
          : 'No sign-in result found. Close this tab and try Sync again.',
    )
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 text-center">
      <p className="text-sm text-muted">{status}</p>
    </main>
  )
}
