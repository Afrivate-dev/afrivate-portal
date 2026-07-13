import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { supabase } from '@/lib/supabase'
import { SESSION_USER_STORAGE_KEY } from '@/lib/sessionPolicy'

export interface AccessRequestInput {
  message?: string
  preferredDepartmentId?: string
  jobTitle?: string
}

export interface AccessRequestResult {
  ok: boolean
  error?: string
  alreadyRequested?: boolean
}

const MOCK_REQUESTS_KEY = 'av-access-requests'
export const PENDING_ACCESS_REQUEST_KEY = 'av-pending-access-request'

type PendingAccessDraft = {
  preferredDepartmentId: string
  jobTitle: string
  message?: string
}

export function savePendingAccessDraft(draft: PendingAccessDraft): void {
  try {
    sessionStorage.setItem(PENDING_ACCESS_REQUEST_KEY, JSON.stringify(draft))
  } catch {
    /* ignore quota errors */
  }
}

export function readPendingAccessDraft(): PendingAccessDraft | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ACCESS_REQUEST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingAccessDraft
    if (!parsed.preferredDepartmentId || !parsed.jobTitle?.trim()) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPendingAccessDraft(): void {
  try {
    sessionStorage.removeItem(PENDING_ACCESS_REQUEST_KEY)
  } catch {
    /* ignore */
  }
}

type MockAccessRequest = {
  userId: string
  email: string
  name: string
  message: string | null
  preferredDepartmentId?: string
  jobTitle?: string
  status: 'pending' | 'acknowledged'
  requestedAt: string
}

type RpcAccessPayload = {
  success?: boolean
  already_requested?: boolean
  error?: string
}

function readMockRequests(): MockAccessRequest[] {
  try {
    return JSON.parse(localStorage.getItem(MOCK_REQUESTS_KEY) ?? '[]') as MockAccessRequest[]
  } catch {
    return []
  }
}

function writeMockRequests(rows: MockAccessRequest[]): void {
  localStorage.setItem(MOCK_REQUESTS_KEY, JSON.stringify(rows))
}

function currentMockUser(): { id: string; email: string; name: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_STORAGE_KEY)
    if (!raw) return null
    const u = JSON.parse(raw) as { id?: string; email?: string; name?: string }
    if (!u.id || !u.email) return null
    return { id: u.id, email: u.email, name: u.name ?? u.email.split('@')[0] ?? 'User' }
  } catch {
    return null
  }
}

function parseRpcPayload(data: unknown): AccessRequestResult {
  const payload = (data ?? {}) as RpcAccessPayload
  if (payload.error) {
    return { ok: false, error: payload.error }
  }
  if (payload.success) {
    return { ok: true, alreadyRequested: Boolean(payload.already_requested) }
  }
  return { ok: false, error: 'Could not send your request. Please try again.' }
}

function normalizeInput(input?: string | AccessRequestInput): AccessRequestInput {
  if (typeof input === 'string') return { message: input }
  return input ?? {}
}

/** Pending (inactive) users request portal access — uses Postgres RPC (Edge Function optional). */
export async function submitAccessRequest(
  input?: string | AccessRequestInput,
): Promise<AccessRequestResult> {
  const { message, preferredDepartmentId, jobTitle } = normalizeInput(input)
  const trimmedMessage = message?.trim().slice(0, 500) || null
  const trimmedTitle = jobTitle?.trim().slice(0, 120) || null
  const deptId = preferredDepartmentId?.trim() || null

  if (!isSupabaseAuthEnabled()) {
    const user = currentMockUser()
    if (!user) return { ok: false, error: 'Sign in first, then send your request.' }

    const rows = readMockRequests()
    const existing = rows.find((r) => r.userId === user.id && r.status === 'pending')
    if (existing) {
      const age = Date.now() - new Date(existing.requestedAt).getTime()
      if (age < 60_000) {
        return { ok: true, alreadyRequested: true }
      }
    }

    const next = rows.filter((r) => r.userId !== user.id)
    next.push({
      userId: user.id,
      email: user.email,
      name: user.name,
      message: trimmedMessage,
      preferredDepartmentId: deptId ?? undefined,
      jobTitle: trimmedTitle ?? undefined,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    })
    writeMockRequests(next)

    // Keep typed job title on the local user profile (do not leave placeholder "Staff")
    try {
      const usersRaw = localStorage.getItem('av-users')
      if (usersRaw && (trimmedTitle || deptId)) {
        const portalUsers = JSON.parse(usersRaw) as {
          id: string
          jobTitle?: string
          department?: string
          role?: string
          active?: boolean
        }[]
        const deptsRaw = localStorage.getItem('av-departments')
        const depts = deptsRaw
          ? (JSON.parse(deptsRaw) as { id: string; name: string }[])
          : []
        const deptName = deptId ? depts.find((d) => d.id === deptId)?.name : undefined
        const patched = portalUsers.map((u) =>
          u.id === user.id
            ? {
                ...u,
                ...(trimmedTitle ? { jobTitle: trimmedTitle } : {}),
                ...(deptName ? { department: deptName } : {}),
              }
            : u,
        )
        localStorage.setItem('av-users', JSON.stringify(patched))
      }
    } catch {
      /* ignore */
    }

    // Notify HR/admin inboxes in local mode (parity with Supabase RPC)
    try {
      const usersRaw = localStorage.getItem('av-users')
      const portalUsers = usersRaw ? (JSON.parse(usersRaw) as { id: string; role: string; active?: boolean }[]) : []
      const hrIds = portalUsers
        .filter((u) => u.active !== false && (u.role === 'hr' || u.role === 'admin'))
        .map((u) => u.id)
      if (hrIds.length) {
        const inboxRaw = localStorage.getItem('av-inbox')
        const inbox = inboxRaw ? (JSON.parse(inboxRaw) as Record<string, unknown>[]) : []
        const now = new Date().toISOString()
        const rows = hrIds.map((hrId) => ({
          id: `inbox_access_${user.id}_${hrId}_${Date.now()}`,
          userId: hrId,
          type: 'access_request',
          title: `${user.name} requested portal access`,
          body: trimmedMessage ?? trimmedTitle ?? undefined,
          link: '/admin',
          read: false,
          createdAt: now,
          fromUserId: user.id,
        }))
        localStorage.setItem('av-inbox', JSON.stringify([...rows, ...inbox]))
      }
    } catch {
      /* ignore */
    }

    return { ok: true, alreadyRequested: Boolean(existing) }
  }

  if (!supabase) {
    return { ok: false, error: 'The portal is not connected yet. Contact your administrator.' }
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('submit_portal_access_request', {
    p_message: trimmedMessage,
    p_preferred_department_id: deptId,
    p_job_title: trimmedTitle,
  })

  if (!rpcError) {
    return parseRpcPayload(rpcData)
  }

  const rpcMissing =
    rpcError.message.includes('submit_portal_access_request') ||
    rpcError.message.includes('Could not find the function') ||
    rpcError.code === 'PGRST202'

  if (!rpcMissing) {
    return { ok: false, error: rpcError.message }
  }

  const { data, error } = await supabase.functions.invoke('request-access', {
    body: {
      message: trimmedMessage || undefined,
      preferredDepartmentId: deptId ?? undefined,
      jobTitle: trimmedTitle ?? undefined,
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('edge function') || msg.includes('404') || msg.includes('not found')) {
      return {
        ok: false,
        error:
          'Request access is not set up on the server yet. Ask your administrator to run the latest database migration.',
      }
    }
    return { ok: false, error: error.message }
  }

  const payload = data as { error?: string; alreadyRequested?: boolean; success?: boolean }
  if (payload?.error) {
    return { ok: false, error: payload.error }
  }

  return { ok: true, alreadyRequested: payload?.alreadyRequested }
}

export async function fetchOwnAccessRequestStatus(): Promise<
  'none' | 'pending' | 'acknowledged' | 'approved' | 'dismissed'
> {
  if (!isSupabaseAuthEnabled()) {
    const user = currentMockUser()
    if (!user) return 'none'
    const row = readMockRequests().find((r) => r.userId === user.id)
    if (!row) return 'none'
    if (row.status === 'pending') return 'pending'
    if (row.status === 'acknowledged') return 'acknowledged'
    if (row.status === 'approved') return 'approved'
    if (row.status === 'dismissed') return 'dismissed'
    return 'none'
  }

  if (!supabase) return 'none'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'none'

  const { data } = await supabase
    .from('portal_access_requests')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return 'none'
  const status = String(data.status)
  if (status === 'pending') return 'pending'
  if (status === 'acknowledged') return 'acknowledged'
  if (status === 'approved') return 'approved'
  if (status === 'dismissed') return 'dismissed'
  return 'none'
}
