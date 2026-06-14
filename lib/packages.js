// Wedding package estimate calculation — server-side single source of truth.
// Catering is intentionally excluded (quoted separately as a range).

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * @param {object} a
 * @param {number} a.venueCost        tier venue cost
 * @param {number} a.coordinationPct  e.g. 0.35
 * @param {number} a.incidentalPct    e.g. 0.20 (refundable)
 * @param {number} a.guests
 * @param {Array}  a.addons  resolved add-on rows the guest selected:
 *                           [{ slug, name, price, pricing:'flat'|'per_guest'|'per_night', qty }]
 * @returns {{ venue, coordination, incidental, addonLines, addonsTotal, estimateTotal }}
 */
export function computeEstimate({ venueCost, coordinationPct, incidentalPct, guests, addons = [] }) {
  const venue = r2(venueCost);
  const coordination = r2(venue * coordinationPct);
  const incidental = r2(venue * incidentalPct);

  const addonLines = addons.map((a) => {
    const qty = a.pricing === 'per_guest' ? Number(guests)
      : a.pricing === 'per_night' ? Math.max(1, parseInt(a.qty, 10) || 1)
      : 1;
    const line = r2(Number(a.price) * qty);
    return { slug: a.slug, name: a.name, price: r2(a.price), pricing: a.pricing, qty, line };
  });
  const addonsTotal = r2(addonLines.reduce((s, l) => s + l.line, 0));

  return {
    venue,
    coordination,
    incidental,
    addonLines,
    addonsTotal,
    estimateTotal: r2(venue + coordination + incidental + addonsTotal),
  };
}
