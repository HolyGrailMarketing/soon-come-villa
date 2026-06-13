// GET /api/units — sellable units + live rates. Drives on-page price displays.
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET() {
  try {
    const units = await sql`
      SELECT slug, name, kind, nightly_rate, flat_day_rate, min_nights, max_guests
        FROM units
       WHERE active = true
       ORDER BY
         CASE kind WHEN 'villa' THEN 0 WHEN 'room' THEN 1 ELSE 2 END,
         slug`;
    return NextResponse.json({ units }, noStore);
  } catch (err) {
    console.error('units error', err);
    return NextResponse.json({ error: 'failed to load units' }, { status: 500, ...noStore });
  }
}
