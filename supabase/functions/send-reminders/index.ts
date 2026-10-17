import { createClient } from 'npm:@supabase/supabase-js@2'

const EMAIL_KINDS = ['due_soon', 'overdue', 'payout_upcoming']

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const resendKey = Deno.env.get('RESEND_API_KEY')
const from = Deno.env.get('EMAIL_FROM') ?? 'Adunni <onboarding@resend.dev>'
const appUrl = Deno.env.get('APP_URL') ?? 'https://adunni-six.vercel.app'
const cronSecret = Deno.env.get('CRON_SECRET')

type Pending = { id: string; profile_id: string; title: string; body: string; profile: { full_name: string } }

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function renderEmail(name: string, items: Pending[]) {
  const rows = items
    .map(
      (n) => `
        <tr><td style="padding:14px 0;border-bottom:1px solid #e9e7df">
          <div style="font-weight:700;font-size:15px;color:#17201b">${escapeHtml(n.title)}</div>
          <div style="font-size:13px;color:#5d6862;margin-top:4px">${escapeHtml(n.body)}</div>
        </td></tr>`,
    )
    .join('')

  return `
  <div style="background:#f6f5f0;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e9e7df">
      <div style="background:linear-gradient(135deg,#0b6b3a,#06381f);padding:24px;color:#fff">
        <div style="font-size:12px;font-weight:800;letter-spacing:3px">ADUNNI</div>
        <div style="font-size:20px;font-weight:800;margin-top:10px">Hi ${escapeHtml(name || 'there')}, here's your update</div>
      </div>
      <div style="padding:8px 24px 24px">
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <a href="${appUrl}/notifications" style="display:inline-block;margin-top:20px;background:#128a4a;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:12px">Open Adunni</a>
        <p style="font-size:12px;color:#5d6862;margin-top:24px">You can turn these emails off in Settings → Notifications.</p>
      </div>
    </div>
  </div>`
}

Deno.serve(async (req) => {
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!resendKey) {
    return Response.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 })
  }

  const { error: genError } = await supabase.rpc('generate_reminders')
  if (genError) return Response.json({ error: genError.message }, { status: 500 })

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, profile_id, title, body, profile:profiles!inner(full_name, email_reminders)')
    .is('emailed_at', null)
    .in('kind', EMAIL_KINDS)
    .gte('created_at', since)
    .eq('profile.email_reminders', true)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const byProfile = new Map<string, Pending[]>()
  for (const n of (data ?? []) as unknown as Pending[]) {
    byProfile.set(n.profile_id, [...(byProfile.get(n.profile_id) ?? []), n])
  }

  let sent = 0
  const failures: string[] = []
  for (const [profileId, items] of byProfile) {
    const { data: userData } = await supabase.auth.admin.getUserById(profileId)
    const email = userData.user?.email
    if (!email) continue

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: email,
        subject: items.length === 1 ? items[0].title : `You have ${items.length} updates on Adunni`,
        html: renderEmail(items[0].profile.full_name, items),
      }),
    })

    if (!res.ok) {
      failures.push(`${email}: ${await res.text()}`)
      continue
    }

    await supabase
      .from('notifications')
      .update({ emailed_at: new Date().toISOString() })
      .in('id', items.map((n) => n.id))
    sent++
  }

  return Response.json({ sent, failures })
})
