-- Soon Come Villa — seed inventory.
-- Apply after schema.sql:  psql "$DATABASE_URL" -f db/seed.sql
-- Idempotent: re-running updates rates/limits without duplicating units.

INSERT INTO units (slug, name, kind, nightly_rate, flat_day_rate, min_nights, max_guests, active) VALUES
  ('entire-villa', 'Entire Villa', 'villa', 600.00, NULL, 2, 8, true),
  ('room-1',       'Single Room 1', 'room', 160.00, NULL, 2, 2, true),
  ('room-2',       'Single Room 2', 'room', 160.00, NULL, 2, 2, true),
  ('room-3',       'Single Room 3', 'room', 160.00, NULL, 2, 2, true),
  ('room-4',       'Single Room 4', 'room', 160.00, NULL, 2, 2, true),
  -- flat_day_rate is a placeholder until the owner confirms the ballroom price.
  ('ballroom',     'Ballroom',      'ballroom', NULL, 1500.00, 1, 150, true)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  kind          = EXCLUDED.kind,
  nightly_rate  = EXCLUDED.nightly_rate,
  flat_day_rate = EXCLUDED.flat_day_rate,
  min_nights    = EXCLUDED.min_nights,
  max_guests    = EXCLUDED.max_guests,
  active        = EXCLUDED.active;
