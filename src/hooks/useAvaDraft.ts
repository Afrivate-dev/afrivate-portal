import { useEffect, useRef } from 'react'
import {
  clearAvaPageDraft,
  consumeAvaDraft,
  setAvaPageDraft,
  AVA_DRAFT_EVENT,
  type AvaFormDraft,
} from '@/lib/ava/avaDrafts'
import type { AvaDraftKind } from '@/lib/ava/types'

/** Apply a pending AVA insert/refine when this page mounts or a draft event fires. */
export function useAvaFormDraft(kind: AvaDraftKind, onApply: (draft: AvaFormDraft) => void): void {
  const onApplyRef = useRef(onApply)
  onApplyRef.current = onApply

  useEffect(() => {
    const pending = consumeAvaDraft(kind)
    if (pending) onApplyRef.current(pending)

    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<AvaFormDraft>).detail
      if (!detail || detail.kind !== kind) return
      consumeAvaDraft(kind)
      onApplyRef.current(detail)
    }
    window.addEventListener(AVA_DRAFT_EVENT, onEvent)
    return () => window.removeEventListener(AVA_DRAFT_EVENT, onEvent)
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
