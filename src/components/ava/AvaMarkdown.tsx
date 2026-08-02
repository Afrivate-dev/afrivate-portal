import type { ReactNode } from 'react'
import { cn } from '@/utils/helpers'

/** Lightweight markdown for AVA replies — bold, italic, code, lists, links. */
export function AvaMarkdown({
  text,
  className,
  tone = 'assistant',
}: {
  text: string
  className?: string
  tone?: 'assistant' | 'user'
}) {
  const blocks = splitBlocks(text.trim())
  return (
    <div
      className={cn(
        'space-y-2 text-sm leading-relaxed',
        tone === 'user' && '[&_strong]:font-semibold [&_a]:underline',
        className,
      )}
    >
      {blocks.map((block, i) => (
        <Block key={i} block={block} tone={tone} />
      ))}
    </div>
  )
}

type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

function splitBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/)
  const out: Block[] = []
  let para: string[] = []
  let ul: string[] | null = null
  let ol: string[] | null = null

  const flushPara = () => {
    if (!para.length) return
    out.push({ type: 'p', text: para.join('\n') })
    para = []
  }
  const flushList = () => {
    if (ul?.length) out.push({ type: 'ul', items: ul })
    if (ol?.length) out.push({ type: 'ol', items: ol })
    ul = null
    ol = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*]\s+(.+)$/)
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/)

    if (!line.trim()) {
      flushPara()
      flushList()
      continue
    }
    if (bullet) {
      flushPara()
      if (ol) {
        flushList()
      }
      ul = ul ?? []
      ul.push(bullet[1])
      continue
    }
    if (numbered) {
      flushPara()
      if (ul) {
        flushList()
      }
      ol = ol ?? []
      ol.push(numbered[1])
      continue
    }
    flushList()
    para.push(line.trim())
  }
  flushPara()
  flushList()
  return out.length ? out : [{ type: 'p', text }]
}

function Block({ block, tone }: { block: Block; tone: 'assistant' | 'user' }) {
  if (block.type === 'ul') {
    return (
      <ul className="list-disc space-y-1 pl-4">
        {block.items.map((item, i) => (
          <li key={i}>{renderInline(item, tone)}</li>
        ))}
      </ul>
    )
  }
  if (block.type === 'ol') {
    return (
      <ol className="list-decimal space-y-1 pl-4">
        {block.items.map((item, i) => (
          <li key={i}>{renderInline(item, tone)}</li>
        ))}
      </ol>
    )
  }
  return <p className="whitespace-pre-wrap">{renderInline(block.text, tone)}</p>
}

function renderInline(text: string, tone: 'assistant' | 'user'): ReactNode[] {
  // Order: code, bold, italic, markdown links, bare /paths
  const pattern =
    /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(pattern)
  return parts.filter(Boolean).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className={cn(
            'rounded px-1 py-0.5 text-[12px]',
            tone === 'user' ? 'bg-white/15' : 'bg-brand/10 text-brand',
          )}
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (
      (part.startsWith('**') && part.endsWith('**')) ||
      (part.startsWith('__') && part.endsWith('__'))
    ) {
      return (
        <strong key={i} className="font-semibold">
          {renderInline(part.slice(2, -2), tone)}
        </strong>
      )
    }
    if (
      (part.startsWith('*') && part.endsWith('*')) ||
      (part.startsWith('_') && part.endsWith('_'))
    ) {
      return <em key={i}>{renderInline(part.slice(1, -1), tone)}</em>
    }
    const mdLink = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (mdLink) {
      const href = mdLink[2]
      const safe =
        href.startsWith('/') || href.startsWith('https://') || href.startsWith('http://')
      if (!safe) return <span key={i}>{mdLink[1]}</span>
      return (
        <a
          key={i}
          href={href}
          className={cn(
            'font-medium underline underline-offset-2',
            tone === 'user' ? 'text-white' : 'text-brand',
          )}
          {...(href.startsWith('http')
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
        >
          {mdLink[1]}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}
