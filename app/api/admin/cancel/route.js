// POST /api/admin/cancel  { id, reason? }
// Marks a booking cancelled and frees its occupancy. No money movement —
// use /api/admin/refund to also return funds.
import { NextResponse } from 'next/server';
import { sql, tx } from '@/lib/db.js';
import { getAdmin } from '@/lib/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });

export async function POST(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);

  let id, reason;
  try { ({ id, reason } = await request.json()); } catch { return json({ error: 'invalid body' }, 400); }
  if (!id) return json({ error: 'booking id required' }, 400);

  try {
    const rows = await sql`SELECT id, status FROM bookings WHERE id = ${id}`;
    const b = rows[0];
    if (!b) return json({ error: 'not found' }, 404);
    if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'expired') {
      return json({ error: `already ${b.status}` }, 409);
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
    return json({ ok: true, status: 'cancelled' });
  } catch (err) {
    console.error('cancel error', err);
    return json({ error: 'cancel failed' }, 500);
  }
}
