// GET /api/admin/bookings            -> list (filters: ?status=&unit=&from=&to=)
// GET /api/admin/bookings?id=<uuid>  -> single booking + its payments
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { getAdmin } from '@/lib/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const unauthorized = () => NextResponse.json({ error: 'unauthorized' }, { status: 401, ...noStore });

export async function GET(request) {
  if (!getAdmin(request)) return unauthorized();

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');

  try {
    if (id) {
      const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
      if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404, ...noStore });
      const payments = await sql`
        SELECT id, dimepay_txn_id, amount, currency, type, status, created_at
          FROM payments WHERE booking_id = ${id} ORDER BY created_at`;
      return NextResponse.json({ booking: rows[0], payments }, noStore);
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
    return NextResponse.json({ bookings }, noStore);
  } catch (err) {
    console.error('admin bookings error', err);
    return NextResponse.json({ error: 'failed to load bookings' }, { status: 500, ...noStore });
  }
}
