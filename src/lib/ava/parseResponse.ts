import type { AvaLink, AvaResponse, AvaSuggestedAction } from '@/lib/ava/types'

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function parseActions(raw: unknown): AvaSuggestedAction[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: AvaSuggestedAction[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    if (a.type === 'navigate' && asString(a.label) && asString(a.path)) {
      out.push({ type: 'navigate', label: asString(a.label)!, path: asString(a.path)! })
      continue
    }
    if (a.type === 'draft_leave' && a.payload && typeof a.payload === 'object') {
      const p = a.payload as Record<string, unknown>
      const leaveType = p.leaveType
      if (
        (leaveType === 'annual' || leaveType === 'sick' || leaveType === 'emergency') &&
        asString(p.startDate) &&
        asString(p.endDate) &&
        asString(p.reason)
      ) {
        out.push({
          type: 'draft_leave',
          label: asString(a.label) || 'Review leave draft',
          payload: {
            leaveType,
            startDate: asString(p.startDate)!,
            endDate: asString(p.endDate)!,
            reason: asString(p.reason)!,
          },
        })
      }
      continue
    }
    if (a.type === 'draft_checkin' && a.payload && typeof a.payload === 'object') {
      const p = a.payload as Record<string, unknown>
      if (asString(p.completed) && asString(p.nextWeek)) {
        out.push({
          type: 'draft_checkin',
          label: asString(a.label) || 'Review check-in draft',
          payload: {
            completed: asString(p.completed)!,
            nextWeek: asString(p.nextWeek)!,
            blockers: asString(p.blockers),
            hoursWorked: typeof p.hoursWorked === 'number' ? p.hoursWorked : 0,
          },
        })
      }
    }
  }
  return out.length ? out : undefined
}

function parseLinks(raw: unknown): AvaLink[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const links: AvaLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const l = item as Record<string, unknown>
    if (asString(l.label) && asString(l.path)) {
      links.push({ label: asString(l.label)!, path: asString(l.path)! })
    }
  }
  return links.length ? links : undefined
}

/** Parse Gemini JSON (or fenced JSON) into AvaResponse fields. */
export function parseAvaModelText(text: string, source: AvaResponse['source']): AvaResponse {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || trimmed
  try {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const obj = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>
      const reply = asString(obj.reply) || trimmed
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
  } catch {
    /* fall through */
  }
  return { source, reply: trimmed }
}
