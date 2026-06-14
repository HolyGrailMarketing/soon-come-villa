// Admin session auth: a signed JWT in an HttpOnly cookie.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SESSION_SECRET = process.env.SESSION_SECRET;
const COOKIE = 'scv_admin';
const MAX_AGE = 60 * 60 * 8; // 8 hours

// Resolve the admin bcrypt hash. A raw bcrypt hash contains `$`, which various
// env systems mangle (dotenv-expand locally, env injectors on hosts). To be
// `$`-proof, ADMIN_PASSWORD_HASH may be base64-encoded; we decode it when it
// isn't already a bcrypt hash. A raw `$2...` hash still works as-is.
function adminHash() {
  const raw = (process.env.ADMIN_PASSWORD_HASH || '').trim();
  if (!raw || raw.startsWith('$2')) return raw;
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    return decoded.startsWith('$2') ? decoded : raw;
  } catch {
    return raw;
  }
}

export function verifyAdminPassword(email, password) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const hash = adminHash();
  if (!adminEmail || !hash) return false;
  if (String(email).toLowerCase() !== adminEmail.toLowerCase()) return false;
  return bcrypt.compareSync(password, hash);
}

export function makeSessionCookie(email) {
  if (!SESSION_SECRET) throw new Error('SESSION_SECRET is not configured');
  const token = jwt.sign({ sub: email, role: 'admin' }, SESSION_SECRET, {
    algorithm: 'HS256',
    expiresIn: MAX_AGE,
  });
  return cookieString(token, MAX_AGE);
}

export function clearSessionCookie() {
  return cookieString('', 0);
}

function cookieString(value, maxAge) {
  const parts = [
    `${COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ];
  return parts.join('; ');
}

/**
 * Return the admin session payload if the request carries a valid cookie,
 * otherwise null. Accepts a Next.js `NextRequest` (has `.cookies.get`).
 */
export function getAdmin(req) {
  if (!SESSION_SECRET) return null;
  const token = req?.cookies?.get?.(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SESSION_SECRET);
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}
