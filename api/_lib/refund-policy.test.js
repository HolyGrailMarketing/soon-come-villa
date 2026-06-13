import { computeRefund, daysBetween, easterSunday, isPeakPeriod } from './refund-policy.js';

const AMT = 1000;

describe('daysBetween', () => {
  test('whole-day difference, UTC', () => {
    expect(daysBetween('2026-01-01', '2026-01-15')).toBe(14);
    expect(daysBetween('2026-01-15', '2026-01-15')).toBe(0);
  });
});

describe('easterSunday (computus)', () => {
  test.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ])('Easter %i', (year, iso) => {
    expect(easterSunday(year).toISOString().slice(0, 10)).toBe(iso);
  });
});

describe('isPeakPeriod', () => {
  test('Christmas / New Year band', () => {
    expect(isPeakPeriod('2026-12-25')).toBe('christmas-new-year');
    expect(isPeakPeriod('2026-01-01')).toBe('christmas-new-year');
    expect(isPeakPeriod('2026-12-19')).toBeNull();
  });
  test('Emancipation / Independence Aug 1-6', () => {
    expect(isPeakPeriod('2026-08-03')).toBe('emancipation-independence');
    expect(isPeakPeriod('2026-08-07')).toBeNull();
  });
  test('Easter weekend (Good Friday–Easter Monday 2026)', () => {
    expect(isPeakPeriod('2026-04-03')).toBe('easter'); // Good Friday
    expect(isPeakPeriod('2026-04-06')).toBe('easter'); // Easter Monday
    expect(isPeakPeriod('2026-04-07')).toBeNull();
  });
  test('Heroes weekend (3rd Monday of Oct 2026 = Oct 19)', () => {
    expect(isPeakPeriod('2026-10-19')).toBe('heroes');
    expect(isPeakPeriod('2026-10-16')).toBe('heroes'); // Friday before
    expect(isPeakPeriod('2026-10-15')).toBeNull();
  });
});

describe('computeRefund tiers', () => {
  const today = '2026-05-01';
  test('force majeure always 100%', () => {
    // even within a peak period
    const r = computeRefund({ checkIn: '2026-12-25', amountPaid: AMT, today, forceMajeure: true });
    expect(r).toMatchObject({ amount: 1000, pct: 1, reason: 'force-majeure' });
  });
  test('peak period 0% (overrides day tier)', () => {
    const r = computeRefund({ checkIn: '2026-12-25', amountPaid: AMT, today });
    expect(r.amount).toBe(0);
    expect(r.reason).toMatch(/^peak-period:/);
  });
  test('> 60 days -> 100%', () => {
    expect(computeRefund({ checkIn: '2026-09-01', amountPaid: AMT, today }).pct).toBe(1);
  });
  test('boundary: exactly 60 days -> 50%', () => {
    expect(computeRefund({ checkIn: '2026-06-30', amountPaid: AMT, today }).pct).toBe(0.5);
  });
  test('boundary: exactly 30 days -> 50%', () => {
    expect(computeRefund({ checkIn: '2026-05-31', amountPaid: AMT, today }).pct).toBe(0.5);
  });
  test('boundary: 29 days -> 25%', () => {
    expect(computeRefund({ checkIn: '2026-05-30', amountPaid: AMT, today }).pct).toBe(0.25);
  });
  test('boundary: exactly 14 days -> 25%', () => {
    expect(computeRefund({ checkIn: '2026-05-15', amountPaid: AMT, today }).pct).toBe(0.25);
  });
  test('boundary: 13 days -> 0%', () => {
    expect(computeRefund({ checkIn: '2026-05-14', amountPaid: AMT, today }).pct).toBe(0);
  });
  test('rounds to 2dp', () => {
    const r = computeRefund({ checkIn: '2026-05-20', amountPaid: 333.33, today });
    expect(r.amount).toBe(83.33); // 25%
  });
});
