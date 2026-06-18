import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS origin is restricted to the portal domain (set via SITE_URL env var in production)
const allowedOrigin = Deno.env.get('SITE_URL') ?? 'https://portal.afrivate.org'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://portal.afrivate.org'

    // Verify the calling user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use anon client with the caller's JWT to verify their identity
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

    // Use service role client to check the caller's profile role
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!profile?.role || !['admin', 'hr'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Only administrators and People & Culture managers can invite users' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse request body
    const body = await req.json()
    const { email, name } = body as { email?: string; name?: string }
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'A valid email address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleanEmail = email.trim().toLowerCase()
    const allowedDomain = (Deno.env.get('ALLOWED_EMAIL_DOMAIN') ?? '@afrivate.org').toLowerCase()
    if (allowedDomain && !cleanEmail.endsWith(allowedDomain)) {
      return new Response(
        JSON.stringify({ error: `Invites are limited to ${allowedDomain} addresses` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const cleanName = typeof name === 'string' && name.trim() ? name.trim() : undefined
    const redirectTo = `${siteUrl}/reset-password`
    const userData = cleanName ? { name: cleanName } : undefined

    // Send the invite via admin API
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo,
      data: userData,
    })

    if (error) {
      // If the user was already invited but never confirmed, re-send by generating
      // a fresh invite link so the admin can retry without manually deleting the user.
      const alreadyExists =
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already been registered') ||
        error.message.toLowerCase().includes('user already registered')

      if (alreadyExists) {
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: 'invite',
          email: cleanEmail,
          options: { redirectTo, data: userData },
        })
        if (linkErr) {
          return new Response(JSON.stringify({ error: linkErr.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return new Response(
          JSON.stringify({ success: true, resent: true, userId: linkData.user?.id }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, userId: data.user?.id }), {
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
