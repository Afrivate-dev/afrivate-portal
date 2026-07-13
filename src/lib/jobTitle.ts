import type { AccessRequest, User } from '@/types'

/** True when the stored title is the old signup placeholder, not a real job title. */
export function isPlaceholderJobTitle(title?: string | null): boolean {
  const t = title?.trim()
  if (!t) return true
  return t.toLowerCase() === 'staff'
}

/** Prefer the access-request title, then a real profile title — never invent "Staff". */
export function resolveAccessJobTitle(
  user: Pick<User, 'jobTitle'>,
  request?: Pick<AccessRequest, 'jobTitle'> | null,
): string {
  const fromRequest = request?.jobTitle?.trim()
  if (fromRequest && !isPlaceholderJobTitle(fromRequest)) return fromRequest

  const fromProfile = user.jobTitle?.trim()
  if (fromProfile && !isPlaceholderJobTitle(fromProfile)) return fromProfile

  if (fromRequest) return fromRequest
  return fromProfile || ''
}
