import type { SupabaseClient } from '@supabase/supabase-js'

function parseRpc(data: unknown): { ok: true } | { ok: false; error: string } {
  const payload = (data ?? {}) as { success?: boolean; error?: string }
  if (payload.error) return { ok: false, error: payload.error }
  if (payload.success) return { ok: true }
  return { ok: false, error: 'Assignment failed.' }
}

export async function rpcAssignUserToDepartment(
  client: SupabaseClient,
  userId: string,
  departmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await client.rpc('portal_assign_user_department', {
    p_user_id: userId,
    p_department_id: departmentId,
  })
  if (error) return { ok: false, error: error.message }
  return parseRpc(data)
}

export async function rpcSetTeamMember(
  client: SupabaseClient,
  userId: string,
  teamId: string,
  member: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await client.rpc('portal_set_team_member', {
    p_team_id: teamId,
    p_user_id: userId,
    p_add: member,
  })
  if (error) return { ok: false, error: error.message }
  return parseRpc(data)
}
