import { isSupabaseAuthEnabled } from '@/lib/authMode'

import { supabase } from '@/lib/supabase'



export interface AccessRequestResult {

  ok: boolean

  error?: string

  alreadyRequested?: boolean

}



const MOCK_REQUESTS_KEY = 'av-access-requests'



type MockAccessRequest = {

  userId: string

  email: string

  name: string

  message: string | null

  status: 'pending' | 'acknowledged'

  requestedAt: string

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

    const raw = localStorage.getItem('av-auth-user')

    if (!raw) return null

    const u = JSON.parse(raw) as { id?: string; email?: string; name?: string }

    if (!u.id || !u.email) return null

    return { id: u.id, email: u.email, name: u.name ?? u.email.split('@')[0] ?? 'User' }

  } catch {

    return null

  }

}



/** Pending (inactive) users call the request-access Edge Function (or mock store in dev). */

export async function submitAccessRequest(message?: string): Promise<AccessRequestResult> {

  if (!isSupabaseAuthEnabled()) {

    const user = currentMockUser()

    if (!user) return { ok: false, error: 'Not signed in' }



    const trimmed = message?.trim().slice(0, 500) || null

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

      message: trimmed,

      status: 'pending',

      requestedAt: new Date().toISOString(),

    })

    writeMockRequests(next)



    // Surface a mock inbox notification for HR/admin in local mode.

    try {

      const inboxRaw = localStorage.getItem('av-inbox')

      const inbox = inboxRaw ? (JSON.parse(inboxRaw) as unknown[]) : []

      const note = {

        id: `inbox_access_${user.id}`,

        userId: 'u_hr',

        type: 'access_request',

        title: 'Portal access requested',

        body: `${user.name} (${user.email}) is waiting for approval.${trimmed ? ` Message: ${trimmed}` : ''}`,

        link: '/admin',

        read: false,

        createdAt: new Date().toISOString(),

        fromUserId: user.id,

      }

      localStorage.setItem('av-inbox', JSON.stringify([note, ...inbox]))

    } catch {

      /* optional mock inbox */

    }



    return { ok: true, alreadyRequested: Boolean(existing) }

  }



  if (!supabase) {

    return { ok: false, error: 'Supabase is not configured' }

  }



  const { data, error } = await supabase.functions.invoke('request-access', {

    body: { message: message?.trim() || undefined },

  })



  if (error) {

    return { ok: false, error: error.message }

  }



  const payload = data as { error?: string; alreadyRequested?: boolean; success?: boolean }

  if (payload?.error) {

    return { ok: false, error: payload.error }

  }



  return { ok: true, alreadyRequested: payload?.alreadyRequested }

}



export async function fetchOwnAccessRequestStatus(): Promise<'none' | 'pending' | 'acknowledged'> {

  if (!isSupabaseAuthEnabled()) {

    const user = currentMockUser()

    if (!user) return 'none'

    const row = readMockRequests().find((r) => r.userId === user.id)

    if (!row) return 'none'

    if (row.status === 'pending') return 'pending'

    if (row.status === 'acknowledged') return 'acknowledged'

    return 'none'

  }



  if (!supabase) return 'none'



  const { data: { user } } = await supabase.auth.getUser()

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

  return 'none'

}

