// Tiny helpers for Vercel Node serverless functions (no framework).

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Read and JSON-parse the request body. Vercel usually pre-parses req.body for
// application/json, but fall back to reading the raw stream when it hasn't.
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return {}; }
}

export function methodGuard(req, res, allowed) {
  if (allowed.includes(req.method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'method not allowed' });
  return false;
}

// A short, URL-safe, unguessable token used as the DimePay order_id /
// confirmation bearer token.
export function randomToken(bytes = 24) {
  // crypto is global in the Vercel Node runtime (Node 18+).
  return crypto.randomUUID().replace(/-/g, '') +
    [...crypto.getRandomValues(new Uint8Array(bytes))]
      .map((b) => b.toString(16).padStart(2, '0')).join('');
}
