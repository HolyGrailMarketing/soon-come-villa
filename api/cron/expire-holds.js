// GET /api/cron/expire-holds — Vercel Cron (every 10 min).
// Expires stale pending holds and frees their occupancy so the dates reopen.
// Guarded by CRON_SECRET (Vercel sends it as a Bearer token; we also accept a
// matching ?secret= for manual runs).
import { sql } from '../_lib/db.js';
import { sendJson, methodGuard } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['GET', 'POST'])) return;

  const secret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization || '';
  const { searchParams } = new URL(req.url, 'http://localhost');
  const provided = auth.replace(/^Bearer\s+/i, '') || searchParams.get('secret');
  if (secret && provided !== secret) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }

  try {
    // Expire the bookings first; occupancy rows cascade-delete via the FK.
    const expired = await sql`
      UPDATE bookings
         SET status = 'expired', updated_at = now()
       WHERE status = 'pending'
         AND hold_expires_at IS NOT NULL
         AND hold_expires_at <= now()
      RETURNING id`;
    const ids = expired.map((r) => r.id);
    if (ids.length) {
      await sql`DELETE FROM occupancy WHERE booking_id = ANY(${ids})`;
    }
    sendJson(res, 200, { expired: ids.length });
  } catch (err) {
    console.error('expire-holds error', err);
    sendJson(res, 500, { error: 'expire failed' });
  }
}
