import { useEffect, useRef } from 'react'
import type { OnboardingChecklistItem, User, WeeklyCheckIn } from '@/types'

type AutoKey = NonNullable<OnboardingChecklistItem['autoKey']>

function autoKeyFromLink(link?: string): AutoKey | null {
  const raw = link?.trim()
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw, 'http://local')
  } catch {
    return null
  }
  const path = url.pathname.replace(/\/$/, '') || '/'
  if (path === '/people/directory' && url.searchParams.get('profile') === '1') return 'profile_complete'
  if (path === '/people/directory' && url.search === '') return 'directory_complete'
  if (path === '/checkin') return 'first_checkin'
  if (path === '/people/my-info') return 'myinfo_complete'
  // /documents is shared by the onboarding pack and policy items.
  // Only the pack row (auto_key handbook_visit) may tick from a visit.
  return null
}

function autoKeyForItem(item: OnboardingChecklistItem): AutoKey | null {
  if (item.autoKey) return item.autoKey
  return autoKeyFromLink(item.link)
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
  /** My info completeness (0–100) when the employee profile is already loaded. */
  myInfoCompleteness?: number
  toggleChecklistItem: (userId: string, itemId: string) => void
}) {
  const {
    user,
    checklist,
    progressIds,
    checkIns,
    visitedHandbook,
    myInfoCompleteness,
    toggleChecklistItem,
  } = opts
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
      if (key === 'directory_complete') done = Boolean(user.reportsToId)
      if (key === 'myinfo_complete') done = myInfoCompleteness === 100

      if (done) {
        ranRef.current.add(item.id)
        toggleChecklistItem(user.id, item.id)
      }
    }
  }, [
    user,
    checklist,
    progressIds,
    checkIns,
    visitedHandbook,
    myInfoCompleteness,
    toggleChecklistItem,
  ])
}
