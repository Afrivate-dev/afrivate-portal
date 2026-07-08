import { isHR } from '@/utils/helpers'
import type { LeaveRequest, User } from '@/types'

/**
 * Who may view a leave request's supporting document: the requester, HR/admin,
 * or a manager of the requester. Pass the viewer's managed-report ids
 * (from `managedReportIds`) so assignment-based leaders are covered and other
 * leads can't see docs for people they don't manage.
 */
export function canViewLeaveSupportingDoc(
  viewer: User,
  request: LeaveRequest,
  managedIds?: Set<string>,
): boolean {
  if (request.userId === viewer.id) return true
  if (isHR(viewer)) return true
  return managedIds?.has(request.userId) ?? false
}
