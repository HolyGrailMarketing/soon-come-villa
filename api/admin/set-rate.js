// POST /api/admin/set-rate { unit, nightlyRate?, flatDayRate? }
// Updates server-driven pricing (notably the ballroom flat day rate).
import { sql } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { sendJson, readJson, methodGuard } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  if (!requireAdmin(req, res)) return;

  const { unit, nightlyRate, flatDayRate } = await readJson(req);
  if (!unit) return sendJson(res, 400, { error: 'unit required' });

  const nightly = nightlyRate === undefined || nightlyRate === null || nightlyRate === ''
    ? null : Number(nightlyRate);
  const flat = flatDayRate === undefined || flatDayRate === null || flatDayRate === ''
    ? null : Number(flatDayRate);

  if (nightly !== null && (Number.isNaN(nightly) || nightly < 0)) {
    return sendJson(res, 400, { error: 'invalid nightlyRate' });
  }
  if (flat !== null && (Number.isNaN(flat) || flat < 0)) {
    return sendJson(res, 400, { error: 'invalid flatDayRate' });
  }
  if (nightly === null && flat === null) {
    return sendJson(res, 400, { error: 'provide nightlyRate or flatDayRate' });
  }

  try {
    const rows = await sql`
      UPDATE units
         SET nightly_rate  = COALESCE(${nightly}::numeric,  nightly_rate),
             flat_day_rate = COALESCE(${flat}::numeric,     flat_day_rate)
       WHERE slug = ${unit}
      RETURNING slug, nightly_rate, flat_day_rate`;
    if (!rows[0]) return sendJson(res, 404, { error: 'unit not found' });
    sendJson(res, 200, { ok: true, unit: rows[0] });
  } catch (err) {
    console.error('set-rate error', err);
    sendJson(res, 500, { error: 'set-rate failed' });
  }
}
