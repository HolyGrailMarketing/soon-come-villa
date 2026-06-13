// GET /api/booking/:order_id — confirmation page polls this.
// The unguessable order_id acts as the bearer token; no other auth.
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(request, { params }) {
  const orderId = params?.order_id;
  if (!orderId) return NextResponse.json({ error: 'missing order id' }, { status: 400, ...noStore });

  try {
    const rows = await sql`
      SELECT dimepay_order_id, unit_slug, kind, check_in, check_out, guests,
             first_name, last_name, currency, amount, status
        FROM bookings
       WHERE dimepay_order_id = ${orderId}`;
    const b = rows[0];
    if (!b) return NextResponse.json({ error: 'not found' }, { status: 404, ...noStore });

    return NextResponse.json({
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
    }, noStore);
  } catch (err) {
    console.error('booking lookup error', err);
    return NextResponse.json({ error: 'lookup failed' }, { status: 500, ...noStore });
  }
}
