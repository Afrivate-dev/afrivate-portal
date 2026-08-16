import { sanitizeSuggestedActions } from '@/lib/ava/avaDrafts'
import type { AvaLink, AvaResponse } from '@/lib/ava/types'

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/** Pull a JSON string value for a key even when the surrounding object is truncated. */
function extractJsonStringField(text: string, key: string): string | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 's')
  const m = text.match(re)
  if (!m?.[1]) return undefined
  return unescapeJsonString(m[1]).trim() || undefined
}

function extractJsonStringArray(text: string, key: string): string[] | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'm')
  const m = text.match(re)
  if (!m?.[1]) return undefined
  const items = [...m[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((x) => unescapeJsonString(x[1]))
  return items.length ? items : undefined
}

function extractLinksLoose(text: string): AvaLink[] | undefined {
  const block = text.match(/"links"\s*:\s*\[([\s\S]*?)(?:\]|$)/)
  if (!block?.[1]) return undefined
  const links: AvaLink[] = []
  const objs = block[1].matchAll(/\{[\s\S]*?\}/g)
  for (const obj of objs) {
    const label = extractJsonStringField(obj[0], 'label')
    const path = extractJsonStringField(obj[0], 'path')
    if (label && path?.startsWith('/')) links.push({ label: cleanLinkLabel(label), path })
  }
  if (!links.length) {
    const label =
      extractJsonStringField(block[1], 'label') || block[1].match(/"label"\s*:\s*"([^"]+)/)?.[1]
    if (label) {
      const path = guessPathFromLabel(label)
      if (path) links.push({ label: cleanLinkLabel(label), path })
    }
  }
  return links.length ? links : undefined
}

function cleanLinkLabel(label: string): string {
  return label
    .replace(/->/g, '→')
    .replace(/\s+/g, ' ')
    .replace(/["}].*$/, '')
    .trim()
}

function guessPathFromLabel(label: string): string | undefined {
  const t = label.toLowerCase()
  if (t.includes('time off') || t.includes('leave')) return '/people/leave'
  if (t.includes('learning')) return '/people/learning'
  if (t.includes('check')) return '/checkin'
  if (t.includes('task') || t.includes('my work')) return '/tasks'
  if (t.includes('survey')) return '/people/surveys'
  if (t.includes('my info') || t.includes('profile')) return '/people/my-info'
  if (t.includes('resource')) return '/resources'
  if (t.includes('approval')) return '/admin/approvals'
  if (t.includes('admin') || t.includes('employee')) return '/admin'
  return undefined
}

function looksLikeJsonEnvelope(text: string): boolean {
  const t = text.trim()
  return (
    (t.startsWith('{') && /"reply"\s*:/.test(t)) ||
    /^```(?:json)?/i.test(t) ||
    /"reply"\s*:\s*"/.test(t)
  )
}

function parseActions(raw: unknown) {
  return sanitizeSuggestedActions(raw)
}

function parseLinks(raw: unknown): AvaLink[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const links: AvaLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const l = item as Record<string, unknown>
    const label = asString(l.label)
    let path = asString(l.path)
    if (label && !path) path = guessPathFromLabel(label)
    if (label && path?.startsWith('/')) {
      links.push({ label: cleanLinkLabel(label), path })
    }
  }
  return links.length ? links : undefined
}

function fromObject(
  obj: Record<string, unknown>,
  source: AvaResponse['source'],
  fallback: string,
): AvaResponse {
  const reply = asString(obj.reply) || fallback
  return {
    source,
    reply,
    citations: Array.isArray(obj.citations)
      ? obj.citations.filter((c): c is string => typeof c === 'string')
      : undefined,
    links: parseLinks(obj.links),
    suggestedActions: parseActions(obj.suggestedActions),
  }
}

/** Parse Gemini JSON (or fenced / truncated JSON) into AvaResponse fields. Never returns raw JSON as reply. */
export function parseAvaModelText(text: string, source: AvaResponse['source']): AvaResponse {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1]?.trim() || trimmed).trim()

  try {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const obj = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>
      if (typeof obj.reply === 'string') {
        return fromObject(obj, source, candidate)
      }
    }
  } catch {
    /* try loose extract */
  }

  if (looksLikeJsonEnvelope(candidate)) {
    const reply = extractJsonStringField(candidate, 'reply')
    if (reply) {
      return {
        source,
        reply,
        citations: extractJsonStringArray(candidate, 'citations'),
        links: extractLinksLoose(candidate),
      }
    }
    return {
      source,
      reply:
        'I had trouble formatting that answer. Please ask again, or open **Resources** for the Portal User Guide.',
    }
  }

  return { source, reply: candidate }
}

/** If an assistant bubble accidentally stored JSON, recover the human reply for history/UI. */
export function normalizeAvaDisplayText(content: string): string {
  if (!looksLikeJsonEnvelope(content)) return content
  return parseAvaModelText(content, 'local').reply
}
