-- Soon Come Villa — wedding "I Do" packages + quote requests (Neon Postgres)
-- Apply:  psql "$DATABASE_URL" -f db/packages.sql
-- Amounts are JMD; use numeric(12,2) (package totals exceed the 10,2 used elsewhere).

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- packages: the three wedding tiers (Hummingbird / Flamingo / Peacock).
-- coordination_pct / incidental_pct are applied to the tier venue cost.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packages (
  id              serial PRIMARY KEY,
  slug            text NOT NULL UNIQUE,            -- hummingbird | flamingo | peacock
  name            text NOT NULL,
  tagline         text,
  catering_desc   text,
  highlights      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- string[]
  coordination_pct numeric(5,4) NOT NULL DEFAULT 0.35,
  incidental_pct   numeric(5,4) NOT NULL DEFAULT 0.20,
  active          boolean NOT NULL DEFAULT true,
  sort            int NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- package_tiers: venue cost + catering range per guest-count bracket.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_tiers (
  id            serial PRIMARY KEY,
  package_id    int NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  label         text NOT NULL,                     -- e.g. '10–25'
  min_guests    int NOT NULL,
  max_guests    int NOT NULL,
  venue_cost    numeric(12,2) NOT NULL,
  catering_low  numeric(12,2),
  catering_high numeric(12,2),
  UNIQUE (package_id, label)
);

CREATE INDEX IF NOT EXISTS package_tiers_pkg_idx ON package_tiers (package_id);

-- ---------------------------------------------------------------------------
-- package_addons: admin-priced optional extras (bar, DJ, extra rooms, ...).
-- Seeded inactive with price 0; owner sets real JMD prices before they show.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_addons (
  id          serial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  price       numeric(12,2) NOT NULL DEFAULT 0,
  pricing     text NOT NULL DEFAULT 'flat' CHECK (pricing IN ('flat','per_guest','per_night')),
  active      boolean NOT NULL DEFAULT false,
  sort        int NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- quote_requests: a submitted wedding inquiry with a server-computed estimate.
-- No payment — the owner follows up with a quote/deposit offline.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref             text NOT NULL UNIQUE,            -- short human reference code
  package_slug    text NOT NULL,
  tier_label      text NOT NULL,
  guests          int NOT NULL,
  event_date      date,
  currency        text NOT NULL DEFAULT 'JMD',
  venue_cost      numeric(12,2) NOT NULL,
  coordination_amt numeric(12,2) NOT NULL,
  incidental_amt   numeric(12,2) NOT NULL,
  addons          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{slug,name,price,qty,line}]
  addons_total    numeric(12,2) NOT NULL DEFAULT 0,
  estimate_total  numeric(12,2) NOT NULL,
  catering_low    numeric(12,2),
  catering_high   numeric(12,2),
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text NOT NULL,
  phone           text,
  special_requests text,
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_requests_status_idx ON quote_requests (status);
CREATE INDEX IF NOT EXISTS quote_requests_created_idx ON quote_requests (created_at DESC);
