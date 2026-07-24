/**
 * Gmail ATS sync for afrivatehr@gmail.com using Google Identity Services + Gmail API.
 * Downloads and text-extracts CV/resume attachments (PDF, DOCX, images) for scoring.
 */

import {
  extractResumeText,
  gmailAttachmentDataToArrayBuffer,
  isLikelyResumeAttachment,
  type ResumeExtractResult,
} from './atsResumeExtract'

const CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID?.trim()
const HR_MAILBOX = 'afrivatehr@gmail.com'
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
/** How far back Sync searches (keep in sync with UI copy). */
export const GMAIL_ATS_LOOKBACK_DAYS = 90
/** Gmail API page size (max 500). We paginate until the inbox query is exhausted. */
export const GMAIL_LIST_PAGE_SIZE = 500
/** Safety ceiling so a huge inbox cannot freeze the browser in one session. */
export const GMAIL_SYNC_HARD_CAP = 2000
const MAX_RESUME_ATTACHMENTS_PER_MESSAGE = 4

export interface GmailApplicationMessage {
  id: string
  threadId: string
  subject: string
  from: string
  date?: string
  snippet: string
  bodyText: string
  attachmentNames?: string[]
  /** Filenames whose text was successfully extracted into bodyText. */
  resumeFilesScanned?: string[]
  resumeExtractErrors?: string[]
}

/** Open the original Gmail thread for afrivatehr@gmail.com (or another mailbox). */
export function gmailThreadUrl(threadId: string, mailbox = HR_MAILBOX): string {
  return `https://mail.google.com/mail/?authuser=${encodeURIComponent(mailbox)}#all/${threadId}`
}

/** Default: entire inbox (excl. spam/trash) in the lookback window — attachments scanned per email. */
export function defaultGmailAtsQuery(days = GMAIL_ATS_LOOKBACK_DAYS): string {
  return [`in:inbox`, `newer_than:${days}d`, `-in:spam`, `-in:trash`].join(' ')
}

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const finish = () => {
      if (window.google?.accounts?.oauth2) resolve()
      else reject(new Error('Google Identity Services loaded but oauth2 is unavailable.'))
    }
    const existing = document.querySelector('script[data-gsi="1"]') as HTMLScriptElement | null
    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve()
        return
      }
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', () => reject(new Error('Could not load Google Identity Services')), {
        once: true,
      })
      window.setTimeout(() => {
        if (window.google?.accounts?.oauth2) resolve()
      }, 500)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.dataset.gsi = '1'
    s.onload = finish
    s.onerror = () => reject(new Error('Could not load Google Identity Services'))
    document.head.appendChild(s)
  })
}

export function isValidGoogleClientId(clientId: string | undefined | null): boolean {
  if (!clientId) return false
  const matches = clientId.match(/\.apps\.googleusercontent\.com/g) ?? []
  return matches.length === 1 && !clientId.endsWith('.apps.googleusercontent.com.apps.googleusercontent.com')
}

export function isGmailAtsConfigured(): boolean {
  return isValidGoogleClientId(CLIENT_ID)
}

function describeOAuthError(error?: string): string {
  const code = (error || '').toLowerCase()
  if (code.includes('popup_closed') || code.includes('access_denied')) {
    return 'Google sign-in was cancelled. Try again and allow Gmail access for afrivatehr@gmail.com.'
  }
  if (code.includes('idpiframe_initialization_failed') || code.includes('origin')) {
    return 'This site origin is not allowed for the Google Client ID. Add it under Authorized JavaScript origins in Google Cloud.'
  }
  if (code.includes('invalid_client') || code.includes('unauthorized_client')) {
    return 'Invalid Google Client ID. Check VITE_GOOGLE_CLIENT_ID (it should end with .apps.googleusercontent.com once).'
  }
  if (code.includes('illegal') || code.includes('invocation')) {
    return 'Google sign-in must start from the Sync button click. Wait a second for Google to load, then click Sync again.'
  }
  return error || 'Gmail authorization failed'
}

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void
}

let gsiLoadPromise: Promise<void> | null = null
let cachedTokenClient: TokenClient | null = null
let tokenRequestHandler:
  | ((resp: { access_token?: string; error?: string }) => void)
  | null = null

function ensureTokenClient(): TokenClient {
  if (cachedTokenClient) return cachedTokenClient
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2 || !CLIENT_ID) {
    throw new Error('Google Identity Services did not load. Refresh and try again.')
  }
  cachedTokenClient = oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: GMAIL_SCOPE,
    hint: HR_MAILBOX,
    callback: (resp) => {
      tokenRequestHandler?.(resp)
    },
  })
  return cachedTokenClient
}

/** Warm up GSI on ATS page load so Sync can open the Google popup from the click gesture. */
export function preloadGmailAts(): Promise<void> {
  if (!CLIENT_ID) return Promise.resolve()
  if (!gsiLoadPromise) {
    gsiLoadPromise = loadGsi()
      .then(() => {
        ensureTokenClient()
      })
      .catch((err) => {
        gsiLoadPromise = null
        throw err
      })
  }
  return gsiLoadPromise
}

export function isGmailAtsReady(): boolean {
  return Boolean(window.google?.accounts?.oauth2 && cachedTokenClient)
}

/**
 * Request a Gmail token. Must be called directly from a click handler with no prior await,
 * or browsers/Google will throw "illegal invocation" / block the popup.
 */
export function requestGmailAccessTokenFromGesture(): Promise<string> {
  if (!CLIENT_ID) {
    return Promise.reject(
      new Error(
        'Google Client ID is not configured. Add VITE_GOOGLE_CLIENT_ID and enable Gmail API for afrivatehr@gmail.com.',
      ),
    )
  }
  if (!isValidGoogleClientId(CLIENT_ID)) {
    return Promise.reject(
      new Error(
        'VITE_GOOGLE_CLIENT_ID looks malformed. It should look like 123-abc.apps.googleusercontent.com (suffix only once).',
      ),
    )
  }
  if (!window.google?.accounts?.oauth2) {
    return Promise.reject(
      new Error('Google sign-in is still loading. Wait a moment, then click Sync again.'),
    )
  }

  return new Promise((resolve, reject) => {
    let attemptedConsent = false
    const client = ensureTokenClient()
    tokenRequestHandler = (resp) => {
      if (resp.access_token) {
        tokenRequestHandler = null
        resolve(resp.access_token)
        return
      }
      if (!attemptedConsent && resp.error && /interaction|consent|popup|login/i.test(resp.error)) {
        attemptedConsent = true
        client.requestAccessToken({ prompt: 'consent' })
        return
      }
      tokenRequestHandler = null
      reject(new Error(describeOAuthError(resp.error)))
    }
    // Must run synchronously inside the user-gesture call stack
    client.requestAccessToken({ prompt: 'consent' })
  })
}

/** @deprecated Prefer preloadGmailAts + requestGmailAccessTokenFromGesture from Sync click. */
export async function requestGmailAccessToken(): Promise<string> {
  await preloadGmailAts()
  return requestGmailAccessTokenFromGesture()
}

/** Exported for tests — Gmail API uses URL-safe base64. */
export function decodeBodyData(data?: string): string {
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

export type GmailApiPart = {
  mimeType?: string
  filename?: string
  body?: { data?: string; attachmentId?: string; size?: number }
  parts?: GmailApiPart[]
  headers?: Array<{ name: string; value: string }>
}

export type GmailApiMessage = {
  id: string
  threadId: string
  snippet?: string
  payload?: GmailApiPart
}

export type GmailAttachmentRef = {
  filename: string
  mimeType: string
  attachmentId?: string
  inlineData?: string
  size?: number
}

function collectAttachmentNames(payload?: GmailApiPart): string[] {
  return collectResumeAttachmentRefs(payload, false).map((a) => a.filename)
}

/** Collect file parts suitable for CV/resume text extraction. */
export function collectResumeAttachmentRefs(
  payload?: GmailApiPart,
  resumeOnly = true,
): GmailAttachmentRef[] {
  const out: GmailAttachmentRef[] = []
  const walk = (part?: GmailApiPart) => {
    if (!part) return
    const filename = part.filename?.trim()
    if (filename) {
      const mimeType = part.mimeType || 'application/octet-stream'
      const candidate = {
        filename,
        mimeType,
        attachmentId: part.body?.attachmentId,
        inlineData: part.body?.data,
        size: part.body?.size,
      }
      if (!resumeOnly || isLikelyResumeAttachment(filename, mimeType)) {
        out.push(candidate)
      }
    }
    part.parts?.forEach(walk)
  }
  walk(payload)
  // Prefer PDF/DOCX over images; keep stable order within type
  const rank = (name: string) => {
    const n = name.toLowerCase()
    if (n.endsWith('.pdf')) return 0
    if (n.endsWith('.docx')) return 1
    if (n.endsWith('.txt') || n.endsWith('.rtf') || n.endsWith('.md')) return 2
    return 3
  }
  return out
    .sort((a, b) => rank(a.filename) - rank(b.filename))
    .slice(0, MAX_RESUME_ATTACHMENTS_PER_MESSAGE)
}

export function extractTextFromPayload(payload?: GmailApiPart): string {
  if (!payload) return ''
  const plain: string[] = []
  const html: string[] = []

  const walk = (part?: GmailApiPart) => {
    if (!part) return
    const mime = (part.mimeType || '').toLowerCase()
    // Skip binary attachment payloads here — handled by resume extractor
    if (part.filename?.trim()) {
      part.parts?.forEach(walk)
      return
    }
    if (part.body?.data) {
      const decoded = decodeBodyData(part.body.data)
      if (mime.includes('text/plain')) plain.push(decoded)
      else if (mime.includes('html')) html.push(stripHtml(decoded))
      else if (!mime.includes('image/') && !mime.includes('application/pdf') && !mime.includes('officedocument')) {
        plain.push(decoded)
      }
    }
    part.parts?.forEach(walk)
  }
  walk(payload)
  return [...plain, ...html].join('\n\n').trim()
}

function headerValue(
  headers: Array<{ name: string; value: string }> | undefined,
  name: string,
): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export function formatResumeExtractBlock(extracted: ResumeExtractResult): string {
  if (!extracted.text.trim()) return ''
  return [`--- Resume: ${extracted.filename} ---`, extracted.text.trim()].join('\n')
}

/** Build the text blob used for ATS scoring from a Gmail API message (body only; resumes added later). */
export function parseGmailApiMessage(msg: GmailApiMessage): GmailApplicationMessage {
  const headers = msg.payload?.headers
  const subject = headerValue(headers, 'Subject')
  const from = headerValue(headers, 'From')
  const date = headerValue(headers, 'Date')
  const attachmentNames = collectAttachmentNames(msg.payload)
  const body = extractTextFromPayload(msg.payload) || msg.snippet || ''
  const attachmentLine =
    attachmentNames.length > 0 ? `\nAttachments: ${attachmentNames.join(', ')}` : ''
  const bodyText = [`Subject: ${subject}`, `From: ${from}`, '', body, attachmentLine]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n')
    .trim()

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject,
    from,
    date: date || undefined,
    snippet: msg.snippet ?? '',
    bodyText,
    attachmentNames,
  }
}

async function downloadGmailAttachmentData(
  messageId: string,
  attachmentId: string,
  token: string,
  doFetch: typeof fetch,
): Promise<string> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`
  const res = await doFetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    throw new Error(`Attachment download failed (${res.status})`)
  }
  const json = (await res.json()) as { data?: string }
  if (!json.data) throw new Error('Attachment payload empty')
  return json.data
}

/** Download + extract text from CV attachments and append to bodyText for scoring. */
export async function enrichMessageWithResumeText(
  msg: GmailApiMessage,
  parsed: GmailApplicationMessage,
  options: {
    accessToken: string
    fetchImpl?: typeof fetch
    extractFn?: typeof extractResumeText
  },
): Promise<GmailApplicationMessage> {
  const doFetch = options.fetchImpl ?? fetch
  const extractFn = options.extractFn ?? extractResumeText
  const refs = collectResumeAttachmentRefs(msg.payload, true)
  if (!refs.length) return parsed

  const blocks: string[] = []
  const scanned: string[] = []
  const errors: string[] = []

  for (const ref of refs) {
    try {
      const rawB64 =
        ref.inlineData ||
        (ref.attachmentId
          ? await downloadGmailAttachmentData(msg.id, ref.attachmentId, options.accessToken, doFetch)
          : '')
      if (!rawB64) {
        errors.push(`${ref.filename}: no attachment data`)
        continue
      }
      const buffer = gmailAttachmentDataToArrayBuffer(rawB64)
      const extracted = await extractFn(buffer, ref.filename, ref.mimeType)
      if (extracted.error && !extracted.text) {
        errors.push(`${ref.filename}: ${extracted.error}`)
        continue
      }
      if (!extracted.text.trim()) {
        errors.push(`${ref.filename}: no readable text`)
        continue
      }
      blocks.push(formatResumeExtractBlock(extracted))
      scanned.push(ref.filename)
    } catch (err) {
      errors.push(`${ref.filename}: ${err instanceof Error ? err.message : 'extract failed'}`)
    }
  }

  if (!blocks.length) {
    return { ...parsed, resumeExtractErrors: errors.length ? errors : undefined }
  }

  return {
    ...parsed,
    bodyText: [parsed.bodyText, '', ...blocks].join('\n').trim(),
    resumeFilesScanned: scanned,
    resumeExtractErrors: errors.length ? errors : undefined,
  }
}

async function listAllGmailMessageIds(options: {
  token: string
  query: string
  hardCap: number
  pageSize: number
  fetchImpl: typeof fetch
  onProgress?: (info: { done: number; total: number; label: string }) => void
}): Promise<Array<{ id: string; threadId: string }>> {
  const ids: Array<{ id: string; threadId: string }> = []
  let pageToken: string | undefined
  let page = 0

  do {
    page += 1
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
    listUrl.searchParams.set('q', options.query)
    listUrl.searchParams.set('maxResults', String(options.pageSize))
    if (pageToken) listUrl.searchParams.set('pageToken', pageToken)

    options.onProgress?.({
      done: ids.length,
      total: Math.max(ids.length, 1),
      label: `Listing inbox emails (page ${page}, ${ids.length} found)…`,
    })

    const listRes = await options.fetchImpl(listUrl.toString(), {
      headers: { Authorization: `Bearer ${options.token}` },
    })
    if (!listRes.ok) {
      const err = await listRes.text()
      throw new Error(`Gmail list failed (${listRes.status}): ${err.slice(0, 200)}`)
    }

    const listJson = (await listRes.json()) as {
      messages?: Array<{ id: string; threadId: string }>
      nextPageToken?: string
      resultSizeEstimate?: number
    }
    ids.push(...(listJson.messages ?? []))
    pageToken = listJson.nextPageToken
  } while (pageToken && ids.length < options.hardCap)

  return ids.slice(0, options.hardCap)
}

export async function fetchGmailApplications(options?: {
  accessToken?: string
  query?: string
  /** @deprecated Prefer hardCap — sync paginates the full inbox query. */
  maxResults?: number
  hardCap?: number
  /** When false, skip CV download/OCR (faster tests). Default true. */
  extractResumes?: boolean
  /** Injected for tests */
  fetchImpl?: typeof fetch
  extractFn?: typeof extractResumeText
  onProgress?: (info: { done: number; total: number; label: string }) => void
}): Promise<GmailApplicationMessage[]> {
  const token = options?.accessToken ?? (await requestGmailAccessToken())
  const query = options?.query ?? defaultGmailAtsQuery()
  const hardCap = options?.hardCap ?? options?.maxResults ?? GMAIL_SYNC_HARD_CAP
  const doFetch = options?.fetchImpl ?? fetch
  const extractResumes = options?.extractResumes !== false

  const ids = await listAllGmailMessageIds({
    token,
    query,
    hardCap,
    pageSize: Math.min(GMAIL_LIST_PAGE_SIZE, hardCap),
    fetchImpl: doFetch,
    onProgress: options?.onProgress,
  })

  const out: GmailApplicationMessage[] = []

  for (let i = 0; i < ids.length; i += 1) {
    const m = ids[i]!
    options?.onProgress?.({
      done: i,
      total: ids.length,
      label: `Reading email ${i + 1} of ${ids.length}…`,
    })
    const msgRes = await doFetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!msgRes.ok) continue
    const msg = (await msgRes.json()) as GmailApiMessage
    let parsed = parseGmailApiMessage(msg)
    if (extractResumes) {
      options?.onProgress?.({
        done: i,
        total: ids.length,
        label: `Scanning attachments for email ${i + 1} of ${ids.length}…`,
      })
      parsed = await enrichMessageWithResumeText(msg, parsed, {
        accessToken: token,
        fetchImpl: doFetch,
        extractFn: options?.extractFn,
      })
    }
    out.push(parsed)
  }

  options?.onProgress?.({ done: ids.length, total: ids.length, label: 'Scoring applications…' })
  return out
}

export { HR_MAILBOX }
