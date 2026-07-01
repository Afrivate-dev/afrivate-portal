import type { SupabaseClient } from '@supabase/supabase-js'
import type { Dispatch, SetStateAction } from 'react'
import type { TaskCategoryItem } from '@/types'
import { deleteConfigLabel, insertConfigLabel, updateConfigLabel } from '@/lib/portalConfig'
import { checkConfigLabelInUse } from '@/lib/feedbackConfig'
import { notifyError } from '@/lib/notify'

type ReportFn = (action: string, error: { message: string }) => void

export function createConfigCategoryHandlers(
  client: SupabaseClient,
  table: string,
  idPrefix: string,
  configKind: string,
  setItems: Dispatch<SetStateAction<TaskCategoryItem[]>>,
  reportError: ReportFn,
) {
  return {
    add: (label: string) => {
      void (async () => {
        try {
          const sortOrder = await client.from(table).select('id', { count: 'exact', head: true }).then((r) => (r.count ?? 0) + 1)
          const row = await insertConfigLabel(client, table, label, sortOrder, idPrefix)
          setItems((prev) => [...prev, row])
        } catch (e) {
          reportError(`add ${table}`, e instanceof Error ? e : { message: String(e) })
        }
      })()
    },
    update: (id: string, label: string) => {
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
      void updateConfigLabel(client, table, id, label).catch((e) => {
        reportError(`update ${table}`, e instanceof Error ? e : { message: String(e) })
      })
    },
    delete: (id: string) => {
      void (async () => {
        try {
          const inUse = await checkConfigLabelInUse(client, configKind, id)
          if (inUse > 0) {
            notifyError(`Cannot delete — ${inUse} record${inUse === 1 ? '' : 's'} still use this label.`)
            return
          }
          setItems((prev) => prev.filter((c) => c.id !== id))
          await deleteConfigLabel(client, table, id)
        } catch (e) {
          reportError(`delete ${table}`, e instanceof Error ? e : { message: String(e) })
        }
      })()
    },
  }
}
