// GET /api/admin/packages — all packages, tiers, and add-ons (incl. inactive),
// for the admin pricing editor.
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { getAdmin } from '@/lib/auth.js';
import { tierPrices } from '@/lib/packages.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(request) {
  if (!getAdmin(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401, ...noStore });
  try {
    const packages = await sql`SELECT id, slug, name, coordination_pct, incidental_pct FROM packages ORDER BY sort, id`;
    const tiers = (await sql`SELECT to_jsonb(t) AS t FROM package_tiers t ORDER BY t.min_guests`).map((r) => r.t);
    const addons = await sql`SELECT slug, name, description, price, pricing, active FROM package_addons ORDER BY sort, id`;
    const withTiers = packages.map((p) => ({
      slug: p.slug, name: p.name,
      coordinationPct: Number(p.coordination_pct), incidentalPct: Number(p.incidental_pct),
      tiers: tiers.filter((t) => t.package_id === p.id).map(tierPrices),
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
