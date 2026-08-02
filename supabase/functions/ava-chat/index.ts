/**
 * AVA chat — Google Gemini via Interactions API (recommended GA path).
 *
 * Secrets (Supabase Edge Function):
 * - GEMINI_API_KEY (required)
 * - GEMINI_MODEL (optional, default gemini-3.6-flash)
 * - SITE_URL (CORS)
 *
 * Note: gemini-2.0-flash is shut down — do not use it.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('SITE_URL') ?? 'https://portal.afrivate.org'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Latest stable Flash — speed + agentic quality. Override with GEMINI_MODEL (e.g. gemini-3.5-flash-lite). */
const DEFAULT_MODEL = 'gemini-3.6-flash'

const KNOWLEDGE = `Portal = system of record. Slack = official messaging (acknowledge within 4 hours on work days). WhatsApp = informal/emergency only. Leave via Portal People → Time off. Learning via People → Learning. Weekly update via /checkin. Admin (HR) for approvals, leave queue, Employees hub, Recruitment.`

const AVA_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Professional answer with numbered steps when explaining procedures.' },
    citations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Document names cited (e.g. Leave and Absence Policy).',
    },
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          path: { type: 'string' },
        },
        required: ['label', 'path'],
      },
    },
    suggestedActions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          label: { type: 'string' },
          path: { type: 'string' },
          payload: { type: 'object' },
        },
        required: ['type', 'label'],
      },
    },
  },
  required: ['reply'],
}

function systemPrompt(role: string) {
  return `You are AVA (AfriVate Virtual Assistant) for AfriVate Team Space.
Tone: professional, concise, formal English. Use numbered steps for procedures.
Rules: Portal is system of record; Slack is messaging; WhatsApp is informal only.
Never approve leave, finalise appraisals, or change roles. Use only provided user context.
Cite docs by name when relevant. Suggest Portal paths.
Only propose draft_leave or draft_checkin suggestedActions when the user clearly wants to create one.
User role: ${role}
Knowledge: ${KNOWLEDGE}`
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type ChatMsg = { role?: string; content?: string }

/** Build Interactions API input turns (stateless: full history each call). */
function buildInteractionInput(messages: ChatMsg[], contextJson: string) {
  const turns: Array<Record<string, unknown>> = [
    {
      type: 'user_input',
      content: `User context (role-scoped JSON):\n${contextJson}\n\nUse this context for personalised guidance. Do not invent data absent from it.`,
    },
  ]

  for (const m of messages) {
    if (!m?.content) continue
    if (m.role === 'assistant') {
      turns.push({ type: 'model_output', content: [{ type: 'text', text: m.content }] })
    } else if (m.role === 'user') {
      turns.push({ type: 'user_input', content: m.content })
    }
  }

  return turns
}

function extractOutputText(interaction: Record<string, unknown>): string {
  if (typeof interaction.output_text === 'string' && interaction.output_text.trim()) {
    return interaction.output_text
  }
  const steps = Array.isArray(interaction.steps) ? interaction.steps : []
  const texts: string[] = []
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue
    const s = step as Record<string, unknown>
    if (s.type !== 'model_output') continue
    const content = Array.isArray(s.content) ? s.content : []
    for (const part of content) {
      if (part && typeof part === 'object') {
        const p = part as Record<string, unknown>
        if (p.type === 'text' && typeof p.text === 'string') texts.push(p.text)
      }
    }
  }
  return texts.join('\n').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
    if (!geminiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY not configured', fallback: true }, 503)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
      error: callerErr,
    } = await callerClient.auth.getUser()
    if (callerErr || !caller) return jsonResponse({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const messages = (Array.isArray(body?.messages) ? body.messages : []) as ChatMsg[]
    const context = body?.context && typeof body.context === 'object' ? body.context : {}

    const { data: profile } = await callerClient
      .from('profiles')
      .select('id, name, role, department, job_title')
      .eq('id', caller.id)
      .maybeSingle()

    const safeContext: Record<string, unknown> = {
      ...context,
      userId: caller.id,
      name: profile?.name || context.name || caller.email || 'Team member',
      role: profile?.role || context.role || 'staff',
      department: profile?.department || context.department,
      jobTitle: profile?.job_title || context.jobTitle,
    }

    if (!['hr', 'admin'].includes(String(safeContext.role))) {
      delete safeContext.hr
    }

    const filtered = messages
      .filter((m) => m?.content && (m.role === 'user' || m.role === 'assistant'))
      .slice(-12)

    if (!filtered.length) return jsonResponse({ error: 'No messages' }, 400)

    const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL
    const interactionBody = {
      model,
      // Do not store AVA chats on Google free-tier retention (portal privacy).
      store: false,
      system_instruction: systemPrompt(String(safeContext.role)),
      input: buildInteractionInput(filtered, JSON.stringify(safeContext)),
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: AVA_RESPONSE_SCHEMA,
      },
      generation_config: {
        max_output_tokens: 1024,
        temperature: 0.4,
      },
    }

    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey,
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify(interactionBody),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini Interactions error', geminiRes.status, errText)
      if (geminiRes.status === 429) {
        return jsonResponse(
          { error: 'AVA is busy (rate limit). Please try again shortly.', fallback: true },
          429,
        )
      }
      return jsonResponse({ error: 'Gemini request failed', fallback: true, detail: errText.slice(0, 400) }, 502)
    }

    const interaction = (await geminiRes.json()) as Record<string, unknown>
    const raw = extractOutputText(interaction)

    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      return jsonResponse({ raw, source: 'gemini', model })
    }

    return jsonResponse({
      source: 'gemini',
      model,
      reply: typeof parsed.reply === 'string' ? parsed.reply : raw,
      citations: parsed.citations,
      links: parsed.links,
      suggestedActions: parsed.suggestedActions,
    })
  } catch (e) {
    console.error(e)
    return jsonResponse({ error: 'Unexpected AVA error', fallback: true }, 500)
  }
})
