// GET   /api/admin/quotes           -> list quote requests (optional ?status=)
// PATCH /api/admin/quotes { id, status } -> advance new -> quoted -> closed
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.js';
import { getAdmin } from '@/lib/auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const json = (body, status = 200) => NextResponse.json(body, { status, ...noStore });
const STATUSES = new Set(['new', 'quoted', 'closed']);

export async function GET(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);
  const status = request.nextUrl.searchParams.get('status');
  try {
    const quotes = status
      ? await sql`SELECT * FROM quote_requests WHERE status = ${status} ORDER BY created_at DESC LIMIT 500`
      : await sql`SELECT * FROM quote_requests ORDER BY created_at DESC LIMIT 500`;
    return json({ quotes });
  } catch (err) {
    console.error('admin quotes error', err);
    return json({ error: 'failed to load quotes' }, 500);
  }
}

export async function PATCH(request) {
  if (!getAdmin(request)) return json({ error: 'unauthorized' }, 401);
  let id, status;
  try { ({ id, status } = await request.json()); } catch { return json({ error: 'invalid body' }, 400); }
  if (!id || !STATUSES.has(status)) return json({ error: 'id and valid status required' }, 400);
  try {
    const rows = await sql`UPDATE quote_requests SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING id, status`;
    if (!rows[0]) return json({ error: 'not found' }, 404);
    return json({ ok: true, status: rows[0].status });
  } catch (err) {
    console.error('admin quote update error', err);
    return json({ error: 'update failed' }, 500);
  }
}
