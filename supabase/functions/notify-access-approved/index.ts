/**
 * notify-access-approved — sends an approval email to a newly activated user.
 * Requires Edge Function secrets (optional email):
 *   RESEND_API_KEY — from resend.com
 *   MAIL_FROM — e.g. "AfriVate Portal <noreply@afrivate.org>"
 *   SITE_URL — e.g. https://portal.afrivate.org
 *
 * Body: { userId: string }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('SITE_URL') ?? 'https://portal.afrivate.org'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://portal.afrivate.org'
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
    const mailFrom = Deno.env.get('MAIL_FROM') ?? 'AfriVate Portal <portal@afrivate.org>'

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
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as { userId?: string }
    const userId = body.userId
    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('email, name, active')
      .eq('id', userId)
      .maybeSingle()

    const { data: authData, error: authUserErr } = await adminClient.auth.admin.getUserById(userId)
    if (authUserErr || !authData.user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = profile?.email?.trim() || authData.user.email
    if (!email) {
      return new Response(JSON.stringify({ error: 'User has no email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const name = profile?.name?.trim() || email.split('@')[0] || 'there'
    const loginUrl = `${siteUrl.replace(/\/$/, '')}/login`

    if (!resendKey) {
      return new Response(
        JSON.stringify({
          success: true,
          email_sent: false,
          message: 'RESEND_API_KEY not configured — in-app notification only',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const html = `
      <p>Hi ${name},</p>
      <p>Good news — your AfriVate employee portal account has been approved.</p>
      <p>You can sign in here: <a href="${loginUrl}">${loginUrl}</a></p>
      <p>— AfriVate People &amp; Culture</p>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mailFrom,
        to: [email],
        subject: 'Your AfriVate portal access is approved',
        html,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      return new Response(JSON.stringify({ error: `Email failed: ${detail}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, email_sent: true, email }), {
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
