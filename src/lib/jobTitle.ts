import type { AccessRequest, User } from '@/types'

/** True when the stored title is the old signup placeholder, not a real job title. */
export function isPlaceholderJobTitle(title?: string | null): boolean {
  const t = title?.trim()
  if (!t) return true
  return t.toLowerCase() === 'staff'
}

/**
 * Job title for approval / display.
 * Always prefer exactly what the person typed on their access request.
 * Only fall back to the profile when the request has no title (and skip the
 * legacy signup placeholder "Staff").
 */
export function resolveAccessJobTitle(
  user: Pick<User, 'jobTitle'>,
  request?: Pick<AccessRequest, 'jobTitle'> | null,
): string {
  const fromRequest = request?.jobTitle?.trim()
  if (fromRequest) return fromRequest

  const fromProfile = user.jobTitle?.trim()
  if (fromProfile && !isPlaceholderJobTitle(fromProfile)) return fromProfile
  return ''
}
