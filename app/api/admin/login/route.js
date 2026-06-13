// POST /api/admin/login  { email, password } -> sets HttpOnly session cookie.
import { NextResponse } from 'next/server';
import { verifyAdminPassword, makeSessionCookie } from '@/lib/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function POST(request) {
  let email, password;
  try { ({ email, password } = await request.json()); }
  catch { return NextResponse.json({ error: 'invalid body' }, { status: 400, ...noStore }); }

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400, ...noStore });
  }
  if (!verifyAdminPassword(email, password)) {
    return NextResponse.json({ error: 'invalid credentials' }, { status: 401, ...noStore });
  }
  const res = NextResponse.json({ ok: true }, noStore);
  res.headers.set('Set-Cookie', makeSessionCookie(email));
  return res;
}
