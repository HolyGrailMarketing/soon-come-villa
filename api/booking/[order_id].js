// GET /api/booking/:order_id — confirmation page polls this.
// The unguessable order_id acts as the bearer token; no other auth.
import { sql } from '../_lib/db.js';
import { sendJson, methodGuard } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['GET'])) return;

  const { searchParams, pathname } = new URL(req.url, 'http://localhost');
  // Vercel provides the param via query; fall back to the path segment.
  const orderId = (req.query && req.query.order_id) ||
    searchParams.get('order_id') ||
    decodeURIComponent(pathname.split('/').pop() || '');

  if (!orderId) return sendJson(res, 400, { error: 'missing order id' });

  try {
    const rows = await sql`
      SELECT dimepay_order_id, unit_slug, kind, check_in, check_out, guests,
             first_name, last_name, currency, amount, status
        FROM bookings
       WHERE dimepay_order_id = ${orderId}`;
    const b = rows[0];
    if (!b) return sendJson(res, 404, { error: 'not found' });

    sendJson(res, 200, {
      order_id: b.dimepay_order_id,
      unit: b.unit_slug,
      kind: b.kind,
      checkIn: b.check_in,
      checkOut: b.check_out,
      guests: b.guests,
      firstName: b.first_name,
      lastName: b.last_name,
      currency: b.currency,
      amount: Number(b.amount),
      status: b.status,
    });
  } catch (err) {
    console.error('booking lookup error', err);
    sendJson(res, 500, { error: 'lookup failed' });
  }
}
