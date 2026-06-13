// GET /api/units — sellable units + live rates. Drives on-page price displays.
import { sql } from './_lib/db.js';
import { sendJson, methodGuard } from './_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['GET'])) return;
  try {
    const units = await sql`
      SELECT slug, name, kind, nightly_rate, flat_day_rate, min_nights, max_guests
        FROM units
       WHERE active = true
       ORDER BY
         CASE kind WHEN 'villa' THEN 0 WHEN 'room' THEN 1 ELSE 2 END,
         slug`;
    sendJson(res, 200, { units });
  } catch (err) {
    console.error('units error', err);
    sendJson(res, 500, { error: 'failed to load units' });
  }
}
