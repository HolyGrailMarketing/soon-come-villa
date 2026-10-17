-- Soon Come Villa — bring wedding packages in line with the wedding brochure
-- (heyzine.com/flip-book/94dc3da9d5). Idempotent; apply after db/packages.sql:
--   psql "$DATABASE_URL" -f db/packages_brochure.sql
--
-- Brochure pricing: each guest tier has a package price range (buffet included);
-- coordination & professional services 25% and a refundable incidental 20% of
-- the package cost are added on top. Add-ons are the "Make It Yours" list.

-- Schema ------------------------------------------------------------------
ALTER TABLE package_tiers  ADD COLUMN IF NOT EXISTS price_low  numeric(12,2);
ALTER TABLE package_tiers  ADD COLUMN IF NOT EXISTS price_high numeric(12,2);
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS estimate_high numeric(12,2);

ALTER TABLE package_addons DROP CONSTRAINT IF EXISTS package_addons_pricing_check;
ALTER TABLE package_addons ADD CONSTRAINT package_addons_pricing_check
  CHECK (pricing IN ('flat','per_guest','per_night','per_unit'));

-- Packages ----------------------------------------------------------------
INSERT INTO packages (slug, name, tagline, catering_desc, highlights, coordination_pct, incidental_pct, sort) VALUES
('hummingbird', 'Hummingbird', 'Simple and elegant',
 '3-protein buffet, gazebo & pool deck, DJ & PA system, bridal dressing rooms, grounds photo shoot',
 '["3-protein buffet with soup, salads and rice & peas","Gazebo, pool deck and ballroom","Tables, white chairs and flat white tablecloths","Cake, gift and guest book tables, lectern","Access to the bar area with a bartender","DJ and PA system","2 bridal party dressing rooms","Grounds photo shoot","Clean-up service"]'::jsonb,
 0.25, 0.20, 1),
('flamingo', 'Flamingo', 'Delightful and adorable',
 '3-protein buffet, cocktail hour, hors d''oeuvres, gazebo & pool deck, DJ & PA system, bistro tables',
 '["3-protein buffet with soup, salads and sides","Cocktail hour","Hors d''oeuvres: stamp & go, fruit kebabs, ackee quiche, callaloo puffs","Gazebo, pool deck and ballroom","Bistro / cocktail tables and covers","Access to the bar area with a bartender","DJ and PA system","2 bridal party dressing rooms","Grounds photo shoot","Clean-up service"]'::jsonb,
 0.25, 0.20, 2),
('peacock', 'Peacock', 'Extraordinary and flamboyant',
 '4-protein buffet, cocktail hour, hors d''oeuvres, ballroom & pool deck, lawn lounge, bridal swing, newlywed overnight stay',
 '["4-protein buffet with two soups, salads and sides","Cocktail hour","Hors d''oeuvres: stamp & go, fruit kebabs, ackee quiche, callaloo puffs","Ballroom, pool deck and gazebo","Lawn lounge set-up and bridal swing","Overnight stay for the bride & groom on the wedding night","Bistro / cocktail tables and covers","DJ and PA system","2 bridal party dressing rooms","Grounds photo shoot"]'::jsonb,
 0.25, 0.20, 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, tagline = EXCLUDED.tagline, catering_desc = EXCLUDED.catering_desc,
  highlights = EXCLUDED.highlights, coordination_pct = EXCLUDED.coordination_pct,
  incidental_pct = EXCLUDED.incidental_pct, sort = EXCLUDED.sort;

-- Tiers (package price range per guest bracket) ----------------------------
-- venue_cost mirrors price_low so the original NOT NULL column stays valid;
-- catering is part of the package price now, so the catering range is cleared.
INSERT INTO package_tiers (package_id, label, min_guests, max_guests, venue_cost, price_low, price_high, catering_low, catering_high)
SELECT p.id, t.label, t.min_guests, t.max_guests, t.price_low, t.price_low, t.price_high, NULL, NULL
FROM (VALUES
  ('hummingbird','10–25',10,25,180000,300000),
  ('hummingbird','26–50',26,50,308000,500000),
  ('hummingbird','51–75',51,75,508000,700000),
  ('hummingbird','76–100',76,100,708000,900000),
  ('flamingo','10–25',10,25,200000,335000),
  ('flamingo','26–50',26,50,344000,560000),
  ('flamingo','51–75',51,75,569000,785000),
  ('flamingo','76–100',76,100,794000,1010000),
  ('peacock','10–25',10,25,255000,405000),
  ('peacock','26–50',26,50,415000,655000),
  ('peacock','51–75',51,75,665000,905000),
  ('peacock','76–100',76,100,915000,1155000)
) AS t(pkg,label,min_guests,max_guests,price_low,price_high)
JOIN packages p ON p.slug = t.pkg
ON CONFLICT (package_id, label) DO UPDATE SET
  min_guests = EXCLUDED.min_guests, max_guests = EXCLUDED.max_guests,
  venue_cost = EXCLUDED.venue_cost, price_low = EXCLUDED.price_low, price_high = EXCLUDED.price_high,
  catering_low = NULL, catering_high = NULL;

-- Add-ons -----------------------------------------------------------------
-- Retire the earlier placeholders (DJ and bartender are now included; décor,
-- media and rooms are arranged directly).
UPDATE package_addons SET active = false
 WHERE slug IN ('bar-service','dj','extra-room','decor','media','couple-night');

INSERT INTO package_addons (slug, name, description, price, pricing, active, sort) VALUES
('photo-booth',     'Vogue Photo Booth',                      NULL,                         75000, 'flat',     true, 1),
('gold-utensils',   'Gold Utensils',                          'Priced per set',               300, 'per_unit', true, 2),
('gold-chargers',   'Gold Charger Plates',                    'Priced per plate',             200, 'per_unit', true, 3),
('candles',         'Candles',                                'Priced per candle',             75, 'per_unit', true, 4),
('love-seat',       'Love Seat',                              NULL,                         12000, 'flat',     true, 5),
('wedding-circle',  'Wedding Circle',                         NULL,                         10000, 'flat',     true, 6),
('wooden-arch',     'Wooden Arch',                            NULL,                         10000, 'flat',     true, 7),
('bicycle-prop',    'Bicycle Prop',                           NULL,                          7500, 'flat',     true, 8),
('red-carpet',      'Red Carpet',                             NULL,                         15000, 'flat',     true, 9),
('stanchion-rails', 'Gold Stanchion Rails with Red Rope',     NULL,                         15000, 'flat',     true, 10),
('gold-easels',     'Gold Easels (2)',                        NULL,                          5000, 'flat',     true, 11),
('silver-easel',    'Silver Easel (1)',                       NULL,                          2500, 'flat',     true, 12),
('qr-code',         'QR Code for Programme and Menu',         NULL,                          6000, 'flat',     true, 13),
('welcome-sign',    'Welcome Sign with Image of Bride and Groom', NULL,                     10000, 'flat',     true, 14)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price,
  pricing = EXCLUDED.pricing, active = EXCLUDED.active, sort = EXCLUDED.sort;
