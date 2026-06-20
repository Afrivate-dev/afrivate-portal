/** Shared portal password rules (signup, reset, invite). */
export function validatePortalPassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(pw)) return 'Include at least one uppercase letter.'
  if (!/[0-9!@#$%^&*()\-_=+[\]{}|;:,.<>?/\\]/.test(pw))
    return 'Include at least one number or special character.'
  return null
}

export const passwordPolicyHint =
  'At least 8 characters with one uppercase letter and one number or symbol.'
