// GET /api/availability
//   Stay:     ?unit=entire-villa|room|room-1..4 &checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
//   Ballroom: ?unit=ballroom&date=YYYY-MM-DD   (single exclusive day)
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { checkAvailability } from '@/lib/availability.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function nextDay(ymd) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const unit = searchParams.get('unit');
  let checkIn = searchParams.get('checkIn');
  let checkOut = searchParams.get('checkOut');
  const date = searchParams.get('date');

  if (unit === 'ballroom' && date) {
    checkIn = date;
    checkOut = nextDay(date);
  }

  if (!unit || !YMD.test(checkIn || '') || !YMD.test(checkOut || '')) {
    return NextResponse.json({ error: 'unit, checkIn and checkOut are required' }, { status: 400, ...noStore });
  }
  if (checkOut <= checkIn) {
    return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400, ...noStore });
  }

  try {
    const result = await checkAvailability(sql, unit, checkIn, checkOut);
    if (result.error) return NextResponse.json(result, { status: 400, ...noStore });
    return NextResponse.json(
      { available: result.available, conflictUnits: result.conflictUnits },
      noStore
    );
  } catch (err) {
    console.error('availability error', err);
    return NextResponse.json({ error: 'availability check failed' }, { status: 500, ...noStore });
  }
}
