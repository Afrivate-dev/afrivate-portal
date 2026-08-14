import type { DutyStatus, User } from '@/types'
import { isLead } from '@/utils/helpers'

export const DUTY_STATUS_LABELS: Record<DutyStatus, string> = {
  none: 'Normal duty',
  pip: 'On PIP',
  suspended: 'Suspended',
}

export const DUTY_STATUS_OPTIONS: { value: DutyStatus; label: string }[] = [
  { value: 'none', label: 'Normal duty' },
  { value: 'pip', label: 'On PIP' },
  { value: 'suspended', label: 'Suspended' },
]

export function parseDutyStatus(raw: unknown): DutyStatus {
  if (raw === 'pip' || raw === 'suspended' || raw === 'none') return raw
  return 'none'
}

export function dutyStatusOf(user: User | null | undefined): DutyStatus {
  return user?.dutyStatus ?? 'none'
}

export function isSuspended(user: User | null | undefined): boolean {
  return dutyStatusOf(user) === 'suspended'
}

export function effectiveDutyStatus(
  user: User | null | undefined,
  hasActivePip = false,
): DutyStatus {
  if (!user) return 'none'
  if (dutyStatusOf(user) === 'suspended') return 'suspended'
  if (dutyStatusOf(user) === 'pip' || hasActivePip) return 'pip'
  return 'none'
}

/** Team leads, assistant leads, HR, and admin can see PIP / suspension on others. */
export function canViewDutyStatus(viewer: User | null | undefined): boolean {
  return isLead(viewer)
}

export function canViewDutyBadge(
  viewer: User | null | undefined,
  subject: User | null | undefined,
): boolean {
  if (!viewer || !subject) return false
  if (viewer.id === subject.id) return true
  return canViewDutyStatus(viewer)
}

/** Suspended staff may read memos/resources and manage their own account. */
export const SUSPENDED_ALLOWED_PATHS = ['/announcements', '/documents', '/privacy', '/account'] as const

export function dutyStatusConfirmCopy(
  name: string,
  next: DutyStatus,
): { title: string; message: string; confirmLabel: string; destructive: boolean } {
  if (next === 'suspended') {
    return {
      title: `Suspend ${name}?`,
      message: `${name} will still be able to sign in and read Updates and Resources. They cannot take other actions in the portal until you lift the suspension. Team leads, HR, and admin will see this status.`,
      confirmLabel: 'Place on suspension',
      destructive: true,
    }
  }
  if (next === 'pip') {
    return {
      title: `Place ${name} on a PIP?`,
      message: `Team leads, HR, and admin will see that ${name} is on a Performance Improvement Plan. Portal access stays the same. You can still open a formal PIP in Discipline if needed.`,
      confirmLabel: 'Place on PIP',
      destructive: false,
    }
  }
  return {
    title: `Return ${name} to normal duty?`,
    message: `${name} will no longer show as on PIP or suspension. If a formal PIP is still open, close it in Discipline & PIP as well.`,
    confirmLabel: 'Restore normal duty',
    destructive: false,
  }
}
