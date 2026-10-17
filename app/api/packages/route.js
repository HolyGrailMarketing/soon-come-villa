// GET /api/packages — active wedding packages (+ tiers) and active add-ons.
// Drives the /packages page; prices are server-driven.
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { tierPrices } from '@/lib/packages.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET() {
  try {
    const packages = await sql`
      SELECT id, slug, name, tagline, catering_desc, highlights,
             coordination_pct, incidental_pct
        FROM packages WHERE active = true ORDER BY sort, id`;
    // to_jsonb(t) so price_low/price_high are read when db/packages_brochure.sql
    // has added them, and fall back to venue_cost before it has.
    const tiers = (await sql`SELECT to_jsonb(t) AS t FROM package_tiers t ORDER BY t.min_guests`).map((r) => r.t);
    const addons = await sql`
      SELECT slug, name, description, price, pricing
        FROM package_addons WHERE active = true ORDER BY sort, id`;

    const withTiers = packages.map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      catering_desc: p.catering_desc,
      highlights: p.highlights,
      coordination_pct: Number(p.coordination_pct),
      incidental_pct: Number(p.incidental_pct),
      tiers: tiers
        .filter((t) => t.package_id === p.id)
        .map(tierPrices),
    }));

    return NextResponse.json({
      packages: withTiers,
      addons: addons.map((a) => ({ slug: a.slug, name: a.name, description: a.description, price: Number(a.price), pricing: a.pricing })),
    }, noStore);
  } catch (err) {
    console.error('packages error', err);
    return NextResponse.json({ error: 'failed to load packages' }, { status: 500, ...noStore });
  }
}
