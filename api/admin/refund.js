// GET  /api/admin/refund?id=<uuid>           -> preview computed refund (no money)
// POST /api/admin/refund { id, forceMajeure?, override?, reason? } -> execute
//
// Execution: compute via the tiered policy (or admin override), call DimePay
// PUT /payments/refund, mark the booking refunded, record a refund payment row,
// and free the occupancy.
import { sql, tx } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { refundPayment } from '../_lib/dimepay.js';
import { computeRefund } from '../_lib/refund-policy.js';
import { sendJson, readJson, methodGuard } from '../_lib/http.js';

function toYMD(d) {
  return typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['GET', 'POST'])) return;
  if (!requireAdmin(req, res)) return;

  const isPreview = req.method === 'GET';
  let id, forceMajeure, override, reason;
  if (isPreview) {
    const { searchParams } = new URL(req.url, 'http://localhost');
    id = searchParams.get('id');
    forceMajeure = searchParams.get('forceMajeure') === 'true';
  } else {
    ({ id, forceMajeure, override, reason } = await readJson(req));
  }
  if (!id) return sendJson(res, 400, { error: 'booking id required' });

  try {
    const rows = await sql`SELECT * FROM bookings WHERE id = ${id}`;
    const b = rows[0];
    if (!b) return sendJson(res, 404, { error: 'not found' });

    const computed = computeRefund({
      checkIn: toYMD(b.check_in),
      amountPaid: Number(b.amount),
      today: new Date(),
      forceMajeure: !!forceMajeure,
    });

    if (isPreview) {
      return sendJson(res, 200, { booking: { id: b.id, amount: Number(b.amount), status: b.status }, computed });
    }

    // ---- execute ----
    if (b.status !== 'paid') return sendJson(res, 409, { error: `booking is ${b.status}, not paid` });
    if (!b.dimepay_txn_id) return sendJson(res, 409, { error: 'no transaction to refund' });

    // Admin override (audited), capped at the amount actually paid.
    let amount = computed.amount;
    let reasonNote = computed.reason;
    if (override != null && override !== '') {
      const o = Number(override);
      if (Number.isNaN(o) || o < 0 || o > Number(b.amount)) {
        return sendJson(res, 400, { error: `override must be 0–${b.amount}` });
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

    sendJson(res, 200, { ok: true, refunded: amount, reason: reasonNote });
  } catch (err) {
    console.error('refund error', err);
    const msg = err.status ? `gateway error (${err.status})` : 'refund failed';
    sendJson(res, 502, { error: msg });
  }
}
