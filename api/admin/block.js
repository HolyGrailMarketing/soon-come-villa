// POST   /api/admin/block  { unit, from, to, reason }  -> create block(s)
// DELETE /api/admin/block?id=<id>                       -> remove a block
// GET    /api/admin/block                               -> list blocks
//
// Blocking the villa expands to all four rooms. `unit` may be a room slug,
// 'ballroom', or 'entire-villa'. Range is [from, to) (half-open).
import { sql } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { ROOM_IDS } from '../_lib/availability.js';
import { sendJson, readJson, methodGuard } from '../_lib/http.js';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function physicalUnits(unit) {
  if (unit === 'entire-villa') return ROOM_IDS;
  if (unit === 'ballroom' || ROOM_IDS.includes(unit)) return [unit];
  return null;
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return;
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const blocks = await sql`
        SELECT id, unit_id, lower(block_range) AS from, upper(block_range) AS to, reason, created_at
          FROM blocked_dates ORDER BY lower(block_range) DESC LIMIT 500`;
      return sendJson(res, 200, { blocks });
    }

    if (req.method === 'DELETE') {
      const { searchParams } = new URL(req.url, 'http://localhost');
      const id = searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: 'id required' });
      await sql`DELETE FROM blocked_dates WHERE id = ${id}`;
      return sendJson(res, 200, { ok: true });
    }

    // POST
    const { unit, from, to, reason } = await readJson(req);
    const units = unit ? physicalUnits(unit) : null;
    if (!units) return sendJson(res, 400, { error: 'unknown unit' });
    if (!YMD.test(from || '') || !YMD.test(to || '') || to <= from) {
      return sendJson(res, 400, { error: 'valid from/to required' });
    }
    const range = `[${from},${to})`;
    const created = [];
    for (const u of units) {
      const rows = await sql`
        INSERT INTO blocked_dates (unit_id, block_range, reason)
        VALUES (${u}, ${range}::daterange, ${reason || null})
        RETURNING id`;
      created.push(rows[0].id);
    }
    sendJson(res, 200, { ok: true, ids: created });
  } catch (err) {
    console.error('block error', err);
    sendJson(res, 500, { error: 'block failed' });
  }
}
