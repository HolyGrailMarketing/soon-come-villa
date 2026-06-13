// Expand-and-overlap availability logic, shared by the public read endpoint
// and the create-booking transactional re-check.
//
// Occupancy is keyed on PHYSICAL units only: room-1..room-4 and ballroom.
// A villa booking occupies all four rooms; a single-room booking occupies one
// auto-assigned room; a ballroom booking occupies `ballroom`.

export const ROOM_IDS = ['room-1', 'room-2', 'room-3', 'room-4'];

/**
 * Map a sellable unit slug to the physical units it concerns plus a mode:
 *   'all'    -> villa: every listed unit must be free
 *   'any'    -> single room: at least one listed unit must be free
 *   'single' -> ballroom: the one listed unit must be free
 */
export function expandUnits(slug) {
  if (slug === 'entire-villa') return { mode: 'all', units: ROOM_IDS };
  if (slug === 'ballroom')     return { mode: 'single', units: ['ballroom'] };
  if (ROOM_IDS.includes(slug)) return { mode: 'single', units: [slug] };
  if (slug === 'room' || slug === 'any-room') return { mode: 'any', units: ROOM_IDS };
  return null;
}

// Normalize result rows from either the neon HTTP client or a pooled pg client.
//   Pooled pg client (used inside tx): exposes .query(text, params) -> { rows }.
//   Neon HTTP client (used by read endpoints): the sql function itself is
//   callable as sql(text, params) -> rows[] (it has no .query method in v0.10).
async function rows(executor, text, params) {
  const r = typeof executor.query === 'function'
    ? await executor.query(text, params)
    : await executor(text, params);
  return Array.isArray(r) ? r : r.rows;
}

/**
 * Given physical unit ids and a half-open [checkIn, checkOut) range, return the
 * Set of unit ids that have a conflicting active booking or admin block.
 * "Active" = a paid booking, or a pending booking whose hold has not expired.
 */
export async function getConflictingUnits(executor, unitIds, checkIn, checkOut) {
  const range = `[${checkIn},${checkOut})`;
  const occ = await rows(
    executor,
    `SELECT DISTINCT o.unit_id
       FROM occupancy o
       JOIN bookings b ON b.id = o.booking_id
      WHERE o.unit_id = ANY($1)
        AND o.stay && $2::daterange
        AND (b.status = 'paid'
             OR (b.status = 'pending' AND b.hold_expires_at > now()))`,
    [unitIds, range]
  );
  const blocked = await rows(
    executor,
    `SELECT DISTINCT unit_id
       FROM blocked_dates
      WHERE unit_id = ANY($1)
        AND block_range && $2::daterange`,
    [unitIds, range]
  );
  return new Set([...occ, ...blocked].map((r) => r.unit_id));
}

/**
 * Public availability check.
 * Returns { available, freeUnits, conflictUnits }.
 */
export async function checkAvailability(executor, slug, checkIn, checkOut) {
  const exp = expandUnits(slug);
  if (!exp) return { available: false, error: 'unknown unit' };

  const conflicts = await getConflictingUnits(executor, exp.units, checkIn, checkOut);
  const freeUnits = exp.units.filter((u) => !conflicts.has(u));

  let available;
  if (exp.mode === 'any') available = freeUnits.length > 0;
  else available = freeUnits.length === exp.units.length; // all / single

  return {
    available,
    freeUnits,
    conflictUnits: [...conflicts],
  };
}
