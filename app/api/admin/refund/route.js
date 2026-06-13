// GET  /api/admin/refund?id=<uuid>           -> preview computed refund (no money)
// POST /api/admin/refund { id, forceMajeure?, override?, reason? } -> execute
//
// Execution: compute via the tiered policy (or admin override), call DimePay
// PUT /payments/refund, mark the booking refunded, record a refund payment row,
// and free the occupancy.
import { NextResponse } from 'next/server';
import { sql, tx } from '@/lib/db.js';
import { getAdmin } from '@/lib/auth.js';
import { refundPayment } from '@/lib/dimepay.js';
import { computeRefund } from '@/lib/refund-policy.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });

function toYMD(d) {
  return typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
}

export async function GET(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const forceMajeure = searchParams.get('forceMajeure') === 'true';
  if (!id) return json({ error: 'booking id required' }, 400);

  try {
    const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
    const b = rows[0];
    if (!b) return json({ error: 'not found' }, 404);
    const computed = computeRefund({
      checkIn: toYMD(b.check_in),
      amountPaid: Number(b.amount),
      today: new Date(),
      forceMajeure,
    });
    return json({ booking: { id: b.id, amount: Number(b.amount), status: b.status }, computed });
  } catch (err) {
    console.error('refund preview error', err);
    return json({ error: 'refund failed' }, 500);
  }
}

export async function POST(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);
  let id, forceMajeure, override, reason;
  try { ({ id, forceMajeure, override, reason } = await request.json()); }
  catch { return json({ error: 'invalid body' }, 400); }
  if (!id) return json({ error: 'booking id required' }, 400);

  try {
    const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
    const b = rows[0];
    if (!b) return json({ error: 'not found' }, 404);

    const computed = computeRefund({
      checkIn: toYMD(b.check_in),
      amountPaid: Number(b.amount),
      today: new Date(),
      forceMajeure: !!forceMajeure,
    });

    if (b.status !== 'paid') return json({ error: `booking is ${b.status}, not paid` }, 409);
    if (!b.dimepay_txn_id) return json({ error: 'no transaction to refund' }, 409);

    // Admin override (audited), capped at the amount actually paid.
    let amount = computed.amount;
    let reasonNote = computed.reason;
    if (override != null && override !== '') {
      const o = Number(override);
      if (Number.isNaN(o) || o < 0 || o > Number(b.amount)) {
        return json({ error: `override must be 0–${b.amount}` }, 400);
      }
      amount = Math.round((o + Number.EPSILON) * 100) / 100;
      reasonNote = `override(${computed.reason})${reason ? ': ' + reason : ''}`;
    } else if (reason) {
      reasonNote = `${computed.reason}: ${reason}`;
    }

    // Call DimePay first; only persist if the gateway accepts the refund.
    let gateway;
    if (amount > 0) {
      gateway = await refundPayment({ txnId: b.dimepay_txn_id, amount, currency: b.currency });
    }

    await tx(async (client) => {
      await client.query(
        `UPDATE bookings
            SET status = 'refunded',
                notes = COALESCE(notes,'') || $2,
                updated_at = now()
          WHERE id = $1`,
        [id, `\n[refund ${amount} ${b.currency}] ${reasonNote}`]
      );
      await client.query(
        `INSERT INTO payments (booking_id, dimepay_txn_id, amount, currency, type, status, raw_webhook)
         VALUES ($1,$2,$3,$4,'refund','refunded',$5)`,
        [id, b.dimepay_txn_id, amount, b.currency, gateway ? JSON.stringify(gateway) : null]
      );
      await client.query(`DELETE FROM occupancy WHERE booking_id = $1`, [id]);
    });

    return json({ ok: true, refunded: amount, reason: reasonNote });
  } catch (err) {
    console.error('refund error', err);
    const msg = err.status ? `gateway error (${err.status})` : 'refund failed';
    return json({ error: msg }, 502);
  }
}
