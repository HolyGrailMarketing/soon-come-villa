// POST /api/admin/logout -> clears the session cookie.
import { clearSessionCookie } from '../_lib/auth.js';
import { sendJson, methodGuard } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  res.setHeader('Set-Cookie', clearSessionCookie());
  sendJson(res, 200, { ok: true });
}
