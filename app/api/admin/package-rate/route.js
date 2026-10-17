// POST /api/admin/package-rate — owner-managed package pricing.
//   Add-on: { addon: <slug>, price?, active? }
//   Tier:   { package: <slug>, tier: <label>, priceLow?, priceHigh? }  (needs db/packages_brochure.sql)
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { getAdmin } from '@/lib/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

export async function POST(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'invalid body' }, 400); }

  try {
    // --- Add-on price / activation ---
    if (b.addon) {
      const price = num(b.price);
      const active = typeof b.active === 'boolean' ? b.active : null;
      if (price !== null && (Number.isNaN(price) || price < 0)) return json({ error: 'invalid price' }, 400);
      const rows = await sql`
        UPDATE package_addons
           SET price  = COALESCE(${price}::numeric, price),
               active = COALESCE(${active}::boolean, active)
         WHERE slug = ${b.addon}
        RETURNING slug, price, active`;
      if (!rows[0]) return json({ error: 'add-on not found' }, 404);
      return json({ ok: true, addon: rows[0] });
    }

    // --- Tier package price range ---
    if (b.package && b.tier) {
      const low = num(b.priceLow), high = num(b.priceHigh);
      for (const [k, v] of Object.entries({ priceLow: low, priceHigh: high })) {
        if (v !== null && (Number.isNaN(v) || v < 0)) return json({ error: `invalid ${k}` }, 400);
      }
      if (low !== null && high !== null && high < low) return json({ error: 'priceHigh is below priceLow' }, 400);
      // venue_cost mirrors price_low (see db/packages_brochure.sql).
      const rows = await sql`
        UPDATE package_tiers t
           SET price_low  = COALESCE(${low}::numeric,  t.price_low),
               price_high = COALESCE(${high}::numeric, t.price_high),
               venue_cost = COALESCE(${low}::numeric,  t.venue_cost)
          FROM packages p
         WHERE t.package_id = p.id AND p.slug = ${b.package} AND t.label = ${b.tier}
        RETURNING t.label, t.price_low, t.price_high`;
      if (!rows[0]) return json({ error: 'tier not found' }, 404);
      return json({ ok: true, tier: rows[0] });
    }

    return json({ error: 'specify an add-on or a package+tier' }, 400);
  } catch (err) {
    console.error('package-rate error', err);
    return json({ error: 'update failed' }, 500);
  }
}
