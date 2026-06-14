# Soon Come Villa — Booking Application (Next.js)

A hybrid **Next.js (App Router, JavaScript)** app: the Webflow marketing site is
preserved as static HTML, and the booking + admin flows are React pages backed by
App Router route handlers — live availability, full payment via DimePay,
webhook-confirmed bookings, and an admin dashboard with cancellations and tiered refunds.

## Architecture

- **Marketing pages** — static Webflow HTML in `/public`
  (`index, bio, contact-us, house-rules, cancellation-refund-policy, kings`).
  `next.config.mjs` rewrites map `/` → `/index.html` and legacy `*.html` links → React routes.
- **Booking + admin pages** (`app/*/page.js`) — React client components reusing the
  Webflow CSS (`rooms, entire-villa, book-room, ballroom, confirmation, admin`).
- **API** (`app/api/*/route.js`, Node runtime) — App Router route handlers.
- **Shared logic** (`lib/*`) — db, availability, refund-policy, dimepay, auth, util.
- **Neon Postgres** — inventory, bookings, occupancy, payments, blocks.
- **DimePay** — payment widget (npm `@dimepay/web-sdk`, client-side) + REST refunds.

```
Guest → availability → create-booking (pending hold) → DimePay widget
                                                            │
                              webhook (source of truth) ────┘→ booking = paid
Admin → login → bookings table → cancel / refund (tiered policy) / block / set-rate
Cron (*/10) → expire stale 20-min holds
```

### Inventory & the double-booking guard

Occupancy is keyed on **physical units only**: `room-1..room-4` and `ballroom`.
`entire-villa` is sellable but owns no occupancy rows — booking it occupies all four
rooms. A Postgres `EXCLUDE USING gist (unit_id WITH =, stay WITH &&)` constraint on
`occupancy` makes concurrent double-bookings impossible at the database level.

| Booking      | Occupancy rows                         |
|--------------|----------------------------------------|
| Entire villa | room-1, room-2, room-3, room-4         |
| Single room  | one auto-assigned free room            |
| Ballroom     | ballroom (one exclusive day)           |

Ranges are half-open `[check_in, check_out)` so a checkout day frees up for the next
check-in.

## Setup

1. **Database** — create a Neon project, then apply:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   psql "$DATABASE_URL" -f db/seed.sql      # idempotent; edit ballroom flat_day_rate
   ```
2. **Env** — copy `.env.example`. Generate the admin hash with
   `node -e "console.log(require('bcryptjs').hashSync('pw',10))"`. In a local `.env`,
   escape `$` in the hash as `\$` (Next runs dotenv-expand); on Vercel paste it raw.
3. **Install & run** — `npm install`, then `npm run dev` (Next on :3000).
   Production: `npm run build && npm start`. Deploy: push to Vercel (auto-detects Next).
4. **Tests** — `npm test` (refund-policy unit tests).

## Wedding packages (quote requests — no online payment)

`/packages` lets guests pick a wedding package (Hummingbird / Flamingo / Peacock), customize it
(date, guest tier, priced add-ons), see a live **JMD** estimate (venue + 35% coordination + 20%
refundable incidental + add-ons; catering shown as an indicative range), and submit a **quote request**.
No DimePay — requests land in the admin dashboard (Wedding quotes tab) for offline follow-up + deposit.
Schema/seed: `db/packages.sql`, `db/packages_seed.sql` (tables `packages`, `package_tiers`,
`package_addons`, `quote_requests`). Estimate logic: `lib/packages.js` (server recomputes on submit).
Add-ons seed inactive at price 0 — set JMD prices + activate them in Admin → Package pricing.

## API

Public: `GET /api/units`, `GET /api/availability`, `POST /api/create-booking`,
`POST /api/dimepay-webhook`, `GET /api/booking/:order_id`, `GET /api/packages`, `POST /api/packages/quote`.
Admin (cookie): `…/quotes` (GET/PATCH), `…/packages` (GET), `…/package-rate` (POST).

Admin (HttpOnly session cookie): `POST /api/admin/login` · `logout`,
`GET /api/admin/bookings`, `POST /api/admin/cancel`, `GET|POST /api/admin/refund`
(GET previews the computed amount), `GET|POST|DELETE /api/admin/block`,
`POST /api/admin/set-rate`. Cron: `GET /api/cron/expire-holds` (Bearer `CRON_SECRET`).

## Security notes

- The secret key `sk_...` lives only in serverless env; the browser only ever gets the
  public `ck_...` and a server-signed JWT.
- A booking is marked `paid` **only** by the webhook, never by the client `onSuccess`.
  The webhook re-reads the payment from DimePay REST and verifies the amount before
  settling; mismatches are ignored and logged.
- `dimepay_order_id` is an unguessable bearer token used for confirmation lookups.

## Known follow-ups (hardening)

- Wire `DIMEPAY_WEBHOOK_SECRET` HMAC verification once DimePay documents it.
- Rate-limit public POSTs.
- Reconcile `cancellation-refund-policy.html` page text with the implemented tiered
  model (the page currently also describes a conflicting 50%-deposit model).
- Confirm the ballroom flat day rate and whether a ballroom event should also block
  overnight stays (currently independent).
