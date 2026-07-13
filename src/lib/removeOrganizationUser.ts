import type { SupabaseClient } from '@supabase/supabase-js'

export async function removeOrganizationUser(
  client: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await client.functions.invoke('admin-remove-user', {
    body: { userId },
  })

  const payload = data as { success?: boolean; error?: string } | null
  if (payload?.success) return { ok: true }

  if (payload?.error) return { ok: false, error: payload.error }

  if (error) {
    const msg =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message: string }).message)
        : 'Could not remove this user.'
    // Functions often wrap JSON errors in a generic message — prefer body when present
    return { ok: false, error: msg || 'Could not remove this user.' }
  }

  return { ok: false, error: 'Could not remove this user.' }
}
