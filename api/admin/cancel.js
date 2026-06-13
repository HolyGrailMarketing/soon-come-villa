// POST /api/admin/cancel  { id, reason? }
// Marks a booking cancelled and frees its occupancy. No money movement —
// use /api/admin/refund to also return funds.
import { sql, tx } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { sendJson, readJson, methodGuard } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  if (!requireAdmin(req, res)) return;

  const { id, reason } = await readJson(req);
  if (!id) return sendJson(res, 400, { error: 'booking id required' });

  try {
    const rows = await sql`SELECT id, status FROM bookings WHERE id = ${id}`;
    const b = rows[0];
    if (!b) return sendJson(res, 404, { error: 'not found' });
    if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'expired') {
      return sendJson(res, 409, { error: `already ${b.status}` });
    }

    await tx(async (client) => {
      await client.query(
        `UPDATE bookings
            SET status = 'cancelled',
                notes = COALESCE(notes,'') || $2,
                updated_at = now()
          WHERE id = $1`,
        [id, reason ? `\n[cancelled] ${reason}` : '\n[cancelled]']
      );
      await client.query(`DELETE FROM occupancy WHERE booking_id = $1`, [id]);
    });
    sendJson(res, 200, { ok: true, status: 'cancelled' });
  } catch (err) {
    console.error('cancel error', err);
    sendJson(res, 500, { error: 'cancel failed' });
  }
}
