/**
 * admin-patch-profile — updates any user's profile row using the service role key,
 * bypassing RLS. Caller must be admin or hr (verified via their JWT + profiles table).
 *
 * Body: { userId: string, patch: Record<string, unknown> }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('SITE_URL') ?? 'https://portal.afrivate.org'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Fields HR/admin may change via this endpoint. */
const ALLOWED_PATCH_FIELDS = new Set([
  'email',
  'name',
  'role',
  'department',
  'job_title',
  'avatar_url',
  'avatar_color',
  'bio',
  'skills',
  'phone',
  'work_location',
  'pronouns',
  'linkedin_url',
  'reports_to_id',
  'active',
  'approved_at',
  'joined_at',
])

function pickAllowedPatch(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (ALLOWED_PATCH_FIELDS.has(key)) out[key] = value
  }
  return out
}

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
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile?.role || !['admin', 'hr'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Only administrators and HR can update other profiles' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json() as { userId?: string; patch?: Record<string, unknown> }
    const { userId, patch } = body

    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return new Response(JSON.stringify({ error: 'patch object is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { id: _dropId, ...rest } = patch
    void _dropId
    const safePatch = pickAllowedPatch(rest)
    if (Object.keys(safePatch).length === 0) {
      return new Response(JSON.stringify({ error: 'No allowed fields in patch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: before } = await adminClient
      .from('profiles')
      .select('role, active')
      .eq('id', userId)
      .maybeSingle()

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ ...safePatch, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Explicit audit log (service role has no auth.uid())
    const auditRows: Record<string, unknown>[] = []
    if (before && safePatch.role !== undefined && before.role !== safePatch.role) {
      auditRows.push({
        actor_id: caller.id,
        action: 'role_change',
        target_type: 'user',
        target_id: userId,
        detail: { from_role: before.role, to_role: safePatch.role },
      })
    }
    if (before && safePatch.active === true && before.active !== true) {
      auditRows.push({
        actor_id: caller.id,
        action: 'account_approval',
        target_type: 'user',
        target_id: userId,
        detail: safePatch,
      })
    }
    if (auditRows.length) {
      await adminClient.from('portal_admin_audit_log').insert(auditRows)
    }

    // Sync role to auth metadata when changed (read fallback only)
    if (safePatch.role !== undefined) {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { role: safePatch.role },
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
