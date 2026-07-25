import { useMemo } from 'react'

export type AtsRichBlock = {
  headline?: string
  paragraphs?: string[]
  bullets?: string[]
  sections?: Array<{ title: string; bullets: string[] }>
}

/** Renders ATS summaries / ranking notes with clear paragraphs and bullet lists. */
export function AtsRichText({ block, className }: { block: AtsRichBlock; className?: string }) {
  const hasContent =
    Boolean(block.headline) ||
    Boolean(block.paragraphs?.length) ||
    Boolean(block.bullets?.length) ||
    Boolean(block.sections?.some((s) => s.bullets.length))

  if (!hasContent) return null

  return (
    <div className={className ?? 'space-y-2 text-sm leading-relaxed text-fg'}>
      {block.headline ? <p className="font-medium text-fg">{block.headline}</p> : null}
      {block.paragraphs?.map((p) => (
        <p key={p} className="text-fg/90">
          {p}
        </p>
      ))}
      {block.bullets && block.bullets.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-fg/90">
          {block.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      {block.sections?.map((section) =>
        section.bullets.length ? (
          <div key={section.title} className="space-y-1">
            <p className="text-xs font-medium text-muted">{section.title}</p>
            <ul className="list-disc space-y-1 pl-5 text-fg/90">
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  )
}

/** Best-effort parse of older flat summary strings into rich blocks. */
export function parseLegacySummaryToRich(summary?: string): AtsRichBlock | null {
  if (!summary?.trim()) return null
  const text = summary.trim()

  const looksGood = text.match(/Looks good on:\s*([^.]+)\./i)?.[1]
  const stillNeeds = text.match(/Still needs:\s*([^.]+)\./i)?.[1]
  const noGaps = /No major required items missing/i.test(text)

  const strengths = looksGood
    ? looksGood
        .split(',')
        .map((s) => s.replace(/\band\s+\d+\s+more\b/i, '').trim())
        .filter(Boolean)
    : []
  const gaps = stillNeeds
    ? stillNeeds
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const headline = text.split('.')[0]?.trim()
  const fit =
    text.match(
      /(Strong fit for this role|Worth reviewing for this role|Weaker fit[^.]*|Not a good match[^.]*)\./i,
    )?.[1] ?? undefined

  if (!strengths.length && !gaps.length && !fit) {
    return { paragraphs: [text] }
  }

  return {
    headline: headline && headline.length < 120 ? `${headline}.` : undefined,
    paragraphs: fit ? [`${fit}.`] : undefined,
    sections: [
      strengths.length ? { title: 'Looks good on', bullets: strengths } : null,
      gaps.length
        ? { title: 'Still needs', bullets: gaps }
        : noGaps
          ? { title: 'Gaps', bullets: ['No major required items missing.'] }
          : null,
    ].filter(Boolean) as AtsRichBlock['sections'],
  }
}

export function useLegacySummaryRich(summary?: string): AtsRichBlock | null {
  return useMemo(() => parseLegacySummaryToRich(summary), [summary])
}
