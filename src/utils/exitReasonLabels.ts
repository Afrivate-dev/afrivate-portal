import type { TaskCategoryItem } from '@/types'
import { labelForConfigId } from '@/lib/portalConfig'

/** Resolve exit reason IDs (or legacy label strings) to display text. */
export function formatExitReasons(reasons: string[], exitReasons: TaskCategoryItem[]): string {
  if (!reasons.length) return ''
  return reasons.map((r) => labelForConfigId(r, exitReasons)).join(' · ')
}
