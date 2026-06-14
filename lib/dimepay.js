// DimePay integration. The secret key (sk_...) lives only here, server-side.
//
//   signPaymentData(...) -> the `data` JWT the browser SDK forwards to DimePay.
//   refundPayment(...)   -> PUT /payments/refund.
//   fetchPayment(...)    -> re-read a payment for webhook verification.
import jwt from 'jsonwebtoken';

const ENV = process.env.DIMEPAY_ENV === 'production' ? 'production' : 'sandbox';
const REST_BASE = ENV === 'production'
  ? 'https://api.dimepay.app/dapi/v1'
  : 'https://sandbox.api.dimepay.app/dapi/v1';

export const isSandbox = ENV !== 'production';
export const clientId = process.env.DIMEPAY_CLIENT_ID;        // ck_... (public)
const secretKey = process.env.DIMEPAY_SECRET_KEY;             // sk_... (private)

/**
 * Build the signed `data` token passed to initPayment on the client.
 * The browser only ever receives this signed blob + the public client_id.
 */
export function signPaymentData({ orderId, total, currency, customer, webhookUrl }) {
  if (!secretKey) throw new Error('DIMEPAY_SECRET_KEY is not configured');
  // DimePay's order API (orders/sdk) requires this exact shape: `id` is the order
  // reference, plus subtotal/tax/fees/items/fulfilled and billing/shipping person.
  // The sandbox/test flag is an initPayment config param, NOT part of this JWT.
  const person = {
    name: customer?.name || 'Guest',
    street: customer?.street || 'N/A',
    city: customer?.city || 'Runaway Bay',
    stateOrProvinceName: customer?.state || 'St Ann',
    postalCode: customer?.postalCode || '00000',
    countryName: customer?.country || 'Jamaica',
  };
  const payload = {
    id: orderId,
    total,
    subtotal: total,
    description: 'Soon Come Villa booking',
    tax: 0,
    currency,
    fees: [],
    items: [],
    fulfilled: true,
    shippingPerson: person,
    billingPerson: person,
    webhookUrl,
  };
  // Short-lived: the token only needs to survive the checkout session.
  return jwt.sign(payload, secretKey, { algorithm: 'HS256', expiresIn: '1h' });
}

async function restCall(method, path, body) {
  if (!secretKey) throw new Error('DIMEPAY_SECRET_KEY is not configured');
  const res = await fetch(`${REST_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // DimePay REST auth header.
      client_key: secretKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`DimePay ${method} ${path} failed: ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/** PUT /payments/refund — full or partial. */
export function refundPayment({ txnId, amount, currency }) {
  return restCall('PUT', '/payments/refund', {
    transaction_id: txnId,
    amount,
    currency,
  });
}

/** Re-fetch a payment to verify amount/status (webhook defense-in-depth). */
export function fetchPayment(txnId) {
  return restCall('GET', `/payments/${encodeURIComponent(txnId)}`);
}
