// POST /api/admin/set-rate { unit, nightlyRate?, flatDayRate? }
// Updates server-driven pricing (notably the ballroom flat day rate).
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { getAdmin } from '@/lib/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });

export async function POST(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);

  let unit, nightlyRate, flatDayRate;
  try { ({ unit, nightlyRate, flatDayRate } = await request.json()); }
  catch { return json({ error: 'invalid body' }, 400); }
  if (!unit) return json({ error: 'unit required' }, 400);

  const nightly = nightlyRate === undefined || nightlyRate === null || nightlyRate === ''
    ? null : Number(nightlyRate);
  const flat = flatDayRate === undefined || flatDayRate === null || flatDayRate === ''
    ? null : Number(flatDayRate);

  if (nightly !== null && (Number.isNaN(nightly) || nightly < 0)) {
    return json({ error: 'invalid nightlyRate' }, 400);
  }
  if (flat !== null && (Number.isNaN(flat) || flat < 0)) {
    return json({ error: 'invalid flatDayRate' }, 400);
  }
  if (nightly === null && flat === null) {
    return json({ error: 'provide nightlyRate or flatDayRate' }, 400);
  }

  try {
    const rows = await sql`
      UPDATE units
         SET nightly_rate  = COALESCE(${nightly}::numeric,  nightly_rate),
             flat_day_rate = COALESCE(${flat}::numeric,     flat_day_rate)
       WHERE slug = ${unit}
      RETURNING slug, nightly_rate, flat_day_rate`;
    if (!rows[0]) return json({ error: 'unit not found' }, 404);
    return json({ ok: true, unit: rows[0] });
  } catch (err) {
    console.error('set-rate error', err);
    return json({ error: 'set-rate failed' }, 500);
  }
}
