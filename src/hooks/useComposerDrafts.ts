import { useCallback, useEffect, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  COMPOSER_DRAFTS_KEY,
  EMPTY_COMPOSER_DRAFTS,
  draftsOfKind,
  findDraftById,
  findDraftBySourceId,
  mergeComposerStores,
  newComposerDraftId,
  readComposerDraftsStore,
  removeComposerDraft,
  upsertComposerDraft,
  withRevivalMemosSeeded,
  type ComposerDraft,
  type ComposerDraftKind,
  type ComposerDraftPayload,
  type ComposerDraftsStore,
} from '@/lib/composerDrafts'

export function useComposerDrafts() {
  const [store, setStore] = useLocalStorage<ComposerDraftsStore>(
    COMPOSER_DRAFTS_KEY,
    EMPTY_COMPOSER_DRAFTS,
  )

  const mutate = useCallback(
    (updater: (base: ComposerDraftsStore) => ComposerDraftsStore) => {
      setStore((prev) => {
        const disk = readComposerDraftsStore()
        const base = mergeComposerStores(disk, prev)
        return updater(base)
      })
    },
    [setStore],
  )

  useEffect(() => {
    mutate((prev) => withRevivalMemosSeeded(prev))
  }, [mutate])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== COMPOSER_DRAFTS_KEY || e.newValue == null) return
      try {
        const remote = JSON.parse(e.newValue) as ComposerDraftsStore
        setStore((prev) => mergeComposerStores(remote, prev))
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [setStore])

  const saveDraft = useCallback(
    (input: {
      id?: string
      kind: ComposerDraftKind
      label: string
      payload: ComposerDraftPayload
      sourceId?: string
    }): ComposerDraft => {
      let saved!: ComposerDraft
      mutate((base) => {
        const existing = input.id ? findDraftById(base, input.id) : undefined
        saved = {
          id: input.id ?? existing?.id ?? newComposerDraftId(input.kind),
          kind: input.kind,
          label: input.label,
          updatedAt: new Date().toISOString(),
          sourceId: input.sourceId ?? existing?.sourceId,
          payload: input.payload,
        }
        return upsertComposerDraft(base, saved)
      })
      return saved
    },
    [mutate],
  )

  const deleteDraft = useCallback(
    (id: string) => {
      mutate((prev) => removeComposerDraft(prev, id))
    },
    [mutate],
  )

  const getById = useCallback((id: string) => findDraftById(store, id), [store])
  const getBySourceId = useCallback(
    (sourceId: string) => findDraftBySourceId(store, sourceId),
    [store],
  )

  const byKind = useMemo(
    () => ({
      memo: draftsOfKind(store, 'memo'),
      shoutout: draftsOfKind(store, 'shoutout'),
      event: draftsOfKind(store, 'event'),
      message: draftsOfKind(store, 'message'),
    }),
    [store],
  )

  return {
    store,
    drafts: store.drafts,
    byKind,
    saveDraft,
    deleteDraft,
    getById,
    getBySourceId,
  }
}
