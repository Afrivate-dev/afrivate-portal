/**
 * request-access — pending (inactive) users request portal access.
 * Notifies all HR/admin users via inbox. Uses service role for cross-user inserts.
 *
 * Body: { message?: string }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('SITE_URL') ?? 'https://portal.afrivate.org'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RATE_LIMIT_MS = 60_000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, name, active')
      .eq('id', caller.id)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (profile.active === true) {
      return new Response(JSON.stringify({ error: 'Your account is already active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({})) as {
      message?: string
      preferredDepartmentId?: string
      jobTitle?: string
    }
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : ''
    const preferredDepartmentId =
      typeof body.preferredDepartmentId === 'string' ? body.preferredDepartmentId.trim() : null
    const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim().slice(0, 120) : null

    let deptName: string | null = null
    if (preferredDepartmentId) {
      const { data: deptRow } = await adminClient
        .from('portal_departments')
        .select('name')
        .eq('id', preferredDepartmentId)
        .maybeSingle()
      deptName = deptRow?.name ?? null
    }

    const { data: existing } = await adminClient
      .from('portal_access_requests')
      .select('id, requested_at, status')
      .eq('user_id', caller.id)
      .maybeSingle()

    if (existing?.status === 'pending') {
      const requestedAt = new Date(existing.requested_at).getTime()
      if (Date.now() - requestedAt < RATE_LIMIT_MS) {
        return new Response(
          JSON.stringify({ success: true, alreadyRequested: true, message: 'Request already sent recently' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    const { error: upsertErr } = await adminClient.from('portal_access_requests').upsert(
      {
        user_id: caller.id,
        message: message || null,
        preferred_department_id: preferredDepartmentId,
        job_title: jobTitle,
        requested_at: new Date().toISOString(),
        status: 'pending',
      },
      { onConflict: 'user_id' },
    )

    if (upsertErr) {
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mirror typed job title / department onto the profile (never leave placeholder "Staff")
    if (jobTitle || deptName) {
      const profilePatch: Record<string, string> = {}
      if (jobTitle) profilePatch.job_title = jobTitle
      if (deptName) profilePatch.department = deptName
      await adminClient.from('profiles').update(profilePatch).eq('id', caller.id)
    }

    const { data: admins } = await adminClient
      .from('profiles')
      .select('id')
      .in('role', ['hr', 'admin'])
      .eq('active', true)

    const now = new Date().toISOString()
    const inboxRows = (admins ?? []).map((a) => ({
      id: `inbox_access_${caller.id}_${a.id}`,
      user_id: a.id,
      type: 'access_request',
      title: 'Portal access requested',
      body: `${profile.name} (${profile.email}) is waiting for approval.${
        deptName ? ` Department: ${deptName}` : ''
      }${jobTitle ? ` · Job title: ${jobTitle}` : ''}${message ? ` Message: ${message}` : ''}`,
      link: '/admin',
      read: false,
      created_at: now,
      from_user_id: caller.id,
    }))

    if (inboxRows.length) {
      await adminClient.from('portal_inbox_notifications').upsert(inboxRows, {
        onConflict: 'id',
        ignoreDuplicates: true,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
