-- Soon Come Villa — wedding packages seed (idempotent). JMD figures from the
-- "I Do" Packages document. Apply after db/packages.sql:
--   psql "$DATABASE_URL" -f db/packages_seed.sql

-- Packages ----------------------------------------------------------------
INSERT INTO packages (slug, name, tagline, catering_desc, highlights, sort) VALUES
('hummingbird', 'Hummingbird', 'Simple and elegant',
 'Plated service, 2–3 proteins (chicken & fish, or curried goat/pork, or vegetarian) & clean-up',
 '["Catering — plated service, 2–3 proteins & clean-up","PA system","Gazebo","Pool deck","Tables & white chairs (round or trestle)","Cake table","Lectern","Flat white tablecloths","Picture-taking on the grounds","Wedding arch"]'::jsonb,
 1),
('flamingo', 'Flamingo', 'Delightful and adorable',
 'Plated service, 3 proteins (chicken, fish & curried goat or pork, or vegetarian), cocktails & clean-up',
 '["Catering — plated service, 3 proteins & clean-up","Cocktails","PA system","Gazebo","Pool deck","Cake table","Tables & white chairs (round or trestle)","Lectern","Flat white tablecloths","Picture-taking on the grounds","Wedding arch","Ballroom","Bistro / cocktail tables","Rooms for the bridal party to get dressed","Bridal swing"]'::jsonb,
 2),
('peacock', 'Peacock', 'Extraordinary and flamboyant',
 'Plated service, 3–4 proteins (chicken, fish, curried goat, pork & vegetarian), cocktails & clean-up',
 '["Catering — plated service, 3–4 proteins & clean-up","Cocktails","PA system","Gazebo","Pool deck","Cake table","Tables & white chairs (round or trestle)","Lectern","Flat white tablecloths","Picture-taking on the grounds","Wedding arch","Ballroom","Bistro / cocktail tables","Rooms for the bridal party to get dressed","Bridal swing","Access to the bar area","Lawn lounge set-up","Night-over for the bride & groom","Wedding props (bicycle, wedding circle, arch)"]'::jsonb,
 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, tagline = EXCLUDED.tagline,
  catering_desc = EXCLUDED.catering_desc, highlights = EXCLUDED.highlights, sort = EXCLUDED.sort;

-- Tiers (venue cost + catering range) -------------------------------------
INSERT INTO package_tiers (package_id, label, min_guests, max_guests, venue_cost, catering_low, catering_high)
SELECT p.id, t.label, t.min_guests, t.max_guests, t.venue_cost, t.catering_low, t.catering_high
FROM (VALUES
  ('hummingbird','10–25',10,25,100000,45000,112000),
  ('hummingbird','26–50',26,50,150000,117000,225000),
  ('hummingbird','51–75',51,75,200000,229000,337500),
  ('hummingbird','76–100',76,100,250000,342000,450000),
  ('flamingo','10–25',10,25,120000,55000,137000),
  ('flamingo','26–50',26,50,170000,143000,275000),
  ('flamingo','51–75',51,75,220000,280500,412500),
  ('flamingo','76–100',76,100,270000,418000,550000),
  ('peacock','10–25',10,25,150000,60000,150000),
  ('peacock','26–50',26,50,200000,156000,300000),
  ('peacock','51–75',51,75,250000,306000,450000),
  ('peacock','76–100',76,100,285000,456000,600000)
) AS t(pkg,label,min_guests,max_guests,venue_cost,catering_low,catering_high)
JOIN packages p ON p.slug = t.pkg
ON CONFLICT (package_id, label) DO UPDATE SET
  min_guests = EXCLUDED.min_guests, max_guests = EXCLUDED.max_guests,
  venue_cost = EXCLUDED.venue_cost, catering_low = EXCLUDED.catering_low, catering_high = EXCLUDED.catering_high;

-- Add-ons (placeholders — owner sets real JMD prices + activates them) -----
INSERT INTO package_addons (slug, name, description, price, pricing, active, sort) VALUES
('bar-service','Bar service & bartender','Stocked bar with a bartender (wines, champagne & liquor billed separately)',0,'flat',false,1),
('dj','DJ & team','Professional DJ and team (the PA & music system is already included)',0,'flat',false,2),
('extra-room','Extra guest room','Additional room, per night (standard room rate ~US$150/night)',0,'per_night',false,3),
('decor','Decor package','Decor via our preferred vendors (tents, flowers, etc.)',0,'flat',false,4),
('media','Videography / Photography','Videographer or photographer via preferred vendors',0,'flat',false,5),
('couple-night','Extra night for the couple','An additional night''s stay for the bride & groom',0,'per_night',false,6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, pricing = EXCLUDED.pricing, sort = EXCLUDED.sort;
