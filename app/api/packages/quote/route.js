// POST /api/packages/quote — submit a wedding quote request (no payment).
// The estimate is recomputed server-side from the DB; client numbers are ignored.
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { computeEstimate, tierPrices } from '@/lib/packages.js';
import { sendEmail } from '@/lib/email.js';
import { brandedEmail } from '@/lib/email-template.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const jmd = (n) => 'J$' + Math.round(Number(n) || 0).toLocaleString();
const jmdRange = ({ low, high }) => (low === high ? jmd(low) : `${jmd(low)} – ${jmd(high)}`);
const pct = (p) => `${Math.round(Number(p) * 100)}%`;

function makeRef() {
  return 'SCV-' + crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
}

// Fire-and-forget notification emails (best-effort; never block/fail the quote).
async function notify({ ref, pkgSlug, pkg, tier, g, eventDate, est, contact, specialRequests }) {
  const pkgName = pkgSlug.charAt(0).toUpperCase() + pkgSlug.slice(1);
  const detailRows = [
    ['Package', pkgName],
    ['Guest tier', `${tier.label} (${g} guests)`],
    ['Event date', eventDate || 'To be confirmed'],
    ['Package', jmdRange(est.pkg)],
    [`Coordination & professional services (${pct(pkg.coordination_pct)})`, jmdRange(est.coordination)],
    [`Refundable incidental (${pct(pkg.incidental_pct)})`, jmdRange(est.incidental)],
    ...est.addonLines.map((l) => [`${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''}`, jmd(l.line)]),
    ['Estimated total', jmdRange(est.total)],
    ...(pkg.catering_desc ? [['Includes', pkg.catering_desc]] : []),
  ];
  const base = process.env.PUBLIC_BASE_URL || 'https://sooncomevilla.com';
  const adminTo = process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  const tasks = [];

  if (adminTo) {
    tasks.push(sendEmail({
      to: adminTo, replyTo: contact.email,
      subject: `New wedding quote ${ref} — ${contact.firstName} ${contact.lastName}`,
      html: brandedEmail({
        preheader: `${pkgName} · ${jmdRange(est.total)} estimate`,
        heading: 'New wedding quote request',
        intro: `<strong>${contact.firstName} ${contact.lastName}</strong> requested a quote.<br>${contact.email}${contact.phone ? ` &middot; ${contact.phone}` : ''} &middot; Ref ${ref}`,
        detailRows,
        note: specialRequests ? `<strong>Special requests:</strong> ${specialRequests}` : undefined,
        cta: { text: 'Open admin dashboard', url: `${base}/admin` },
      }),
    }));
  }
  tasks.push(sendEmail({
    to: contact.email,
    subject: `We received your wedding quote request (${ref}) — Soon Come Villa`,
    html: brandedEmail({
      preheader: 'Thank you — our team will be in touch shortly.',
      heading: `Thank you, ${contact.firstName}!`,
      intro: `We’ve received your request for a <strong>${pkgName}</strong> wedding (reference <strong>${ref}</strong>). Our team will reach out shortly with a detailed quote.`,
      detailRows,
      note: 'This is an estimate, not a charge. Your final price depends on your menu choices; we’ll send a pro forma invoice, and a 50% deposit secures your date. The balance is due one month before the event.',
      cta: { text: 'Explore packages', url: `${base}/packages` },
    }),
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
    const pkgRows = await sql`SELECT id, coordination_pct, incidental_pct, catering_desc FROM packages WHERE slug = ${pkgSlug} AND active = true`;
    const pkg = pkgRows[0];
    if (!pkg) return json({ error: 'unknown package' }, 400);

    const tierRows = await sql`
      SELECT to_jsonb(t) AS t FROM package_tiers t WHERE t.package_id = ${pkg.id} AND t.label = ${tierLabel}`;
    if (!tierRows[0]) return json({ error: 'unknown tier' }, 400);
    const tier = tierPrices(tierRows[0].t);

    const g = parseInt(guests, 10) || tier.minGuests;

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
      priceLow: tier.priceLow,
      priceHigh: tier.priceHigh,
      coordinationPct: Number(pkg.coordination_pct),
      incidentalPct: Number(pkg.incidental_pct),
      guests: g,
      addons: resolved,
    });

    // The amount columns hold the low end of the range; estimate_high the top.
    const ref = makeRef();
    await sql`
      INSERT INTO quote_requests
        (ref, package_slug, tier_label, guests, event_date, currency, venue_cost,
         coordination_amt, incidental_amt, addons, addons_total, estimate_total,
         first_name, last_name, email, phone, special_requests)
      VALUES
        (${ref}, ${pkgSlug}, ${tier.label}, ${g}, ${eventDate || null}, 'JMD', ${est.pkg.low},
         ${est.coordination.low}, ${est.incidental.low}, ${JSON.stringify(est.addonLines)}::jsonb, ${est.addonsTotal}, ${est.total.low},
         ${firstName}, ${lastName}, ${email}, ${phone || null}, ${specialRequests || null})`;
    // estimate_high only exists once db/packages_brochure.sql has run.
    try {
      await sql`UPDATE quote_requests SET estimate_high = ${est.total.high} WHERE ref = ${ref}`;
    } catch (e) { console.error('quote estimate_high not saved', e.message); }

    // Best-effort notification emails — never block or fail the request on email errors.
    try {
      await notify({
        ref, pkgSlug, pkg, tier, g, eventDate, est,
        contact: { firstName, lastName, email, phone }, specialRequests,
      });
    } catch (e) { console.error('quote notify failed', e.message); }

    return json({ ref, estimate: est.total, currency: 'JMD' });
  } catch (err) {
    console.error('quote error', err);
    return json({ error: 'could not submit quote request' }, 500);
  }
}
