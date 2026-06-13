// Admin session auth: a signed JWT in an HttpOnly cookie.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SESSION_SECRET = process.env.SESSION_SECRET;
const COOKIE = 'scv_admin';
const MAX_AGE = 60 * 60 * 8; // 8 hours

export function verifyAdminPassword(email, password) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const hash = process.env.ADMIN_PASSWORD_HASH;
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

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  });
  return out;
}

/**
 * Return the admin session payload if the request carries a valid cookie,
 * otherwise null.
 */
export function getAdmin(req) {
  if (!SESSION_SECRET) return null;
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SESSION_SECRET);
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

/** Guard helper: returns true if authorized, else writes 401 and returns false. */
export function requireAdmin(req, res) {
  if (getAdmin(req)) return true;
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: 'unauthorized' }));
  return false;
}
