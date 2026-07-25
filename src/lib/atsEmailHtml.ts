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

/** Build a full HTML document for iframe srcDoc rendering (Gmail-like reading pane). */
export function buildEmailPreviewDocument(html: string): string {
  const safe = sanitizeEmailHtml(html)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<base target="_blank" rel="noopener noreferrer" />
<style>
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body {
    font-family: "Google Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    padding: 16px 18px 24px;
    word-break: break-word;
  }
  img { max-width: 100%; height: auto; }
  a { color: #1a73e8; }
  pre, code { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
  blockquote { margin: 0.5em 0; padding-left: 12px; border-left: 3px solid #dadce0; color: #5f6368; }
  table { max-width: 100%; border-collapse: collapse; }
  td, th { word-break: break-word; }
</style>
</head>
<body>${safe}</body>
</html>`
}
