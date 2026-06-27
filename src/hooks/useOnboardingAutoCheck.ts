import { useEffect, useRef } from 'react'
import type { OnboardingChecklistItem, User, WeeklyCheckIn } from '@/types'

type AutoKey = 'profile_complete' | 'handbook_visit' | 'first_checkin' | 'directory_complete'

const LABEL_AUTO: Record<string, AutoKey> = {
  'complete your profile': 'profile_complete',
  'read the staff handbook': 'handbook_visit',
  'submit your first weekly check-in': 'first_checkin',
  'schedule a 1-on-1 with your team lead': 'directory_complete',
}

function autoKeyForItem(item: OnboardingChecklistItem): AutoKey | null {
  if (item.autoKey) return item.autoKey as AutoKey
  const key = item.label.trim().toLowerCase()
  return LABEL_AUTO[key] ?? null
}

function profileComplete(user: User): boolean {
  return Boolean(user.bio?.trim() || user.phone?.trim() || user.avatarUrl)
}

/** Marks onboarding checklist items done when related portal actions are detected. */
export function useOnboardingAutoCheck(opts: {
  user: User | null
  checklist: OnboardingChecklistItem[]
  progressIds: Set<string>
  checkIns: WeeklyCheckIn[]
  visitedHandbook: boolean
  toggleChecklistItem: (userId: string, itemId: string) => void
}) {
  const { user, checklist, progressIds, checkIns, visitedHandbook, toggleChecklistItem } = opts
  const ranRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    for (const item of checklist) {
      if (progressIds.has(item.id) || ranRef.current.has(item.id)) continue
      const key = autoKeyForItem(item)
      if (!key) continue

      let done = false
      if (key === 'profile_complete') done = profileComplete(user)
      if (key === 'first_checkin') done = checkIns.some((c) => c.userId === user.id)
      if (key === 'handbook_visit') done = visitedHandbook
      if (key === 'directory_complete') done = profileComplete(user)

      if (done) {
        ranRef.current.add(item.id)
        toggleChecklistItem(user.id, item.id)
      }
    }
  }, [user, checklist, progressIds, checkIns, visitedHandbook, toggleChecklistItem])
}
