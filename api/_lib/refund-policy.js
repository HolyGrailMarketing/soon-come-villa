// Pure refund calculation. No I/O — fully unit-testable.
//
// Implements the tiered model from cancellation-refund-policy.html (Section 2),
// resolving that page's overlapping day labels with an explicit convention:
//
//   force majeure        -> 100% (or reschedule within 12 months)
//   check-in in peak band -> 0%
//   days-to-check-in > 60 -> 100%
//   days in 30..60        -> 50%
//   days in 14..29        -> 25%
//   days < 14             -> 0%
//
// "days" is whole calendar days from `today` (UTC midnight) to `checkIn`.

const PCT = { FULL: 1, HALF: 0.5, QUARTER: 0.25, NONE: 0 };

function utcMidnight(d) {
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00Z') : new Date(d);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function daysBetween(today, checkIn) {
  const ms = utcMidnight(checkIn) - utcMidnight(today);
  return Math.floor(ms / 86400000);
}

// Anonymous Gregorian computus -> Easter Sunday for a given year (UTC).
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function thirdMondayOfOctober(year) {
  // Find first Monday of October, then add 14 days.
  const oct1 = new Date(Date.UTC(year, 9, 1));
  const offset = (8 - oct1.getUTCDay()) % 7; // days until Monday (getUTCDay: Sun=0)
  const firstMonday = 1 + (offset === 0 ? 0 : offset);
  return new Date(Date.UTC(year, 9, firstMonday + 14));
}

function inRange(t, startUTC, endUTC) {
  return t >= startUTC && t <= endUTC;
}

/**
 * Is the given check-in date inside a non-refundable peak period?
 * Christmas/New Year, Easter weekend (Good Fri–Easter Mon), Emancipation/
 * Independence (Aug 1–6), Heroes weekend (Fri–Mon around 3rd Mon of October).
 */
export function isPeakPeriod(checkIn) {
  const d = new Date(utcMidnight(checkIn));
  const year = d.getUTCFullYear();
  const t = d.getTime();
  const md = (mon, day) => Date.UTC(year, mon - 1, day);

  // Christmas & New Year — Dec 20 through Jan 2 (spans year boundary).
  if (t >= md(12, 20) || t <= md(1, 2)) return 'christmas-new-year';

  // Emancipation (Aug 1) & Independence (Aug 6) — Aug 1–6.
  if (inRange(t, md(8, 1), md(8, 6))) return 'emancipation-independence';

  // Easter weekend — Good Friday (Easter - 2) through Easter Monday (+1).
  const easter = easterSunday(year).getTime();
  if (inRange(t, easter - 2 * 86400000, easter + 1 * 86400000)) return 'easter';

  // Heroes weekend — Friday before through the 3rd Monday of October.
  const heroes = thirdMondayOfOctober(year).getTime();
  if (inRange(t, heroes - 3 * 86400000, heroes)) return 'heroes';

  return null;
}

/**
 * @param {object}  p
 * @param {string}  p.checkIn       YYYY-MM-DD
 * @param {number}  p.amountPaid    amount actually paid
 * @param {string|Date} p.today     reference "now" (defaults to current date)
 * @param {boolean} p.forceMajeure  owner-declared force majeure
 * @returns {{amount:number, pct:number, reason:string}}
 */
export function computeRefund({ checkIn, amountPaid, today = new Date(), forceMajeure = false }) {
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  if (forceMajeure) {
    return { amount: round2(amountPaid * PCT.FULL), pct: PCT.FULL, reason: 'force-majeure' };
  }

  const peak = isPeakPeriod(checkIn);
  if (peak) {
    return { amount: 0, pct: PCT.NONE, reason: `peak-period:${peak}` };
  }

  const days = daysBetween(today, checkIn);
  let pct, reason;
  if (days > 60)       { pct = PCT.FULL;    reason = 'more-than-60-days'; }
  else if (days >= 30) { pct = PCT.HALF;    reason = '30-to-60-days'; }
  else if (days >= 14) { pct = PCT.QUARTER; reason = '14-to-29-days'; }
  else                 { pct = PCT.NONE;    reason = 'less-than-14-days'; }

  return { amount: round2(amountPaid * pct), pct, reason };
}
