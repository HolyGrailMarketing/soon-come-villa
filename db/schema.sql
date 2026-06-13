-- Soon Come Villa — booking application schema (Neon Postgres)
-- Apply to a fresh database / Neon branch:  psql "$DATABASE_URL" -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- units: the sellable inventory + server-driven rates.
--   `entire-villa` is sellable for pricing/display but owns NO occupancy rows;
--   booking it occupies all four physical rooms (room-1..room-4).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS units (
  id            serial PRIMARY KEY,
  slug          text NOT NULL UNIQUE,          -- entire-villa | room-1..room-4 | ballroom
  name          text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('villa', 'room', 'ballroom')),
  nightly_rate  numeric(10,2),                 -- villa / room; null for ballroom
  flat_day_rate numeric(10,2),                 -- ballroom (admin-set); null otherwise
  min_nights    int NOT NULL DEFAULT 1,
  max_guests    int NOT NULL DEFAULT 1,
  active        boolean NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------------
-- bookings: one row per guest reservation of a sellable unit.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_slug        text NOT NULL REFERENCES units(slug),
  kind             text NOT NULL CHECK (kind IN ('villa', 'room', 'ballroom')),
  check_in         date NOT NULL,
  check_out        date NOT NULL,              -- ballroom: event date + 1 day
  guests           int NOT NULL DEFAULT 1,
  first_name       text NOT NULL,
  last_name        text NOT NULL,
  email            text NOT NULL,
  phone            text,
  currency         text NOT NULL DEFAULT 'USD',
  amount           numeric(10,2) NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','cancelled','refunded','expired')),
  dimepay_order_id text NOT NULL UNIQUE,       -- unguessable; bearer token for lookups
  dimepay_txn_id   text,
  hold_expires_at  timestamptz,                -- pending hold expiry (~20 min)
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_hold_idx   ON bookings (hold_expires_at)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- occupancy: one row per occupied PHYSICAL unit (room-1..4 or ballroom) per
-- booking. The EXCLUDE constraint is the race-proof double-booking guard.
-- Half-open [) ranges so a check-out day frees up for the next check-in.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS occupancy (
  id         bigserial PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  unit_id    text NOT NULL,                    -- room-1..room-4 | ballroom
  stay       daterange NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  EXCLUDE USING gist (unit_id WITH =, stay WITH &&)
);

CREATE INDEX IF NOT EXISTS occupancy_booking_idx ON occupancy (booking_id);

-- ---------------------------------------------------------------------------
-- payments: append-only audit of money movement (charges + refunds).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id             bigserial PRIMARY KEY,
  booking_id     uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  dimepay_txn_id text,
  amount         numeric(10,2) NOT NULL,
  currency       text NOT NULL DEFAULT 'USD',
  type           text NOT NULL CHECK (type IN ('charge','refund')),
  status         text NOT NULL,
  raw_webhook    jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_booking_idx ON payments (booking_id);
-- Idempotency: at most one charge per (booking, txn).
CREATE UNIQUE INDEX IF NOT EXISTS payments_charge_uniq
  ON payments (booking_id, dimepay_txn_id) WHERE type = 'charge';

-- ---------------------------------------------------------------------------
-- blocked_dates: admin maintenance / offline / force-majeure blocks.
-- Keyed on physical units (room-1..4 or ballroom); blocking the villa expands
-- to four room rows at the API layer.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocked_dates (
  id          bigserial PRIMARY KEY,
  unit_id     text NOT NULL,                   -- room-1..room-4 | ballroom
  block_range daterange NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blocked_dates_unit_idx ON blocked_dates (unit_id);
