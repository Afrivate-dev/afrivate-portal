import type { SupabaseClient, FunctionsHttpError } from '@supabase/supabase-js'

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
    // Prefer JSON body from edge function when available
    if (error instanceof Error && 'context' in error) {
      try {
        const ctx = (error as FunctionsHttpError).context
        if (ctx && typeof ctx.json === 'function') {
          const body = (await ctx.json()) as { error?: string }
          if (body?.error) return { ok: false, error: body.error }
        }
      } catch {
        /* ignore parse errors */
      }
    }
    const msg =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message: string }).message)
        : 'Could not remove this user.'
    if (/failed to send|non-2xx|edge function/i.test(msg)) {
      return {
        ok: false,
        error:
          'Could not reach the remove-user service. Confirm admin-remove-user is deployed and you are signed in as an administrator.',
      }
    }
    return { ok: false, error: msg || 'Could not remove this user.' }
  }

  return { ok: false, error: 'Could not remove this user.' }
}
