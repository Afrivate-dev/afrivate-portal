import type { SupabaseClient } from '@supabase/supabase-js'
import type { Role } from '@/types'

export type ApproveUserResult = { ok: true; emailSent?: boolean } | { ok: false; error: string }

type RpcApprovePayload = {
  success?: boolean
  error?: string
  email?: string
  name?: string
}

function parseRpcApprove(data: unknown): ApproveUserResult {
  const payload = (data ?? {}) as RpcApprovePayload
  if (payload.error) return { ok: false, error: payload.error }
  if (payload.success) return { ok: true }
  return { ok: false, error: 'Approval failed. Please try again.' }
}

/** Edge fallback does not run admin_approve_portal_user — sync reports_to from department head. */
async function syncReportsToFromDepartment(
  client: SupabaseClient,
  userId: string,
  department: string,
): Promise<void> {
  const deptName = department.trim()
  if (!deptName) return

  const { data: dept } = await client
    .from('portal_departments')
    .select('head_user_id')
    .eq('name', deptName)
    .maybeSingle()

  if (!dept?.head_user_id) return

  await client.rpc('admin_patch_portal_profile', {
    p_user_id: userId,
    p_patch: { reports_to_id: dept.head_user_id },
  })
}

async function invokeEdgeApprove(
  client: SupabaseClient,
  userId: string,
  role: Role,
  department: string,
  jobTitle: string,
): Promise<ApproveUserResult> {
  const { data, error } = await client.functions.invoke('admin-patch-profile', {
    body: {
      userId,
      patch: {
        role,
        department,
        job_title: jobTitle,
        active: true,
        approved_at: new Date().toISOString(),
      },
    },
  })

  if (error) return { ok: false, error: error.message }

  const payload = data as { error?: string; success?: boolean } | null
  if (payload?.error) return { ok: false, error: payload.error }
  if (payload?.success === false) return { ok: false, error: 'Approval could not be completed. Please try again.' }

  await client
    .from('portal_access_requests')
    .update({ status: 'approved' })
    .eq('user_id', userId)

  await syncReportsToFromDepartment(client, userId, department)

  return { ok: true }
}

async function sendApprovalEmail(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client.functions.invoke('notify-access-approved', {
    body: { userId },
  })
  if (error) return false
  const payload = data as { email_sent?: boolean; success?: boolean } | null
  return Boolean(payload?.email_sent)
}

/** Activate a pending user — RPC first, Edge Function fallback, optional approval email. */
export async function approvePortalUser(
  client: SupabaseClient,
  userId: string,
  role: Role,
  department: string,
  jobTitle: string,
): Promise<ApproveUserResult> {
  const { data: rpcData, error: rpcError } = await client.rpc('admin_approve_portal_user', {
    p_user_id: userId,
    p_role: role,
    p_department: department,
    p_job_title: jobTitle,
  })

  let result: ApproveUserResult

  if (!rpcError) {
    result = parseRpcApprove(rpcData)
  } else {
    const rpcMissing =
      rpcError.message.includes('admin_approve_portal_user') ||
      rpcError.message.includes('Could not find the function') ||
      rpcError.code === 'PGRST202'

    if (!rpcMissing) {
      return { ok: false, error: rpcError.message }
    }

    result = await invokeEdgeApprove(client, userId, role, department, jobTitle)
  }

  if (!result.ok) return result

  const emailSent = await sendApprovalEmail(client, userId)
  return { ok: true, emailSent }
}
