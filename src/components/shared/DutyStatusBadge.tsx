import { Badge } from '@/components/ui/Badge'
import {
  canViewDutyBadge,
  DUTY_STATUS_LABELS,
  effectiveDutyStatus,
} from '@/lib/dutyStatus'
import type { User } from '@/types'

export function DutyStatusBadge({
  viewer,
  subject,
  hasActivePip = false,
  className,
}: {
  viewer: User | null | undefined
  subject: User | null | undefined
  hasActivePip?: boolean
  className?: string
}) {
  if (!subject || !canViewDutyBadge(viewer, subject)) return null
  const status = effectiveDutyStatus(subject, hasActivePip)
  if (status === 'none') return null
  return (
    <Badge tone={status === 'suspended' ? 'danger' : 'warning'} className={className} dot>
      {DUTY_STATUS_LABELS[status]}
    </Badge>
  )
}
