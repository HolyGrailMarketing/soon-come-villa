// GET /api/admin/bookings            -> list (filters: ?status=&unit=&from=&to=)
// GET /api/admin/bookings?id=<uuid>  -> single booking + its payments
import { sql } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { sendJson, methodGuard } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['GET'])) return;
  if (!requireAdmin(req, res)) return;

  const { searchParams } = new URL(req.url, 'http://localhost');
  const id = searchParams.get('id');

  try {
    if (id) {
      const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
      if (!rows[0]) return sendJson(res, 404, { error: 'not found' });
      const payments = await sql`
        SELECT id, dimepay_txn_id, amount, currency, type, status, created_at
          FROM payments WHERE booking_id = ${id} ORDER BY created_at`;
      return sendJson(res, 200, { booking: rows[0], payments });
    }

    const status = searchParams.get('status');
    const unit = searchParams.get('unit');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const bookings = await sql`
      SELECT id, unit_slug, kind, check_in, check_out, guests,
             first_name, last_name, email, phone, currency, amount, status,
             dimepay_order_id, created_at
        FROM bookings
       WHERE (${status}::text IS NULL OR status = ${status})
         AND (${unit}::text IS NULL OR unit_slug = ${unit})
         AND (${from}::date IS NULL OR check_in >= ${from}::date)
         AND (${to}::date   IS NULL OR check_in <= ${to}::date)
       ORDER BY created_at DESC
       LIMIT 500`;
    sendJson(res, 200, { bookings });
  } catch (err) {
    console.error('admin bookings error', err);
    sendJson(res, 500, { error: 'failed to load bookings' });
  }
}
