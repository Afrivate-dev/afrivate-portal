import { useEffect, useRef } from 'react'
import {
  clearAvaPageDraft,
  consumeAvaDraft,
  peekAvaDraft,
  setAvaPageDraft,
  AVA_DRAFT_EVENT,
  type AvaFormDraft,
} from '@/lib/ava/avaDrafts'
import type { AvaDraftKind } from '@/lib/ava/types'

const CONSUME_MS = 500

/** Apply a pending AVA insert/refine when this page mounts or a draft event fires. */
export function useAvaFormDraft(
  kind: AvaDraftKind,
  onApply: (draft: AvaFormDraft) => boolean | void,
): void {
  const onApplyRef = useRef(onApply)
  onApplyRef.current = onApply

  useEffect(() => {
    let consumeTimer: number | null = null
    const scheduleConsume = () => {
      if (consumeTimer) window.clearTimeout(consumeTimer)
      consumeTimer = window.setTimeout(() => {
        consumeAvaDraft(kind)
        consumeTimer = null
      }, CONSUME_MS)
    }

    const apply = (draft: AvaFormDraft) => {
      const ok = onApplyRef.current(draft)
      if (ok === false) return
      scheduleConsume()
    }

    const pending = peekAvaDraft(kind)
    if (pending) apply(pending)

    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<AvaFormDraft>).detail
      if (!detail || detail.kind !== kind) return
      apply(detail)
    }
    window.addEventListener(AVA_DRAFT_EVENT, onEvent)
    return () => {
      if (consumeTimer) window.clearTimeout(consumeTimer)
      window.removeEventListener(AVA_DRAFT_EVENT, onEvent)
    }
  }, [kind])
}

/** Expose the open form so AVA can refine the user's current text. */
export function useAvaPageDraft(
  kind: AvaDraftKind,
  fields: Record<string, string>,
  enabled = true,
): void {
  const serialized = JSON.stringify(fields)
  useEffect(() => {
    if (!enabled) {
      clearAvaPageDraft(kind)
      return
    }
    setAvaPageDraft(kind, JSON.parse(serialized) as Record<string, string>)
    return () => clearAvaPageDraft(kind)
  }, [kind, enabled, serialized])
}
