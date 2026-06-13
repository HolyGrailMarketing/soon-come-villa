// Neon Postgres access for serverless functions.
//
//   sql`...`     -> one-shot queries over HTTP (fast, no transaction).
//   tx(async c)  -> a pooled client with BEGIN/COMMIT for multi-statement
//                   work that relies on the occupancy EXCLUDE constraint.
import { neon, Pool } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Fail loudly at call time rather than masking a misconfiguration.
  console.warn('DATABASE_URL is not set; database calls will fail.');
}

// Tagged-template client for simple, single-statement queries.
export const sql = neon(connectionString);

// Lazily-created pool for transactional work (WebSocket-based).
let pool;
function getPool() {
  if (!pool) pool = new Pool({ connectionString });
  return pool;
}

/**
 * Run `fn` inside a transaction. The client passed to `fn` exposes:
 *   client.query(text, params)  -> standard node-postgres result
 * Commits on success, rolls back on any thrown error, always releases.
 */
export async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

// Postgres exclusion/unique violation -> a booking conflict.
export const isConflictError = (err) =>
  err && (err.code === '23P01' /* exclusion_violation */ ||
          err.code === '23505' /* unique_violation */);
