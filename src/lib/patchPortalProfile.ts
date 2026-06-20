import type { SupabaseClient } from '@supabase/supabase-js'

type PatchResult = { ok: true } | { ok: false; error: string }

type RpcPayload = { success?: boolean; error?: string }

function parseRpc(data: unknown): PatchResult {
  const payload = (data ?? {}) as RpcPayload
  if (payload.error) return { ok: false, error: payload.error }
  if (payload.success) return { ok: true }
  return { ok: false, error: 'Profile update failed.' }
}

/** Update another user's profile — RPC first, Edge Function fallback. */
export async function patchPortalProfile(
  client: SupabaseClient,
  userId: string,
  patch: Record<string, unknown>,
): Promise<PatchResult> {
  const { data: rpcData, error: rpcError } = await client.rpc('admin_patch_portal_profile', {
    p_user_id: userId,
    p_patch: patch,
  })

  if (!rpcError) return parseRpc(rpcData)

  const rpcMissing =
    rpcError.message.includes('admin_patch_portal_profile') ||
    rpcError.message.includes('Could not find the function') ||
    rpcError.code === 'PGRST202'

  if (!rpcMissing) return { ok: false, error: rpcError.message }

  const { data, error } = await client.functions.invoke('admin-patch-profile', {
    body: { userId, patch },
  })

  if (error) return { ok: false, error: error.message }

  const payload = data as { error?: string; success?: boolean } | null
  if (payload?.error) return { ok: false, error: payload.error }
  if (payload?.success === false) return { ok: false, error: 'Update was rejected by the server.' }

  return { ok: true }
}
