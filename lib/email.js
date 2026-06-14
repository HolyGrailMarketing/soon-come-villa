// Transactional email via Resend (https://resend.com) over its HTTP API — no
// extra dependency. Env-gated: if RESEND_API_KEY is not set, sends are skipped
// (logged) so app flows never fail because email isn't configured yet.
const RESEND_URL = 'https://api.resend.com/emails';

export async function sendEmail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Soon Come Villa <onboarding@resend.dev>';
  if (!key) {
    console.warn('email skipped (RESEND_API_KEY not set):', subject);
    return { skipped: true };
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error('email send failed', res.status, (await res.text()).slice(0, 300));
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (e) {
    console.error('email error', e.message);
    return { ok: false };
  }
}
