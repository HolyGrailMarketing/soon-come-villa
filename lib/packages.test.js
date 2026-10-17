import { computeEstimate } from './packages.js';

// Hummingbird, 10–25 guests, from the wedding brochure: J$180,000 – J$300,000,
// plus 25% coordination and a 20% refundable incidental.
const HUMMINGBIRD_10_25 = { priceLow: 180000, priceHigh: 300000, coordinationPct: 0.25, incidentalPct: 0.2, guests: 20 };

describe('computeEstimate', () => {
  test('package range with coordination and incidental', () => {
    const est = computeEstimate(HUMMINGBIRD_10_25);
    expect(est.pkg).toEqual({ low: 180000, high: 300000 });
    expect(est.coordination).toEqual({ low: 45000, high: 75000 });
    expect(est.incidental).toEqual({ low: 36000, high: 60000 });
    expect(est.addonsTotal).toBe(0);
    expect(est.total).toEqual({ low: 261000, high: 435000 });
  });

  test('flat and per-unit add-ons add the same amount to both ends', () => {
    const est = computeEstimate({
      ...HUMMINGBIRD_10_25,
      addons: [
        { slug: 'photo-booth', name: 'Vogue Photo Booth', price: 75000, pricing: 'flat', qty: 9 },
        { slug: 'candles', name: 'Candles', price: 75, pricing: 'per_unit', qty: 50 },
      ],
    });
    expect(est.addonLines.map((l) => [l.slug, l.qty, l.line])).toEqual([
      ['photo-booth', 1, 75000],
      ['candles', 50, 3750],
    ]);
    expect(est.addonsTotal).toBe(78750);
    expect(est.total).toEqual({ low: 339750, high: 513750 });
  });

  test('per-unit quantity defaults to 1 when missing or invalid', () => {
    const est = computeEstimate({
      ...HUMMINGBIRD_10_25,
      addons: [{ slug: 'charger', name: 'Gold Charger Plates', price: 200, pricing: 'per_unit', qty: 'abc' }],
    });
    expect(est.addonLines[0].qty).toBe(1);
    expect(est.addonsTotal).toBe(200);
  });

  test('a missing high price collapses to a single figure', () => {
    const est = computeEstimate({ ...HUMMINGBIRD_10_25, priceHigh: null });
    expect(est.pkg).toEqual({ low: 180000, high: 180000 });
    expect(est.total).toEqual({ low: 261000, high: 261000 });
  });
});
