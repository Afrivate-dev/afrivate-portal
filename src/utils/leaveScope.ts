import type { LeaveRequest, User } from '@/types'
import { isHR } from '@/utils/helpers'
import { directReportIds } from '@/utils/hrMetrics'

/** Leave requests a manager may review — HR/admin see all; leads see direct reports only. */
export function leaveRequestsForManager(
  leaveRequests: LeaveRequest[],
  viewer: User,
  users: User[],
): LeaveRequest[] {
  if (isHR(viewer)) return leaveRequests
  const reportIds = directReportIds(users, viewer.id)
  return leaveRequests.filter((l) => reportIds.has(l.userId))
}
