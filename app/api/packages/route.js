// GET /api/packages — active wedding packages (+ tiers) and active add-ons.
// Drives the /packages page; prices are server-driven.
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET() {
  try {
    const packages = await sql`
      SELECT id, slug, name, tagline, catering_desc, highlights,
             coordination_pct, incidental_pct
        FROM packages WHERE active = true ORDER BY sort, id`;
    const tiers = await sql`
      SELECT package_id, label, min_guests, max_guests, venue_cost, catering_low, catering_high
        FROM package_tiers ORDER BY min_guests`;
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
        .map((t) => ({
          label: t.label, minGuests: t.min_guests, maxGuests: t.max_guests,
          venueCost: Number(t.venue_cost),
          cateringLow: t.catering_low == null ? null : Number(t.catering_low),
          cateringHigh: t.catering_high == null ? null : Number(t.catering_high),
        })),
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
