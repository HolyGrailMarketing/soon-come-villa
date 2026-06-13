// GET /api/availability
//   Stay:     ?unit=entire-villa|room|room-1..4 &checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
//   Ballroom: ?unit=ballroom&date=YYYY-MM-DD   (single exclusive day)
import { sql } from './_lib/db.js';
import { checkAvailability } from './_lib/availability.js';
import { sendJson, methodGuard } from './_lib/http.js';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function nextDay(ymd) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['GET'])) return;

  const { searchParams } = new URL(req.url, 'http://localhost');
  const unit = searchParams.get('unit');
  let checkIn = searchParams.get('checkIn');
  let checkOut = searchParams.get('checkOut');
  const date = searchParams.get('date');

  if (unit === 'ballroom' && date) {
    checkIn = date;
    checkOut = nextDay(date);
  }

  if (!unit || !YMD.test(checkIn || '') || !YMD.test(checkOut || '')) {
    return sendJson(res, 400, { error: 'unit, checkIn and checkOut are required' });
  }
  if (checkOut <= checkIn) {
    return sendJson(res, 400, { error: 'checkOut must be after checkIn' });
  }

  try {
    const result = await checkAvailability(sql, unit, checkIn, checkOut);
    if (result.error) return sendJson(res, 400, result);
    sendJson(res, 200, {
      available: result.available,
      conflictUnits: result.conflictUnits,
    });
  } catch (err) {
    console.error('availability error', err);
    sendJson(res, 500, { error: 'availability check failed' });
  }
}
