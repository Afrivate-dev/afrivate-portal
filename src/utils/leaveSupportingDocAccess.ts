import { isHR, isLead } from '@/utils/helpers'
import type { LeaveRequest, User } from '@/types'

export function canViewLeaveSupportingDoc(viewer: User, request: LeaveRequest): boolean {
  if (request.userId === viewer.id) return true
  return isHR(viewer) || isLead(viewer)
}
