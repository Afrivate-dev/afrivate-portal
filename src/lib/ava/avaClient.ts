import { supabase } from '@/lib/supabase'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { localAvaRespond } from '@/lib/ava/localFallback'
import { parseAvaModelText } from '@/lib/ava/parseResponse'
import type { AvaChatMessage, AvaResponse, AvaUserContext } from '@/lib/ava/types'

/** AVA is on by default; set VITE_AVA_ENABLED=false to hide. */
export function isAvaEnabled(): boolean {
  const flag = import.meta.env.VITE_AVA_ENABLED
  if (flag === 'false' || flag === '0') return false
  return true
}

export async function askAva(input: {
  messages: AvaChatMessage[]
  context: AvaUserContext
}): Promise<AvaResponse> {
  const canCallEdge = isSupabaseAuthEnabled() && Boolean(supabase)

  if (canCallEdge && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('ava-chat', {
        body: {
          messages: input.messages.slice(-12),
          context: input.context,
        },
      })
      if (!error && data && typeof data === 'object') {
        const payload = data as Record<string, unknown>
        if (typeof payload.reply === 'string') {
          return {
            source: (payload.source === 'local' ? 'local' : 'gemini') as AvaResponse['source'],
            reply: payload.reply,
            citations: Array.isArray(payload.citations)
              ? payload.citations.filter((c): c is string => typeof c === 'string')
              : undefined,
            links: Array.isArray(payload.links) ? (payload.links as AvaResponse['links']) : undefined,
            suggestedActions: Array.isArray(payload.suggestedActions)
              ? (payload.suggestedActions as AvaResponse['suggestedActions'])
              : undefined,
          }
        }
        if (typeof payload.raw === 'string') {
          return parseAvaModelText(payload.raw, 'gemini')
        }
        if (typeof payload.error === 'string' && payload.fallback) {
          // Edge asked us to fall back
        } else if (typeof payload.error === 'string') {
          const local = localAvaRespond(input.messages, input.context)
          local.reply = `${local.reply}\n\n_(AVA cloud assistant unavailable: ${payload.error}. Showing local guidance.)_`
          return local
        }
      }
    } catch {
      /* local fallback */
    }
  }

  return localAvaRespond(input.messages, input.context)
}
