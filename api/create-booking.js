// POST /api/create-booking
// Validates input, computes the price server-side, atomically reserves
// inventory (pending hold), and returns a signed DimePay payment token.
//
// Body: { unit, checkIn, checkOut, date?, guests, firstName, lastName, email, phone }
//   - unit: 'entire-villa' | 'room' | 'room-1'..'room-4' | 'ballroom'
//   - ballroom uses `date` (single day); others use checkIn/checkOut
import { sql, tx, isConflictError } from './_lib/db.js';
import { expandUnits, getConflictingUnits } from './_lib/availability.js';
import { signPaymentData, clientId } from './_lib/dimepay.js';
import { sendJson, readJson, methodGuard, randomToken } from './_lib/http.js';

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HOLD_MINUTES = 20;
const CURRENCY = 'USD';

function nextDay(ymd) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function nightsBetween(checkIn, checkOut) {
  return Math.round(
    (new Date(checkOut + 'T00:00:00Z') - new Date(checkIn + 'T00:00:00Z')) / 86400000
  );
}

class Unavailable extends Error {}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;

  let body;
  try { body = await readJson(req); } catch { return sendJson(res, 400, { error: 'invalid body' }); }

  const { unit, guests, firstName, lastName, email, phone } = body;
  let { checkIn, checkOut } = body;

  const exp = unit ? expandUnits(unit) : null;
  if (!exp) return sendJson(res, 400, { error: 'unknown unit' });

  // Resolve the canonical unit row (rates, limits, kind).
  const lookupSlug = exp.mode === 'any' ? 'room-1' : unit; // rooms share rates/limits
  const rows = await sql`SELECT * FROM units WHERE slug = ${lookupSlug} AND active = true`;
  const unitRow = rows[0];
  if (!unitRow) return sendJson(res, 400, { error: 'unit not bookable' });

  // Ballroom: single exclusive day -> [date, date+1).
  if (unitRow.kind === 'ballroom') {
    const date = body.date || checkIn;
    if (!YMD.test(date || '')) return sendJson(res, 400, { error: 'date is required' });
    checkIn = date;
    checkOut = nextDay(date);
  }

  if (!YMD.test(checkIn || '') || !YMD.test(checkOut || '') || checkOut <= checkIn) {
    return sendJson(res, 400, { error: 'valid checkIn/checkOut required' });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (checkIn < today) return sendJson(res, 400, { error: 'check-in is in the past' });

  // Guest / nights validation.
  const g = parseInt(guests, 10);
  if (!firstName || !lastName || !email) {
    return sendJson(res, 400, { error: 'name and email are required' });
  }
  if (Number.isNaN(g) || g < 1 || g > unitRow.max_guests) {
    return sendJson(res, 400, { error: `guests must be 1–${unitRow.max_guests}` });
  }

  // Server-side amount — never trust any client-sent price.
  let amount;
  if (unitRow.kind === 'ballroom') {
    if (unitRow.flat_day_rate == null) return sendJson(res, 503, { error: 'ballroom rate not set' });
    amount = Number(unitRow.flat_day_rate);
  } else {
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < unitRow.min_nights) {
      return sendJson(res, 400, { error: `minimum ${unitRow.min_nights} nights` });
    }
    amount = nights * Number(unitRow.nightly_rate);
  }

  // Attempt the reservation; retry once for 'any-room' if the chosen room is
  // taken by a concurrent booking between the pre-check and the insert.
  const maxAttempts = exp.mode === 'any' ? 3 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await tx(async (client) => reserve(client, {
        exp, unit, unitRow, checkIn, checkOut, amount, guests: g,
        firstName, lastName, email, phone,
      }));
      const data = signPaymentData({
        orderId: result.orderId,
        total: amount,
        currency: CURRENCY,
        customer: { name: `${firstName} ${lastName}`, email, phone },
        webhookUrl: `${process.env.PUBLIC_BASE_URL || ''}/api/dimepay-webhook`,
      });
      return sendJson(res, 200, {
        order_id: result.orderId,
        data,
        clientId,
        total: amount,
        currency: CURRENCY,
      });
    } catch (err) {
      if (err instanceof Unavailable) {
        return sendJson(res, 409, { error: 'those dates are no longer available' });
      }
      if (isConflictError(err) && attempt < maxAttempts) continue;
      if (isConflictError(err)) {
        return sendJson(res, 409, { error: 'those dates are no longer available' });
      }
      console.error('create-booking error', err);
      return sendJson(res, 500, { error: 'could not create booking' });
    }
  }
}

async function reserve(client, p) {
  const { exp, unitRow, checkIn, checkOut } = p;

  // Re-check availability inside the transaction.
  const conflicts = await getConflictingUnits(client, exp.units, checkIn, checkOut);
  const free = exp.units.filter((u) => !conflicts.has(u));

  let occupants;       // physical unit_ids to lock
  let bookingUnitSlug; // sellable slug recorded on the booking
  if (exp.mode === 'all') {
    if (free.length !== exp.units.length) throw new Unavailable();
    occupants = exp.units;
    bookingUnitSlug = 'entire-villa';
  } else if (exp.mode === 'any') {
    if (free.length === 0) throw new Unavailable();
    occupants = [free[0]];
    bookingUnitSlug = free[0];
  } else { // single (specific room or ballroom)
    if (free.length === 0) throw new Unavailable();
    occupants = exp.units;
    bookingUnitSlug = exp.units[0];
  }

  const orderId = randomToken();
  const inserted = await client.query(
    `INSERT INTO bookings
       (unit_slug, kind, check_in, check_out, guests, first_name, last_name,
        email, phone, currency, amount, status, dimepay_order_id, hold_expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'USD',$10,'pending',$11,
             now() + ($12 || ' minutes')::interval)
     RETURNING id`,
    [bookingUnitSlug, unitRow.kind, checkIn, checkOut, p.guests, p.firstName,
     p.lastName, p.email, p.phone || null, p.amount, orderId, String(HOLD_MINUTES)]
  );
  const bookingId = inserted.rows[0].id;

  // Insert occupancy rows; the EXCLUDE constraint is the authoritative guard.
  const range = `[${checkIn},${checkOut})`;
  for (const unitId of occupants) {
    await client.query(
      `INSERT INTO occupancy (booking_id, unit_id, stay) VALUES ($1,$2,$3::daterange)`,
      [bookingId, unitId, range]
    );
  }
  return { orderId, bookingId };
}
