// Wedding package estimate calculation — server-side single source of truth.
// Prices follow the wedding brochure: each guest tier has a package price
// range (buffet included); coordination and the refundable incidental are
// percentages of that package cost, so the estimate is a low–high range.

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const range = (low, high) => ({ low: r2(low), high: r2(high) });

/**
 * @param {object} a
 * @param {number} a.priceLow         tier package price, low end
 * @param {number} [a.priceHigh]      tier package price, high end (defaults to priceLow)
 * @param {number} a.coordinationPct  e.g. 0.25
 * @param {number} a.incidentalPct    e.g. 0.20 (refundable)
 * @param {number} a.guests
 * @param {Array}  a.addons  resolved add-on rows the guest selected:
 *                           [{ slug, name, price, pricing:'flat'|'per_guest'|'per_night'|'per_unit', qty }]
 * @returns {{ pkg, coordination, incidental, addonLines, addonsTotal, total }}  ranges are { low, high }
 */
export function computeEstimate({ priceLow, priceHigh, coordinationPct, incidentalPct, guests, addons = [] }) {
  const low = Number(priceLow) || 0;
  const high = priceHigh == null ? low : Number(priceHigh);

  const pkg = range(low, high);
  const coordination = range(low * coordinationPct, high * coordinationPct);
  const incidental = range(low * incidentalPct, high * incidentalPct);

  const addonLines = addons.map((a) => {
    const qty = a.pricing === 'per_guest' ? Number(guests)
      : a.pricing === 'per_night' || a.pricing === 'per_unit' ? Math.max(1, parseInt(a.qty, 10) || 1)
      : 1;
    const line = r2(Number(a.price) * qty);
    return { slug: a.slug, name: a.name, price: r2(a.price), pricing: a.pricing, qty, line };
  });
  const addonsTotal = r2(addonLines.reduce((s, l) => s + l.line, 0));

  return {
    pkg,
    coordination,
    incidental,
    addonLines,
    addonsTotal,
    total: range(
      pkg.low + coordination.low + incidental.low + addonsTotal,
      pkg.high + coordination.high + incidental.high + addonsTotal,
    ),
  };
}

// A package_tiers row (from to_jsonb, so the brochure columns may be absent)
// -> the public tier shape. Before db/packages_brochure.sql adds price_low /
// price_high, venue_cost stands in for both ends.
export function tierPrices(t) {
  const low = Number(t.price_low ?? t.venue_cost);
  return {
    label: t.label, minGuests: t.min_guests, maxGuests: t.max_guests,
    priceLow: low,
    priceHigh: t.price_high == null ? low : Number(t.price_high),
  };
}
