// GET    /api/admin/block                               -> list blocks
// POST   /api/admin/block  { unit, from, to, reason }   -> create block(s)
// DELETE /api/admin/block?id=<id>                        -> remove a block
//
// Blocking the villa expands to all four rooms. `unit` may be a room slug,
// 'ballroom', or 'entire-villa'. Range is [from, to) (half-open).
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { getAdmin } from '@/lib/auth.js';
import { ROOM_IDS } from '@/lib/availability.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function physicalUnits(unit) {
  if (unit === 'entire-villa') return ROOM_IDS;
  if (unit === 'ballroom' || ROOM_IDS.includes(unit)) return [unit];
  return null;
}

export async function GET(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);
  try {
    const blocks = await sql`
      SELECT id, unit_id, lower(block_range) AS from, upper(block_range) AS to, reason, created_at
        FROM blocked_dates ORDER BY lower(block_range) DESC LIMIT 500`;
    return json({ blocks });
  } catch (err) {
    console.error('block list error', err);
    return json({ error: 'block failed' }, 500);
  }
}

export async function POST(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);
  let unit, from, to, reason;
  try { ({ unit, from, to, reason } = await request.json()); } catch { return json({ error: 'invalid body' }, 400); }

  const units = unit ? physicalUnits(unit) : null;
  if (!units) return json({ error: 'unknown unit' }, 400);
  if (!YMD.test(from || '') || !YMD.test(to || '') || to <= from) {
    return json({ error: 'valid from/to required' }, 400);
  }
  try {
    const range = `[${from},${to})`;
    const created = [];
    for (const u of units) {
      const rows = await sql`
        INSERT INTO blocked_dates (unit_id, block_range, reason)
        VALUES (${u}, ${range}::daterange, ${reason || null})
        RETURNING id`;
      created.push(rows[0].id);
    }
    return json({ ok: true, ids: created });
  } catch (err) {
    console.error('block create error', err);
    return json({ error: 'block failed' }, 500);
  }
}

export async function DELETE(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return json({ error: 'id required' }, 400);
  try {
    await sql`DELETE FROM blocked_dates WHERE id = ${id}`;
    return json({ ok: true });
  } catch (err) {
    console.error('block delete error', err);
    return json({ error: 'block failed' }, 500);
  }
}
