// Shared booking helpers for Soon Come Villa pages (vanilla ES module).
// Loaded with: <script type="module" src="js/booking.js"></script>

// DimePay browser SDK (ESM via CDN). Only the public client_id + a server-signed
// JWT ever reach this layer.
const DIMEPAY_SDK_URL = 'https://cdn.jsdelivr.net/npm/@dimepay/web-sdk/+esm';
const GOLD = '#d4af37';

/** Format a Date as YYYY-MM-DD (lifted from the original entire-villa init). */
export function formatYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fetch live units + rates. Returns a map keyed by slug. */
export async function fetchUnits() {
  const res = await fetch('/api/units');
  if (!res.ok) throw new Error('failed to load units');
  const { units } = await res.json();
  return Object.fromEntries(units.map((u) => [u.slug, u]));
}

/** Check availability for a stay (or a single ballroom date). */
export async function checkAvailability({ unit, checkIn, checkOut, date }) {
  const qs = new URLSearchParams({ unit });
  if (date) qs.set('date', date);
  else { qs.set('checkIn', checkIn); qs.set('checkOut', checkOut); }
  const res = await fetch(`/api/availability?${qs}`);
  if (!res.ok) throw new Error('availability check failed');
  return res.json(); // { available, conflictUnits }
}

/** Create a pending booking; returns { order_id, data, clientId, total, currency }. */
export async function createBooking(payload) {
  const res = await fetch('/api/create-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'could not create booking');
  return body;
}

/**
 * Mount the DimePay widget into #dimepay-widget and start payment.
 * Confirmation is by webhook; onSuccess just routes to the confirmation page,
 * which polls the server for the authoritative status.
 */
export async function mountDimePay({ order_id, data, clientId, total, currency, mountId = 'dimepay-widget' }) {
  const mount = document.getElementById(mountId);
  if (mount) mount.style.display = 'block';
  const mod = await import(/* @vite-ignore */ DIMEPAY_SDK_URL);
  const initPayment = mod.initPayment || (mod.default && mod.default.initPayment);
  if (typeof initPayment !== 'function') throw new Error('DimePay SDK unavailable');

  initPayment({
    mountId,
    total,
    currency,
    order_id,
    client_id: clientId,
    data,
    origin: window.location.origin,
    styles: { primaryColor: GOLD },
    callbacks: {
      onSuccess: () => { window.location.href = `confirmation.html?order_id=${encodeURIComponent(order_id)}`; },
      onError: (e) => { console.error('DimePay error', e); alert('Payment could not be completed. Please try again.'); },
    },
  });
}

/** Small helper to show an inline message element if present. */
export function setMessage(elId, text, kind = 'info') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text || '';
  el.dataset.kind = kind;
  el.style.display = text ? 'block' : 'none';
}
