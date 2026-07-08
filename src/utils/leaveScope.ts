import type { Department, LeaveRequest, User, WorkspaceTeam } from '@/types'
import { isHR } from '@/utils/helpers'
import { managedReportIds } from '@/utils/hrMetrics'

/**
 * Leave requests a manager may review — HR/admin see all; anyone who manages
 * people (direct reports, a team they lead, or a department they head) sees
 * their managed people's requests.
 */
export function leaveRequestsForManager(
  leaveRequests: LeaveRequest[],
  viewer: User,
  users: User[],
  teams: WorkspaceTeam[],
  departments: Department[],
): LeaveRequest[] {
  if (isHR(viewer)) return leaveRequests
  const reportIds = managedReportIds(viewer, users, teams, departments)
  return leaveRequests.filter((l) => reportIds.has(l.userId))
}
