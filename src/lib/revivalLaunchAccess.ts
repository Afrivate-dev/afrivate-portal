import type { User } from '@/types'

export type RevivalPerson = 'e' | 'd' | 'o'

export const REVIVAL_LAUNCH_PEOPLE: Record<
  RevivalPerson,
  { label: string; shortLabel: string; keys: string[] }
> = {
  e: { label: 'Emmanuel', shortLabel: 'Emmanuel', keys: ['emmanuel', 'okpiaifo'] },
  d: { label: 'Daniel', shortLabel: 'Daniel', keys: ['daniel'] },
  o: { label: 'Opemipo', shortLabel: 'Opemipo', keys: ['opemipo', 'adesoye', 'dorcas'] },
}

function haystackFor(user: Pick<User, 'name' | 'email'>): string {
  return `${user.name} ${user.email}`.toLowerCase()
}

export function matchesRevivalPerson(
  user: Pick<User, 'name' | 'email'>,
  person: RevivalPerson,
): boolean {
  const hay = haystackFor(user)
  return REVIVAL_LAUNCH_PEOPLE[person].keys.some((k) => hay.includes(k))
}

/** Only Emmanuel, Daniel, and Opemipo (Adesoye Dorcas) may open the revival launch checklist. */
export function canAccessRevivalLaunchChecklist(user: Pick<User, 'name' | 'email'> | null): boolean {
  if (!user) return false
  return (Object.keys(REVIVAL_LAUNCH_PEOPLE) as RevivalPerson[]).some((p) =>
    matchesRevivalPerson(user, p),
  )
}

export function findRevivalPersonUser(users: User[], person: RevivalPerson): User | undefined {
  return users.find((u) => matchesRevivalPerson(u, person))
}

export function revivalPersonForUser(user: Pick<User, 'name' | 'email'>): RevivalPerson | null {
  for (const p of Object.keys(REVIVAL_LAUNCH_PEOPLE) as RevivalPerson[]) {
    if (matchesRevivalPerson(user, p)) return p
  }
  return null
}
