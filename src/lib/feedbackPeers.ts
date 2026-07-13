import type { User, WorkspaceTeam, Department } from '@/types'
import type { FeedbackAssignment } from '@/types/hr'

const PEER_CAP = 8

function managerIdsForUser(
  user: User,
  teams: WorkspaceTeam[],
  departments: Department[] = [],
): Set<string> {
  const mgrs = new Set<string>()
  if (user.reportsToId) mgrs.add(user.reportsToId)
  for (const t of teams) {
    if (!t.memberIds.includes(user.id)) continue
    if (t.leadUserId) mgrs.add(t.leadUserId)
    if (t.asstLeadUserId) mgrs.add(t.asstLeadUserId)
  }
  for (const d of departments) {
    if (d.name === user.department && d.headUserId) mgrs.add(d.headUserId)
  }
  mgrs.delete(user.id)
  return mgrs
}

/** Build peer assignments for a subject (same department / shared team, excluding managers). */
export function buildPeerAssignmentsForSubject(
  subject: User,
  activeUsers: User[],
  teams: WorkspaceTeam[],
  cycleId: string,
  newId: () => string,
  departments: Department[] = [],
): FeedbackAssignment[] {
  const mgrs = managerIdsForUser(subject, teams, departments)
  const teammateIds = new Set<string>()
  for (const t of teams) {
    if (!t.memberIds.includes(subject.id)) continue
    for (const id of t.memberIds) {
      if (id !== subject.id) teammateIds.add(id)
    }
  }

  const peers = activeUsers
    .filter((p) => {
      if (p.id === subject.id) return false
      if (mgrs.has(p.id)) return false
      const sameDept =
        Boolean(subject.department?.trim()) && p.department === subject.department
      return sameDept || teammateIds.has(p.id)
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, PEER_CAP)

  return peers.map((p) => ({
    id: newId(),
    cycleId,
    subjectUserId: subject.id,
    reviewerId: p.id,
    relationship: 'peer' as const,
    createdAt: new Date().toISOString(),
  }))
}
