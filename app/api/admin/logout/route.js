// POST /api/admin/logout -> clears the session cookie.
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  res.headers.set('Set-Cookie', clearSessionCookie());
  return res;
}
