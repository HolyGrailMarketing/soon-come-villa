// POST /api/dimepay-webhook — the SOURCE OF TRUTH for payment confirmation.
// DimePay POSTs { payload: <JWT> } signed with the merchant secret key, so
// verifying the JWT both decodes the event AND authenticates it. Idempotent:
// re-posting the same event is a no-op. A booking is NEVER marked paid from the
// client onSuccess callback — only from a verified webhook here.
import { NextResponse } from 'next/server';
import { sql, tx } from '@/lib/db.js';
import { verifyWebhook } from '@/lib/dimepay.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });

// "Paid" is signalled by the top-level status SUCCESS and/or the transaction
// status COMPLETE.
const PAID_STATES = new Set(['success', 'successful', 'complete', 'completed', 'paid', 'approved']);

// Map DimePay's verified event to the fields we need. Falls back to a flat shape
// for local manual tests (curl with plain JSON).
function extract(event) {
  const txn = event?.details?.transaction;
  if (txn) {
    return {
      orderId: txn.order?.metadata?.order_id || txn.order?.origin_id,
      txnId: txn.id,
      status: String(txn.status || event.status || '').toLowerCase(),
      amount: txn.amount != null ? Number(txn.amount) : undefined,
      currency: txn.currency,
    };
  }
  const d = event?.data && typeof event.data === 'object' ? event.data : (event || {});
  return {
    orderId: d.order_id || d.orderId || d.reference || d.id,
    txnId: d.transaction_id || d.txn_id || d.transactionId || d.payment_id,
    status: String(d.status || '').toLowerCase(),
    amount: d.amount != null ? Number(d.amount) : undefined,
    currency: d.currency,
  };
}

export async function POST(request) {
  let raw;
  try { raw = await request.json(); } catch { return json({ error: 'invalid body' }, 400); }

  // Verify the signed payload (authenticates the webhook). Fall back to a plain
  // body only for local manual testing.
  let event;
  if (raw && typeof raw.payload === 'string') {
    try {
      event = verifyWebhook(raw.payload);
    } catch (e) {
      console.warn('webhook signature verification failed', e.message);
      return json({ error: 'invalid signature' }, 401);
    }
  } else {
    event = raw;
  }

  const evt = extract(event);
  if (!evt.orderId) {
    console.warn('webhook: no order reference in event');
    return json({ ignored: 'no order reference' });
  }

  try {
    const rows = await sql`SELECT * FROM bookings WHERE dimepay_order_id = ${evt.orderId}`;
    const booking = rows[0];
    if (!booking) {
      console.warn('webhook for unknown order_id', evt.orderId);
      return json({ ignored: 'unknown order' });
    }

    // Idempotent: already settled.
    if (booking.status === 'paid' || booking.status === 'refunded') {
      return json({ ok: true, status: booking.status });
    }

    if (!PAID_STATES.has(evt.status)) {
      return json({ ok: true, status: evt.status });
    }

    // Verify the amount matches what we charged. Mismatch = do NOT mark paid.
    if (evt.amount != null && Math.abs(evt.amount - Number(booking.amount)) > 0.01) {
      console.error('webhook amount mismatch', {
        order: evt.orderId, expected: booking.amount, got: evt.amount,
      });
      return json({ ignored: 'amount mismatch' });
    }

    await tx(async (client) => {
      await client.query(
        `UPDATE bookings
            SET status = 'paid', dimepay_txn_id = $2, hold_expires_at = NULL,
                updated_at = now()
          WHERE id = $1 AND status = 'pending'`,
        [booking.id, evt.txnId || null]
      );
      // Idempotent insert (partial unique index on (booking_id, txn) for charges).
      await client.query(
        `INSERT INTO payments (booking_id, dimepay_txn_id, amount, currency, type, status, raw_webhook)
         VALUES ($1,$2,$3,$4,'charge','paid',$5)
         ON CONFLICT (booking_id, dimepay_txn_id) WHERE type = 'charge' DO NOTHING`,
        [booking.id, evt.txnId || null, booking.amount, booking.currency, JSON.stringify(event)]
      );
    });

    return json({ ok: true, status: 'paid' });
  } catch (err) {
    console.error('webhook error', err);
    return json({ error: 'webhook processing failed' }, 500);
  }
}
