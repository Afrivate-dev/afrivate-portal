/**
 * Gmail ATS sync for afrivatehr@gmail.com using Google Identity Services + Gmail API.
 * Requires VITE_GOOGLE_CLIENT_ID (same OAuth client as Drive picker).
 * Add Gmail API scope and authorized JS origins in Google Cloud Console.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
const HR_MAILBOX = 'afrivatehr@gmail.com'
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

export interface GmailApplicationMessage {
  id: string
  threadId: string
  subject: string
  from: string
  date?: string
  snippet: string
  bodyText: string
}

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gsi="1"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      return
    }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.dataset.gsi = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load Google Identity Services'))
    document.head.appendChild(s)
  })
}

export function isGmailAtsConfigured(): boolean {
  return Boolean(CLIENT_ID)
}

export async function requestGmailAccessToken(): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error(
      'Google Client ID is not configured. Add VITE_GOOGLE_CLIENT_ID and enable Gmail API for afrivatehr@gmail.com.',
    )
  }
  await loadGsi()
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2
    if (!oauth2) {
      reject(new Error('Google Identity Services did not load. Refresh and try again.'))
      return
    }
    const client = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: GMAIL_SCOPE,
      hint: HR_MAILBOX,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'Gmail authorization was cancelled'))
          return
        }
        resolve(resp.access_token)
      },
    })
    client.requestAccessToken({ prompt: '' })
  })
}

function decodeBodyData(data?: string): string {
  if (!data) return ''
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return decodeURIComponent(
      Array.from(atob(normalized))
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
  } catch {
    try {
      return atob(normalized)
    } catch {
      return ''
    }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

type GmailPayload = {
  payload?: {
    mimeType?: string
    body?: { data?: string }
    parts?: GmailPayload['payload'][]
    headers?: Array<{ name: string; value: string }>
  }
  snippet?: string
}

function extractTextFromPayload(payload?: GmailPayload['payload']): string {
  if (!payload) return ''
  const chunks: string[] = []

  const walk = (part?: GmailPayload['payload']) => {
    if (!part) return
    const mime = (part.mimeType || '').toLowerCase()
    if (part.body?.data) {
      const decoded = decodeBodyData(part.body.data)
      if (mime.includes('html')) chunks.push(stripHtml(decoded))
      else chunks.push(decoded)
    }
    part.parts?.forEach(walk)
  }
  walk(payload)
  return chunks.join('\n\n').trim()
}

function headerValue(
  headers: Array<{ name: string; value: string }> | undefined,
  name: string,
): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

/** Default query targets AfriVate application emails and common job-board forwards. */
export function defaultGmailAtsQuery(days = 45): string {
  return [
    `newer_than:${days}d`,
    '(',
    'subject:"APPLICATION FOR FRONT-END"',
    'OR subject:"APPLICATION FOR BACK-END"',
    'OR subject:"APPLICATION FOR GRAPHIC"',
    'OR subject:application',
    'OR from:indeedemail.com',
    'OR from:indeed.com',
    'OR from:linkedin.com',
    ')',
  ].join(' ')
}

export async function fetchGmailApplications(options?: {
  accessToken?: string
  query?: string
  maxResults?: number
}): Promise<GmailApplicationMessage[]> {
  const token = options?.accessToken ?? (await requestGmailAccessToken())
  const query = options?.query ?? defaultGmailAtsQuery()
  const maxResults = options?.maxResults ?? 50

  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  listUrl.searchParams.set('q', query)
  listUrl.searchParams.set('maxResults', String(maxResults))

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!listRes.ok) {
    const err = await listRes.text()
    throw new Error(`Gmail list failed (${listRes.status}): ${err.slice(0, 200)}`)
  }

  const listJson = (await listRes.json()) as { messages?: Array<{ id: string; threadId: string }> }
  const ids = listJson.messages ?? []
  const out: GmailApplicationMessage[] = []

  for (const m of ids) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!msgRes.ok) continue
    const msg = (await msgRes.json()) as GmailPayload & {
      id: string
      threadId: string
      snippet?: string
    }
    const headers = msg.payload?.headers
    const subject = headerValue(headers, 'Subject')
    const from = headerValue(headers, 'From')
    const date = headerValue(headers, 'Date')
    const bodyText = extractTextFromPayload(msg.payload) || msg.snippet || ''
    out.push({
      id: msg.id,
      threadId: msg.threadId,
      subject,
      from,
      date,
      snippet: msg.snippet ?? '',
      bodyText: [`Subject: ${subject}`, `From: ${from}`, '', bodyText].join('\n'),
    })
  }

  return out
}

export { HR_MAILBOX }
