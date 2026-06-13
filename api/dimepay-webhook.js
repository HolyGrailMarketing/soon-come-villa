// POST /api/dimepay-webhook — the SOURCE OF TRUTH for payment confirmation.
// Idempotent: re-posting the same event is a no-op. A booking is NEVER marked
// paid from the client onSuccess callback — only from a verified webhook here.
import { sql, tx } from './_lib/db.js';
import { fetchPayment } from './_lib/dimepay.js';
import { sendJson, readJson, methodGuard } from './_lib/http.js';

const PAID_STATES = new Set(['success', 'successful', 'paid', 'completed', 'approved']);

// Pull fields from a few plausible shapes (DimePay webhook schema is thin).
function extract(body) {
  const d = body?.data && typeof body.data === 'object' ? body.data : body;
  return {
    orderId: d.order_id || d.orderId || body.order_id,
    txnId: d.transaction_id || d.txn_id || d.transactionId || d.id,
    status: String(d.status || body.status || '').toLowerCase(),
    amount: d.amount != null ? Number(d.amount) : undefined,
    currency: d.currency || body.currency,
  };
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;

  let body;
  try { body = await readJson(req); } catch { return sendJson(res, 400, { error: 'invalid body' }); }
  const evt = extract(body);
  if (!evt.orderId) return sendJson(res, 400, { error: 'missing order_id' });

  try {
    const rows = await sql`SELECT * FROM bookings WHERE dimepay_order_id = ${evt.orderId}`;
    const booking = rows[0];
    if (!booking) {
      console.warn('webhook for unknown order_id', evt.orderId);
      return sendJson(res, 200, { ignored: 'unknown order' });
    }

    // Idempotent: already settled.
    if (booking.status === 'paid' || booking.status === 'refunded') {
      return sendJson(res, 200, { ok: true, status: booking.status });
    }

    // Defense-in-depth: prefer re-reading the payment from DimePay REST over
    // trusting the webhook body. Fall back to the body if REST is unavailable.
    let status = evt.status;
    let amount = evt.amount;
    let txnId = evt.txnId;
    if (txnId) {
      try {
        const remote = await fetchPayment(txnId);
        const r = extract(remote);
        if (r.status) status = r.status;
        if (r.amount != null) amount = r.amount;
      } catch (e) {
        console.warn('payment re-fetch failed; using webhook body', e.message);
      }
    }

    if (!PAID_STATES.has(status)) {
      // Not a success event (could be pending/failed) — acknowledge, do nothing.
      return sendJson(res, 200, { ok: true, status });
    }

    // Verify the amount matches what we charged. Mismatch = do NOT mark paid.
    if (amount != null && Math.abs(amount - Number(booking.amount)) > 0.01) {
      console.error('webhook amount mismatch', {
        order: evt.orderId, expected: booking.amount, got: amount,
      });
      return sendJson(res, 200, { ignored: 'amount mismatch' });
    }

    await tx(async (client) => {
      await client.query(
        `UPDATE bookings
            SET status = 'paid', dimepay_txn_id = $2, hold_expires_at = NULL,
                updated_at = now()
          WHERE id = $1 AND status = 'pending'`,
        [booking.id, txnId || null]
      );
      // Idempotent insert (partial unique index on (booking_id, txn) for charges).
      await client.query(
        `INSERT INTO payments (booking_id, dimepay_txn_id, amount, currency, type, status, raw_webhook)
         VALUES ($1,$2,$3,$4,'charge','paid',$5)
         ON CONFLICT (booking_id, dimepay_txn_id) WHERE type = 'charge' DO NOTHING`,
        [booking.id, txnId || null, booking.amount, booking.currency, JSON.stringify(body)]
      );
    });

    return sendJson(res, 200, { ok: true, status: 'paid' });
  } catch (err) {
    console.error('webhook error', err);
    return sendJson(res, 500, { error: 'webhook processing failed' });
  }
}
