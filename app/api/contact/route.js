// POST /api/contact — general contact + RSVP form submissions (no payment).
// Emails the owner (reply-to the sender) + an acknowledgement to the sender.
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email.js';
import { brandedEmail } from '@/lib/email-template.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });
const esc = (s) => String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'invalid body' }, 400); }

  const type = (b.type || 'Contact').slice(0, 60);
  const firstName = (b.firstName || '').trim();
  const lastName = (b.lastName || '').trim();
  const email = (b.email || '').trim();
  if (!firstName || !email) return json({ error: 'name and email are required' }, 400);

  const detailRows = [
    ['Name', esc(`${firstName} ${lastName}`.trim())],
    ['Email', esc(email)],
    ...(b.phone ? [['Phone', esc(b.phone)]] : []),
    ...(b.guests ? [['Guests', esc(b.guests)]] : []),
  ];
  const base = process.env.PUBLIC_BASE_URL || 'https://sooncomevilla.com';
  const adminTo = process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  const tasks = [];

  if (adminTo) {
    tasks.push(sendEmail({
      to: adminTo, replyTo: email,
      subject: `${type} — ${firstName} ${lastName}`.trim(),
      html: brandedEmail({
        preheader: `${type} from ${firstName} ${lastName}`,
        heading: `New ${type.toLowerCase()} message`,
        intro: `You received a new <strong>${esc(type)}</strong> submission from <strong>${esc(firstName)} ${esc(lastName)}</strong>.`,
        detailRows,
        note: b.message ? `<strong>Message:</strong><br>${esc(b.message).replace(/\n/g, '<br>')}` : undefined,
      }),
    }));
  }
  // Acknowledgement to the sender.
  tasks.push(sendEmail({
    to: email,
    subject: 'Thank you for contacting Soon Come Villa',
    html: brandedEmail({
      preheader: 'We received your message and will be in touch shortly.',
      heading: `Thank you, ${esc(firstName)}!`,
      intro: 'We’ve received your message and a member of our team will get back to you shortly.',
      note: b.message ? `<strong>Your message:</strong><br>${esc(b.message).replace(/\n/g, '<br>')}` : undefined,
      cta: { text: 'Visit our website', url: base },
    }),
  }));

  try { await Promise.allSettled(tasks); } catch (e) { console.error('contact notify failed', e.message); }
  return json({ ok: true });
}
