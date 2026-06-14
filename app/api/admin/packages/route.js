// GET /api/admin/packages — all packages, tiers, and add-ons (incl. inactive),
// for the admin pricing editor.
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { getAdmin } from '@/lib/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(request) {
  if (!getAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401, ...noStore });
  try {
    const packages = await sql`SELECT id, slug, name FROM packages ORDER BY sort, id`;
    const tiers = await sql`SELECT package_id, label, venue_cost, catering_low, catering_high FROM package_tiers ORDER BY min_guests`;
    const addons = await sql`SELECT slug, name, description, price, pricing, active FROM package_addons ORDER BY sort, id`;
    const withTiers = packages.map((p) => ({
      slug: p.slug, name: p.name,
      tiers: tiers.filter((t) => t.package_id === p.id).map((t) => ({
        label: t.label, venueCost: Number(t.venue_cost),
        cateringLow: t.catering_low == null ? null : Number(t.catering_low),
        cateringHigh: t.catering_high == null ? null : Number(t.catering_high),
      })),
    }));
    return NextResponse.json({
      packages: withTiers,
      addons: addons.map((a) => ({ slug: a.slug, name: a.name, description: a.description, price: Number(a.price), pricing: a.pricing, active: a.active })),
    }, noStore);
  } catch (err) {
    console.error('admin packages error', err);
    return NextResponse.json({ error: 'failed to load packages' }, { status: 500, ...noStore });
  }
}
