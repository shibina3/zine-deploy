import type { Paise } from '@/types';

/**
 * Money helpers.
 *
 * Zine stores every monetary value as integer paise. These helpers are the only
 * place where we convert to/from human-readable rupees, so floating point never
 * leaks into stored values or arithmetic.
 */

export const PAISE_PER_RUPEE = 100;

/** Convert rupees (may be fractional) to rounded integer paise. */
export function toPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * PAISE_PER_RUPEE);
}

/** Convert paise to rupees as a float (display only, never persist). */
export function toRupees(paise: Paise): number {
  return paise / PAISE_PER_RUPEE;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrFormatterPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plainFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** `₹1,500` — the default salon money format (whole rupees). */
export function formatINR(paise: Paise, opts: { showPaise?: boolean } = {}): string {
  const safe = Number.isFinite(paise) ? paise : 0;
  return opts.showPaise ? inrFormatterPaise.format(safe / 100) : inrFormatter.format(safe / 100);
}

/** `1,500` without the currency symbol. */
export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Compact money for chart axes: `₹1.5L`, `₹24k`. */
export function formatCompactINR(paise: Paise): string {
  const rupees = Math.abs(paise) / 100;
  const sign = paise < 0 ? '-' : '';
  if (rupees >= 10000000) return `${sign}₹${trim(rupees / 10000000)}Cr`;
  if (rupees >= 100000) return `${sign}₹${trim(rupees / 100000)}L`;
  if (rupees >= 1000) return `${sign}₹${trim(rupees / 1000)}k`;
  return `${sign}₹${plainFormatter.format(rupees)}`;
}

function trim(value: number): string {
  return Number(value.toFixed(1)).toString();
}

/** Parse a user-typed rupee string (`1,499.50`) into integer paise. */
export function parseRupees(input: string | number | null | undefined): Paise {
  if (input === null || input === undefined || input === '') return 0;
  if (typeof input === 'number') return toPaise(input);
  const cleaned = input.replace(/[₹,\s]/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? toPaise(value) : 0;
}

/** Prepares a paise value for a rupee input field: `1500` or `1499.5`. */
export function rupeesForInput(paise: Paise): string {
  if (!paise) return '';
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

/** Sum a list of paise values safely. */
export function sumPaise(values: Array<number | undefined | null>): Paise {
  return values.reduce<number>((total, value) => total + (Number.isFinite(value) ? Number(value) : 0), 0);
}

/** Percentage of an integer paise amount, rounded to the nearest paise. */
export function percentOf(paise: Paise, percent: number): Paise {
  if (!Number.isFinite(percent) || percent === 0) return 0;
  return Math.round((paise * percent) / 100);
}

/** Basis points of an amount (500 bps = 5%). */
export function bpsOf(paise: Paise, bps: number): Paise {
  if (!Number.isFinite(bps) || bps === 0) return 0;
  return Math.round((paise * bps) / 10000);
}

/** Difference as a percentage, rounded to one decimal. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/** Never allow an amount below zero. */
export function nonNegative(paise: Paise): Paise {
  return paise > 0 ? paise : 0;
}
