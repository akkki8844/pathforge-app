// admin-send-bulk-email
// Validates the caller is an authenticated admin, resolves the recipient list
// from the targeting filter, and fans out send-transactional-email invocations
// using the service role. Each recipient gets a unique idempotency key derived
// from the campaign id, so retries are safe.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const TEMPLATE_NAME = 'admin-broadcast'

interface RequestBody {
  category?: 'custom' | 'announcement' | 'feature-release' | 'template'
  templateKey?: string
  subject: string
  heading?: string
  preview?: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
  targetKind: 'all' | 'grade' | 'school' | 'individual'
  targetFilter: {
    grades?: string[]
    schools?: string[]
    userIds?: string[]
  }
  testEmail?: string // when present, send only to this address (test send)
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify caller is an authenticated admin.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Unauthorized' })

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userRes, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userRes?.user) return json(401, { error: 'Unauthorized' })

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: isAdminRow, error: adminErr } = await admin.rpc('is_admin', {
    _user_id: userRes.user.id,
  } as any)
  // Also tolerate the no-arg form
  let isAdmin = !!isAdminRow
  if (adminErr) {
    const fallback = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userRes.user.id)
      .eq('role', 'admin')
      .maybeSingle()
    isAdmin = !!fallback.data
  }
  if (!isAdmin) return json(403, { error: 'Forbidden' })

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  if (!body.subject?.trim() || !body.body?.trim()) {
    return json(400, { error: 'Subject and body are required' })
  }
  if (!['all', 'grade', 'school', 'individual'].includes(body.targetKind)) {
    return json(400, { error: 'Invalid targetKind' })
  }

  // Resolve recipients (test send short-circuits)
  let recipients: { user_id: string | null; email: string }[] = []
  if (body.testEmail) {
    recipients = [{ user_id: userRes.user.id, email: body.testEmail.toLowerCase().trim() }]
  } else {
    // Use the user's JWT so the RPC's is_admin() check (which reads auth.uid())
    // recognizes the caller. The edge function has already verified admin above.
    const { data: rows, error: resolveErr } = await userClient.rpc(
      'admin_resolve_email_recipients',
      { _target_kind: body.targetKind, _filter: body.targetFilter ?? {} } as any,
    )
    if (resolveErr) {
      console.error('resolve recipients failed', resolveErr)
      return json(500, { error: 'Failed to resolve recipients' })
    }
    recipients = (rows as any[])
      .filter((r) => r.email)
      .map((r) => ({ user_id: r.user_id, email: String(r.email).toLowerCase() }))
    // Dedupe by email
    const seen = new Set<string>()
    recipients = recipients.filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)))
  }

  if (recipients.length === 0) {
    return json(400, { error: 'No recipients matched the selected filter.' })
  }

  // Create campaign row
  const { data: campaign, error: campErr } = await admin
    .from('email_campaigns')
    .insert({
      created_by: userRes.user.id,
      category: body.category ?? 'custom',
      template_key: body.templateKey ?? null,
      subject: body.subject.trim(),
      heading: (body.heading || body.subject).trim(),
      preview_text: body.preview?.trim() || null,
      body: body.body,
      cta_label: body.ctaLabel?.trim() || null,
      cta_url: body.ctaUrl?.trim() || null,
      target_kind: body.targetKind,
      target_filter: body.targetFilter ?? {},
      total_recipients: recipients.length,
      status: 'sending',
    })
    .select('id')
    .single()
  if (campErr || !campaign) {
    console.error('campaign insert failed', campErr)
    return json(500, { error: 'Failed to create campaign' })
  }

  const campaignId = campaign.id as string
  const sendUrl = `${supabaseUrl}/functions/v1/send-transactional-email`

  let queued = 0
  let skipped = 0
  const recipientRows: any[] = []

  // Sequential dispatch keeps load predictable; the queue handles real send rate.
  for (const r of recipients) {
    const idempotencyKey = `admin-broadcast-${campaignId}-${r.user_id ?? r.email}`
    try {
      const res = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          templateName: TEMPLATE_NAME,
          recipientEmail: r.email,
          idempotencyKey,
          templateData: {
            subject: body.subject,
            heading: body.heading || body.subject,
            preview: body.preview || body.subject,
            body: body.body,
            ctaLabel: body.ctaLabel || undefined,
            ctaUrl: body.ctaUrl || undefined,
            footerNote: body.footerNote || undefined,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        skipped++
        recipientRows.push({
          campaign_id: campaignId,
          user_id: r.user_id,
          recipient_email: r.email,
          status: 'failed',
          error_message: typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`,
        })
        continue
      }
      if (data?.reason === 'email_suppressed') {
        skipped++
        recipientRows.push({
          campaign_id: campaignId,
          user_id: r.user_id,
          recipient_email: r.email,
          status: 'skipped',
          error_message: 'Recipient is suppressed',
        })
        continue
      }
      queued++
      recipientRows.push({
        campaign_id: campaignId,
        user_id: r.user_id,
        recipient_email: r.email,
        status: 'queued',
      })
    } catch (e) {
      skipped++
      recipientRows.push({
        campaign_id: campaignId,
        user_id: r.user_id,
        recipient_email: r.email,
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  if (recipientRows.length > 0) {
    // Insert in chunks of 500 to stay well within payload limits
    for (let i = 0; i < recipientRows.length; i += 500) {
      await admin.from('email_campaign_recipients').insert(recipientRows.slice(i, i + 500))
    }
  }

  await admin
    .from('email_campaigns')
    .update({
      total_queued: queued,
      total_skipped: skipped,
      status: queued > 0 ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  return json(200, {
    success: true,
    campaignId,
    totalRecipients: recipients.length,
    queued,
    skipped,
    test: !!body.testEmail,
  })
})
