import type { SupabaseClient } from '@supabase/supabase-js'

export type InviteUserResult = { ok: true; resent?: boolean } | { ok: false; error: string }

/** Invite a user by email (requires invite-user Edge Function on Supabase). */
export async function invitePortalUser(
  client: SupabaseClient,
  email: string,
  name?: string,
): Promise<InviteUserResult> {
  const cleanEmail = email.trim().toLowerCase()
  const cleanName = name?.trim() || undefined

  const { data, error } = await client.functions.invoke('invite-user', {
    body: { email: cleanEmail, name: cleanName },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('edge function') || msg.includes('404') || msg.includes('not found')) {
      return {
        ok: false,
        error:
          'Email invitations are not available right now. Share the Request access link with new team members instead.',
      }
    }
    return { ok: false, error: error.message }
  }

  const payload = data as { error?: string; success?: boolean; resent?: boolean } | null
  if (payload?.error) return { ok: false, error: payload.error }
  if (payload?.success) return { ok: true, resent: payload.resent }
  return { ok: false, error: 'The invitation was not accepted. Please try again.' }
}
