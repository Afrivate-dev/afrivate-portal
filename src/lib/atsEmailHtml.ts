/** Marker separating plain scoring text from original HTML email body in candidate.notes */
export const AFRIVATE_EMAIL_HTML_MARKER = '<<<AFRIVATE_EMAIL_HTML>>>'

export function splitApplicationNotes(notes?: string | null): { text: string; html?: string } {
  if (!notes) return { text: '' }
  const idx = notes.indexOf(AFRIVATE_EMAIL_HTML_MARKER)
  if (idx === -1) return { text: notes }
  return {
    text: notes.slice(0, idx).trim(),
    html: notes.slice(idx + AFRIVATE_EMAIL_HTML_MARKER.length).trim() || undefined,
  }
}

export function joinApplicationNotes(text: string, html?: string): string {
  const base = text.trim()
  if (!html?.trim()) return base
  return `${base}\n\n${AFRIVATE_EMAIL_HTML_MARKER}\n${html.trim()}`
}

/** True when a string is mostly HTML markup (not a normal plain-text email). */
export function looksLikeHtmlMarkup(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (/^<!DOCTYPE\s+html/i.test(v) || /^<html[\s>]/i.test(v)) return true
  const tags = v.match(/<\/?(?:div|p|table|span|br|html|body|td|tr|a|img|h[1-6])\b/gi)
  return (tags?.length ?? 0) >= 3
}

function normalizeWhitespace(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Pull attachment filenames listed as "Attachments: a.pdf, b.docx" in stored notes. */
export function extractAttachmentNamesFromNotes(text: string): string[] {
  const names = new Set<string>()
  for (const match of text.matchAll(/^Attachments:\s*(.+)$/gim)) {
    const line = match[1] ?? ''
    for (const part of line.split(/[,;]/)) {
      const name = part.trim()
      if (name && /\.[a-z0-9]{2,5}$/i.test(name)) names.add(name)
    }
  }
  return [...names]
}

/**
 * Clean application text for the reading pane:
 * - drop CV extract blocks / ATS markers
 * - drop raw "Attachments:" lines (shown as chips instead)
 * - drop duplicated plain+collapsed copies of the same letter
 */
export function cleanEmailBodyForDisplay(body: string): string {
  const t = body
    .replace(/\n---\s*Resume:[\s\S]*?(?=\n---\s*Resume:|$)/gi, '')
    .replace(/^Attachments:\s*.+$/gim, '')
    .replace(/\[ATS scanned CV:[^\]]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const parts = t
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length < 2) return t

  const kept: string[] = []
  for (const p of parts) {
    const isLongSingleLine = !p.includes('\n') && p.length >= 80
    if (isLongSingleLine && kept.length > 0) {
      const prevNorm = normalizeWhitespace(kept.join(' '))
      const pNorm = normalizeWhitespace(p)
      const sample = prevNorm.slice(0, 72)
      const sample2 = pNorm.slice(0, 72)
      if (sample.length >= 24 && pNorm.includes(sample)) continue
      if (sample2.length >= 24 && prevNorm.includes(sample2)) continue
    }
    kept.push(p)
  }

  return kept.join('\n\n').trim()
}

/** Escape text then turn it into readable email HTML (paragraphs + links). */
export function plainTextToEmailHtml(text: string): string {
  const cleaned = cleanEmailBodyForDisplay(text)
  const escaped = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  )
  // Treat single newlines as breaks inside a paragraph; blank lines start new paragraphs
  const paragraphs = withLinks
    .split(/\n{2,}/)
    .map((block) => {
      const inner = block.replace(/\n/g, '<br />\n')
      return `<p>${inner}</p>`
    })
    .join('\n')
  return paragraphs || `<p>${withLinks}</p>`
}

/** Strip dangerous tags/handlers so email HTML is safer to show in a sandboxed iframe. */
export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '')
    .replace(/<meta[\s\S]*?>/gi, '')
    .replace(/<base[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1=$2#$2')
    .replace(/(href|src)\s*=\s*javascript:[^\s>]*/gi, '$1="#"')
}

/** True when “HTML” is basically unstyled plain text (prefer our letter styling). */
export function isWeakEmailHtml(html: string): boolean {
  const raw = html.trim()
  if (!raw) return true
  const withoutTags = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const tagCount = (raw.match(/<\/?[a-z][^>]*>/gi) || []).length
  // Very few tags, or mostly <br>/<div> wrappers → treat as plain
  if (tagCount <= 4) return true
  if (!/<(table|img|h[1-6]|ul|ol|blockquote)\b/i.test(raw) && tagCount < 12) return true
  if (withoutTags.length > 80 && tagCount / Math.max(1, withoutTags.length / 40) < 0.5) {
    // sparse markup relative to text length
    if (!/<table\b/i.test(raw)) return true
  }
  return false
}

/** Build a full HTML document for iframe srcDoc rendering (Gmail-like reading pane). */
export function buildEmailPreviewDocument(html: string): string {
  const raw = html.trim()
  const inner = looksLikeHtmlMarkup(raw) && !/^<!DOCTYPE|^<html/i.test(raw)
    ? sanitizeEmailHtml(raw)
    : /^<!DOCTYPE|^<html/i.test(raw)
      ? sanitizeEmailHtml(raw.replace(/^[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, ''))
      : sanitizeEmailHtml(raw)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base target="_blank" rel="noopener noreferrer" />
<style>
  html, body { margin: 0; padding: 0; background: #fff; color: #202124; }
  body {
    font-family: "Google Sans", Roboto, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    padding: 20px 18px 28px;
    word-break: break-word;
    max-width: 42rem;
  }
  img { max-width: 100%; height: auto; }
  a { color: #1a73e8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  p { margin: 0 0 1em; }
  pre, code { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
  blockquote { margin: 0.5em 0; padding-left: 12px; border-left: 3px solid #dadce0; color: #5f6368; }
  table { max-width: 100%; border-collapse: collapse; }
  td, th { word-break: break-word; vertical-align: top; }
  table[width], td[width] { width: auto !important; max-width: 100% !important; }
</style>
</head>
<body>${inner}</body>
</html>`
}
