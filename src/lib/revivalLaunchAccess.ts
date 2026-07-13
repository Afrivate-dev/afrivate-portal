import type { User } from '@/types'

export type RevivalPerson = 'e' | 'd' | 'o'

export const REVIVAL_LAUNCH_PEOPLE: Record<
  RevivalPerson,
  { label: string; shortLabel: string; /** Email local-parts and name tokens (exact / whole-word) */ keys: string[] }
> = {
  e: { label: 'Emmanuel', shortLabel: 'Emmanuel', keys: ['emmanuel', 'okpiaifo'] },
  d: { label: 'Daniel', shortLabel: 'Daniel', keys: ['daniel'] },
  o: { label: 'Opemipo', shortLabel: 'Opemipo', keys: ['opemipo', 'adesoye', 'dorcas'] },
}

/** Optional exact emails via VITE_REVIVAL_LAUNCH_EMAILS=a@x.com,b@y.com */
function envAllowlistEmails(): string[] {
  const raw = import.meta.env.VITE_REVIVAL_LAUNCH_EMAILS
  if (!raw || typeof raw !== 'string') return []
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

function emailLocalPart(email: string): string {
  return email.split('@')[0]?.toLowerCase() ?? ''
}

export function matchesRevivalPerson(
  user: Pick<User, 'name' | 'email'>,
  person: RevivalPerson,
): boolean {
  const local = emailLocalPart(user.email)
  const keys = REVIVAL_LAUNCH_PEOPLE[person].keys
  // Exact email local-part only (avoid matching unrelated staff by display name)
  return keys.includes(local)
}

/** Only Emmanuel, Daniel, and Opemipo may open the revival launch checklist. */
export function canAccessRevivalLaunchChecklist(user: Pick<User, 'name' | 'email'> | null): boolean {
  if (!user) return false
  const email = user.email.toLowerCase()
  if (envAllowlistEmails().includes(email)) return true
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
