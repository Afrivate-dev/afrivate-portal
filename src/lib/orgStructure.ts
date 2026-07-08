import { isAdmin, isHR } from '@/utils/helpers'
import type { Department, User, WorkspaceTeam } from '@/types'

export function isDepartmentHead(user: User, departments: Department[]): boolean {
  return departments.some((d) => d.headUserId === user.id)
}

export function departmentsHeadedBy(user: User, departments: Department[]): Department[] {
  return departments.filter((d) => d.headUserId === user.id)
}

export function teamsLedBy(user: User, teams: WorkspaceTeam[]): WorkspaceTeam[] {
  return teams.filter((t) => t.leadUserId === user.id || t.asstLeadUserId === user.id)
}

/**
 * Whether a user leads people by assignment — leads/co-leads a team or heads a
 * department. Independent of portal role, so an admin can also be a team lead.
 */
export function managesPeople(
  user: User | null | undefined,
  teams: WorkspaceTeam[],
  departments: Department[],
): boolean {
  if (!user) return false
  return teamsLedBy(user, teams).length > 0 || departmentsHeadedBy(user, departments).length > 0
}

export function userTeamMemberships(userId: string, teams: WorkspaceTeam[]): WorkspaceTeam[] {
  return teams.filter((t) => t.memberIds.includes(userId))
}

export function canAssignUserToDepartment(
  actor: User,
  departmentId: string,
  departments: Department[],
): boolean {
  if (isHR(actor) || isAdmin(actor)) return true
  return departments.some((d) => d.id === departmentId && d.headUserId === actor.id)
}

export function canManageTeamMembership(actor: User, team: WorkspaceTeam): boolean {
  if (isHR(actor) || isAdmin(actor)) return true
  return team.leadUserId === actor.id || team.asstLeadUserId === actor.id
}

/** Departments the actor may assign people into. */
export function assignableDepartments(actor: User, departments: Department[]): Department[] {
  if (isHR(actor) || isAdmin(actor)) return departments
  return departments.filter((d) => d.headUserId === actor.id)
}

/** Teams the actor may add/remove members on. */
export function assignableTeams(actor: User, teams: WorkspaceTeam[]): WorkspaceTeam[] {
  if (isHR(actor) || isAdmin(actor)) return teams
  return teams.filter((t) => canManageTeamMembership(actor, t))
}

/** Line manager shown on profile — department head first, then stored reports_to. */
export function resolveReportsTo(
  profile: User,
  users: User[],
  departments: Department[],
): User | undefined {
  const dept = departments.find((d) => d.name === profile.department)
  if (dept?.headUserId) {
    const head = users.find((u) => u.id === dept.headUserId)
    if (head) return head
  }
  if (profile.reportsToId) {
    return users.find((u) => u.id === profile.reportsToId)
  }
  return undefined
}

export function departmentById(departments: Department[], id?: string): Department | undefined {
  if (!id) return undefined
  return departments.find((d) => d.id === id)
}

export function departmentByName(departments: Department[], name?: string): Department | undefined {
  if (!name?.trim()) return undefined
  return departments.find((d) => d.name === name)
}
