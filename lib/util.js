// Small server-side helpers shared by route handlers.

// A short, URL-safe, unguessable token used as the DimePay order_id /
// confirmation bearer token. `crypto` is a global in the Node runtime.
export function randomToken(bytes = 24) {
  return crypto.randomUUID().replace(/-/g, '') +
    [...crypto.getRandomValues(new Uint8Array(bytes))]
      .map((b) => b.toString(16).padStart(2, '0')).join('');
}
