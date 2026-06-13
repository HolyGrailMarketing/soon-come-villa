// GET /api/cron/expire-holds — Vercel Cron (every 10 min).
// Expires stale pending holds and frees their occupancy so the dates reopen.
// Guarded by CRON_SECRET (Vercel sends it as a Bearer token; we also accept a
// matching ?secret= for manual runs).
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') || '';
  const provided = auth.replace(/^Bearer\s+/i, '') || request.nextUrl.searchParams.get('secret');
  if (secret && provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, ...noStore });
  }

  try {
    const expired = await sql`
      UPDATE bookings
         SET status = 'expired', updated_at = now()
       WHERE status = 'pending'
         AND hold_expires_at IS NOT NULL
         AND hold_expires_at <= now()
      RETURNING id`;
    const ids = expired.map((r) => r.id);
    if (ids.length) {
      await sql`DELETE FROM occupancy WHERE booking_id = ANY(${ids})`;
    }
    return NextResponse.json({ expired: ids.length }, noStore);
  } catch (err) {
    console.error('expire-holds error', err);
    return NextResponse.json({ error: 'expire failed' }, { status: 500, ...noStore });
  }
}
