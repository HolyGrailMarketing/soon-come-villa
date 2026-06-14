// POST /api/packages/quote — submit a wedding quote request (no payment).
// The estimate is recomputed server-side from the DB; client numbers are ignored.
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { computeEstimate } from '@/lib/packages.js';
import { sendEmail } from '@/lib/email.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const jmd = (n) => 'J$' + Math.round(Number(n) || 0).toLocaleString();

function makeRef() {
  return 'SCV-' + crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
}

// Fire-and-forget notification emails (best-effort; never block/fail the quote).
async function notify({ ref, pkgSlug, tier, g, eventDate, est, contact, specialRequests }) {
  const rows = est.addonLines.map((l) => `<tr><td>${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''}</td><td align="right">${jmd(l.line)}</td></tr>`).join('');
  const summary = `
    <h2>Wedding quote request — ${ref}</h2>
    <p><strong>${contact.firstName} ${contact.lastName}</strong> · ${contact.email}${contact.phone ? ` · ${contact.phone}` : ''}</p>
    <p>Package: <strong>${pkgSlug}</strong> · Tier: ${tier.label} · Guests: ${g} · Date: ${eventDate || '—'}</p>
    <table cellpadding="6" style="border-collapse:collapse;width:100%;max-width:480px">
      <tr><td>Venue</td><td align="right">${jmd(est.venue)}</td></tr>
      <tr><td>Coordination (35%)</td><td align="right">${jmd(est.coordination)}</td></tr>
      <tr><td>Refundable incidental (20%)</td><td align="right">${jmd(est.incidental)}</td></tr>
      ${rows}
      <tr><td><strong>Estimated total</strong></td><td align="right"><strong>${jmd(est.estimateTotal)}</strong></td></tr>
    </table>
    <p>+ Catering quoted separately: ${jmd(tier.catering_low)} – ${jmd(tier.catering_high)}</p>
    ${specialRequests ? `<p><em>Special requests:</em> ${specialRequests}</p>` : ''}`;

  const adminTo = process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  const tasks = [];
  if (adminTo) tasks.push(sendEmail({ to: adminTo, replyTo: contact.email, subject: `New wedding quote ${ref} — ${contact.firstName} ${contact.lastName}`, html: summary }));
  // Guest confirmation (needs a verified sending domain on Resend to reach arbitrary inboxes).
  tasks.push(sendEmail({
    to: contact.email,
    subject: `We received your wedding quote request (${ref}) — Soon Come Villa`,
    html: `<p>Hi ${contact.firstName},</p><p>Thank you for your interest in a wedding at Soon Come Villa. We’ve received your request (<strong>${ref}</strong>) and our team will reach out shortly with a detailed quote.</p>${summary}<p>A 50% deposit secures your date; the balance is due one month before the event.</p>`,
  }));
  await Promise.allSettled(tasks);
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid body' }, 400); }

  const { package: pkgSlug, tierLabel, guests, eventDate, firstName, lastName, email, phone, specialRequests } = body;
  const selected = Array.isArray(body.addons) ? body.addons : [];

  if (!pkgSlug || !tierLabel) return json({ error: 'package and tier are required' }, 400);
  if (!firstName || !lastName || !email) return json({ error: 'name and email are required' }, 400);
  if (eventDate && !YMD.test(eventDate)) return json({ error: 'invalid event date' }, 400);

  try {
    const pkgRows = await sql`SELECT id, coordination_pct, incidental_pct FROM packages WHERE slug = ${pkgSlug} AND active = true`;
    const pkg = pkgRows[0];
    if (!pkg) return json({ error: 'unknown package' }, 400);

    const tierRows = await sql`
      SELECT label, min_guests, max_guests, venue_cost, catering_low, catering_high
        FROM package_tiers WHERE package_id = ${pkg.id} AND label = ${tierLabel}`;
    const tier = tierRows[0];
    if (!tier) return json({ error: 'unknown tier' }, 400);

    const g = parseInt(guests, 10) || tier.min_guests;

    // Resolve selected add-ons against the DB (active only); ignore unknown slugs.
    let resolved = [];
    if (selected.length) {
      const slugs = selected.map((s) => s.slug).filter(Boolean);
      const rows = slugs.length
        ? await sql`SELECT slug, name, price, pricing FROM package_addons WHERE slug = ANY(${slugs}) AND active = true`
        : [];
      const qtyBySlug = Object.fromEntries(selected.map((s) => [s.slug, s.qty]));
      resolved = rows.map((a) => ({ slug: a.slug, name: a.name, price: Number(a.price), pricing: a.pricing, qty: qtyBySlug[a.slug] }));
    }

    const est = computeEstimate({
      venueCost: Number(tier.venue_cost),
      coordinationPct: Number(pkg.coordination_pct),
      incidentalPct: Number(pkg.incidental_pct),
      guests: g,
      addons: resolved,
    });

    const ref = makeRef();
    await sql`
      INSERT INTO quote_requests
        (ref, package_slug, tier_label, guests, event_date, currency, venue_cost,
         coordination_amt, incidental_amt, addons, addons_total, estimate_total,
         catering_low, catering_high, first_name, last_name, email, phone, special_requests)
      VALUES
        (${ref}, ${pkgSlug}, ${tier.label}, ${g}, ${eventDate || null}, 'JMD', ${est.venue},
         ${est.coordination}, ${est.incidental}, ${JSON.stringify(est.addonLines)}::jsonb, ${est.addonsTotal}, ${est.estimateTotal},
         ${tier.catering_low}, ${tier.catering_high}, ${firstName}, ${lastName}, ${email}, ${phone || null}, ${specialRequests || null})`;

    // Best-effort notification emails — never block or fail the request on email errors.
    try {
      await notify({
        ref, pkgSlug, tier, g, eventDate, est,
        contact: { firstName, lastName, email, phone }, specialRequests,
      });
    } catch (e) { console.error('quote notify failed', e.message); }

    return json({ ref, estimateTotal: est.estimateTotal, currency: 'JMD' });
  } catch (err) {
    console.error('quote error', err);
    return json({ error: 'could not submit quote request' }, 500);
  }
}
