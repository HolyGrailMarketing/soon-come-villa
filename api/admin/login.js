// POST /api/admin/login  { email, password } -> sets HttpOnly session cookie.
import { verifyAdminPassword, makeSessionCookie } from '../_lib/auth.js';
import { sendJson, readJson, methodGuard } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, ['POST'])) return;
  const { email, password } = await readJson(req);
  if (!email || !password) return sendJson(res, 400, { error: 'email and password required' });

  if (!verifyAdminPassword(email, password)) {
    return sendJson(res, 401, { error: 'invalid credentials' });
  }
  res.setHeader('Set-Cookie', makeSessionCookie(email));
  sendJson(res, 200, { ok: true });
}
