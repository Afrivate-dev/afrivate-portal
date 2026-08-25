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
    reply: {
      type: 'string',
      description:
        'Professional answer. Use markdown **bold**, numbered/bulleted lists for steps. The Portal UI renders this.',
    },
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
      description:
        'navigate and insert_draft only. Never submit, complete, approve, reject, delete, publish, or send.',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'navigate or insert_draft',
          },
          label: { type: 'string' },
          path: { type: 'string', description: 'Portal path starting with /' },
          kind: {
            type: 'string',
            description: 'weekly_update | task | leave | shoutout | memo | event | my_info | note',
          },
          mode: { type: 'string', description: 'insert or refine' },
          fields: {
            type: 'object',
            description: 'Form field keys and string values. Never include submit flags.',
            properties: {
              completed: { type: 'string' },
              nextWeek: { type: 'string' },
              blockers: { type: 'string' },
              hoursWorked: { type: 'string' },
              visibility: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string' },
              priority: { type: 'string' },
              category: { type: 'string' },
              dueDate: { type: 'string' },
              estimatedHours: { type: 'string' },
              type: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              reason: { type: 'string' },
              message: { type: 'string' },
              tag: { type: 'string' },
              body: { type: 'string' },
              audience: { type: 'string' },
              memoCategory: { type: 'string' },
              date: { type: 'string' },
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              location: { type: 'string' },
              preferredName: { type: 'string' },
              phone: { type: 'string' },
              bio: { type: 'string' },
              skills: { type: 'string' },
              emergencyContactName: { type: 'string' },
              emergencyContactPhone: { type: 'string' },
              emergencyContactRelationship: { type: 'string' },
              nextOfKinNotes: { type: 'string' },
            },
          },
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
You MAY insert or refine draft form text (weekly update, task, leave, shout-out, memo, event, my info, notes).
You may return several insert_draft actions in one response (multiple tasks, notes, memos).
You must NEVER submit, send, publish, approve, reject, delete, finalise, complete, or activate any Portal record. The user always reviews and submits.
Never insert drafts for learning certificates, surveys, leave approvals, PIPs, discipline, or appraisals.
Task drafts save to Drafts on My work. Note drafts save on Notes. Do not assume a form opens.
Cite docs by name when relevant.
For links use short labels and Portal paths only, e.g. {"label":"Time off","path":"/people/leave"}.
suggestedActions may be navigate or insert_draft only.
insert_draft example: {"type":"insert_draft","label":"Review weekly update draft","path":"/checkin","kind":"weekly_update","mode":"insert","fields":{"completed":"...","nextWeek":"...","hoursWorked":"40"}}
If pageDraft is in context and the user asks to refine/revamp, use mode "refine" and return improved fields.
Keep reply under 220 words so the JSON response is complete.
User role: ${role}
Knowledge: ${KNOWLEDGE}`
}

const DRAFT_KINDS = new Set([
  'weekly_update',
  'task',
  'leave',
  'shoutout',
  'memo',
  'event',
  'my_info',
  'note',
])
const FORBIDDEN_ACTION_TYPES = new Set([
  'submit',
  'complete',
  'approve',
  'reject',
  'delete',
  'finalize',
  'publish',
  'send',
  'activate',
  'create',
  'update',
  'write',
  'draft_leave',
  'draft_checkin',
  'draft_task',
])

function sanitizeSuggestedActions(raw: unknown): unknown[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: unknown[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    const type = typeof a.type === 'string' ? a.type.trim().toLowerCase() : 'navigate'
    const label = typeof a.label === 'string' ? a.label.trim() : ''
    const path = typeof a.path === 'string' ? a.path.trim() : ''
    if (!label) continue
    if (FORBIDDEN_ACTION_TYPES.has(type)) continue
    if (type === 'insert_draft' || type === 'insert' || type === 'refine') {
      const kind = typeof a.kind === 'string' ? a.kind : ''
      if (!DRAFT_KINDS.has(kind)) continue
      const fields: Record<string, string> = {}
      if (a.fields && typeof a.fields === 'object') {
        for (const [k, v] of Object.entries(a.fields as Record<string, unknown>)) {
          if (typeof v === 'string' && v.trim()) fields[k] = v.trim()
        }
      }
      if (!Object.keys(fields).length) continue
      if (kind === 'task' && /^(done|complete|completed)$/i.test(fields.status ?? '')) {
        fields.status = 'todo'
      }
      out.push({
        type: 'insert_draft',
        label,
        path: path.startsWith('/') ? path : undefined,
        kind,
        mode: type === 'refine' || a.mode === 'refine' ? 'refine' : 'insert',
        fields,
      })
      continue
    }
    if (type !== 'navigate' && type !== '') continue
    if (label && path.startsWith('/')) out.push({ type: 'navigate', label, path })
  }
  return out.length ? out : undefined
}

function extractJsonStringField(text: string, key: string): string | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 's')
  const m = text.match(re)
  if (!m?.[1]) return undefined
  return m[1]
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim()
}

function parseModelPayload(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  try {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const obj = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
      if (typeof obj.reply === 'string') return obj
    }
  } catch {
    /* loose */
  }
  const reply = extractJsonStringField(trimmed, 'reply')
  if (reply) {
    const citationsMatch = trimmed.match(/"citations"\s*:\s*\[([\s\S]*?)\]/)
    const citations = citationsMatch
      ? [...citationsMatch[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((x) =>
          x[1].replace(/\\"/g, '"'),
        )
      : undefined
    const links: Array<{ label: string; path: string }> = []
    const linkBlock = trimmed.match(/"links"\s*:\s*\[([\s\S]*?)(?:\]|$)/)
    if (linkBlock?.[1]) {
      for (const chunk of linkBlock[1].matchAll(/\{[\s\S]*?\}/g)) {
        const label = extractJsonStringField(chunk[0], 'label')
        const path = extractJsonStringField(chunk[0], 'path')
        if (label && path?.startsWith('/')) links.push({ label, path })
      }
      if (!links.length) {
        const label =
          extractJsonStringField(linkBlock[1], 'label') ||
          linkBlock[1].match(/"label"\s*:\s*"([^"]+)/)?.[1]
        const lower = (label || '').toLowerCase()
        let path = ''
        if (lower.includes('time off') || lower.includes('leave')) path = '/people/leave'
        else if (lower.includes('learning')) path = '/people/learning'
        else if (lower.includes('check')) path = '/checkin'
        if (label && path) links.push({ label: label.replace(/->/g, '→').trim(), path })
      }
    }
    return { reply, citations, links: links.length ? links : undefined }
  }
  return { reply: trimmed }
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
        max_output_tokens: 4096,
        temperature: 0.35,
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
    if (!raw) {
      return jsonResponse({ error: 'Empty AVA response', fallback: true }, 502)
    }

    const parsed = parseModelPayload(raw)
    const reply = typeof parsed.reply === 'string' ? parsed.reply : ''
    if (!reply || (reply.trim().startsWith('{') && /"reply"\s*:/.test(reply))) {
      // Still looks like an envelope — last resort plain guidance
      return jsonResponse({
        source: 'gemini',
        model,
        reply:
          'I could not finish formatting that answer. Please ask again in a shorter question, or open Resources for the Portal User Guide.',
        citations: parsed.citations,
        links: parsed.links,
      })
    }

    return jsonResponse({
      source: 'gemini',
      model,
      reply,
      citations: parsed.citations,
      links: parsed.links,
      suggestedActions: sanitizeSuggestedActions(parsed.suggestedActions),
    })
  } catch (e) {
    console.error(e)
    return jsonResponse({ error: 'Unexpected AVA error', fallback: true }, 500)
  }
})
