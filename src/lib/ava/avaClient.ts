import { supabase } from '@/lib/supabase'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { localAvaRespond } from '@/lib/ava/localFallback'
import { normalizeAvaDisplayText, parseAvaModelText } from '@/lib/ava/parseResponse'
import type { AvaChatMessage, AvaLink, AvaResponse, AvaSuggestedAction, AvaUserContext } from '@/lib/ava/types'

/** AVA is on by default; set VITE_AVA_ENABLED=false to hide. */
export function isAvaEnabled(): boolean {
  const flag = import.meta.env.VITE_AVA_ENABLED
  if (flag === 'false' || flag === '0') return false
  return true
}

function coerceResponse(payload: Record<string, unknown>): AvaResponse | null {
  const source: AvaResponse['source'] = payload.source === 'local' ? 'local' : 'gemini'

  if (typeof payload.reply === 'string') {
    const reply = payload.reply.trim()
    // Edge sometimes returns the whole JSON blob in `reply` when parse fails mid-way
    if (reply.startsWith('{') && /"reply"\s*:/.test(reply)) {
      return parseAvaModelText(reply, source)
    }
    return {
      source,
      reply: normalizeAvaDisplayText(reply),
      citations: Array.isArray(payload.citations)
        ? payload.citations.filter((c): c is string => typeof c === 'string')
        : undefined,
      links: sanitizeLinks(payload.links),
      suggestedActions: sanitizeSuggestedActions(payload.suggestedActions),
    }
  }

  if (typeof payload.raw === 'string') {
    return parseAvaModelText(payload.raw, source)
  }

  return null
}

function sanitizeLinks(raw: unknown): AvaLink[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const links: AvaLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const l = item as Record<string, unknown>
    const label = typeof l.label === 'string' ? l.label.trim() : ''
    const path = typeof l.path === 'string' ? l.path.trim() : ''
    if (label && path.startsWith('/')) links.push({ label, path })
  }
  return links.length ? links : undefined
}

function sanitizeSuggestedActions(raw: unknown): AvaSuggestedAction[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: AvaSuggestedAction[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    const type = typeof a.type === 'string' ? a.type : 'navigate'
    const label = typeof a.label === 'string' ? a.label.trim() : ''
    const path = typeof a.path === 'string' ? a.path.trim() : ''
    if (type !== 'navigate') continue
    if (label && path.startsWith('/')) out.push({ type: 'navigate', label, path })
  }
  return out.length ? out : undefined
}

/** Clean chat history so prior JSON dumps never confuse the model. */
export function sanitizeAvaMessages(messages: AvaChatMessage[]): AvaChatMessage[] {
  return messages.map((m) =>
    m.role === 'assistant' ? { ...m, content: normalizeAvaDisplayText(m.content) } : m,
  )
}

export async function askAva(input: {
  messages: AvaChatMessage[]
  context: AvaUserContext
}): Promise<AvaResponse> {
  const messages = sanitizeAvaMessages(input.messages)
  const canCallEdge = isSupabaseAuthEnabled() && Boolean(supabase)

  if (canCallEdge && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('ava-chat', {
        body: {
          messages: messages.slice(-12),
          context: input.context,
        },
      })
      if (!error && data && typeof data === 'object') {
        const payload = data as Record<string, unknown>
        const coerced = coerceResponse(payload)
        if (coerced?.reply) return coerced

        if (typeof payload.error === 'string' && payload.fallback) {
          // Edge asked us to fall back
        } else if (typeof payload.error === 'string') {
          const local = localAvaRespond(messages, input.context)
          local.reply = `${local.reply}\n\n_(AVA cloud assistant unavailable: ${payload.error}. Showing local guidance.)_`
          return local
        }
      }
    } catch {
      /* local fallback */
    }
  }

  return localAvaRespond(messages, input.context)
}
