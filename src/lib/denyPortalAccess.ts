import type { SupabaseClient } from '@supabase/supabase-js'

export type DenyUserResult = { ok: true } | { ok: false; error: string }

/** Decline a pending access request (marks dismissed; account stays inactive). */
export async function denyPortalAccess(
  client: SupabaseClient,
  userId: string,
  note?: string,
): Promise<DenyUserResult> {
  const { data, error } = await client.rpc('admin_deny_portal_access', {
    p_user_id: userId,
    p_note: note?.trim() || null,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const payload = (data ?? {}) as { success?: boolean; error?: string }
  if (payload.error) return { ok: false, error: payload.error }
  if (payload.success) return { ok: true }
  return { ok: false, error: 'Could not deny this access request.' }
}
