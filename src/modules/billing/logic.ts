import type { BillStatus, ItemType, Paise } from '@/types';
import { nonNegative, percentOf, sumPaise } from '@/utils/money';

/**
 * Billing calculations.
 *
 * All values are integer paise. The pipeline is:
 *   subtotal → line discounts → offer discount → bill discount → tax → total
 * Every step is rounded to whole paise and clamped so a bill can never go negative.
 */

export interface BillLineDraft {
  itemType: ItemType;
  refId?: string;
  name: string;
  category?: string;
  quantity: number;
  /** Unit price in paise. */
  unitPrice: Paise;
  /** Absolute discount for the whole line, in paise. */
  discount: Paise;
}

export interface BillTotals {
  subtotal: Paise;
  itemDiscount: Paise;
  offerDiscount: Paise;
  billDiscount: Paise;
  taxableAmount: Paise;
  taxPercent: number;
  taxAmount: Paise;
  total: Paise;
}

export interface TotalsOptions {
  billDiscount?: Paise;
  offerDiscount?: Paise;
  taxPercent?: number;
}

/** Price of a single line before discount. */
export function lineGross(line: Pick<BillLineDraft, 'quantity' | 'unitPrice'>): Paise {
  const quantity = Number.isFinite(line.quantity) ? Math.max(0, line.quantity) : 0;
  return Math.round(quantity * line.unitPrice);
}

/** Discount can never exceed the line value. */
export function sanitiseLineDiscount(line: Pick<BillLineDraft, 'quantity' | 'unitPrice' | 'discount'>): Paise {
  const gross = lineGross(line);
  const discount = Number.isFinite(line.discount) ? Math.max(0, line.discount) : 0;
  return Math.min(discount, gross);
}

/** Net value of a single line. */
export function lineTotal(line: BillLineDraft): Paise {
  return lineGross(line) - sanitiseLineDiscount(line);
}

/** A percentage discount helper for the UI. */
export function discountFromPercent(line: Pick<BillLineDraft, 'quantity' | 'unitPrice'>, percent: number): Paise {
  return Math.min(percentOf(lineGross(line), percent), lineGross(line));
}

export function computeTotals(lines: BillLineDraft[], options: TotalsOptions = {}): BillTotals {
  const subtotal = sumPaise(lines.map(lineGross));
  const itemDiscount = sumPaise(lines.map(sanitiseLineDiscount));

  const afterLines = nonNegative(subtotal - itemDiscount);
  const offerDiscount = Math.min(Math.max(0, options.offerDiscount ?? 0), afterLines);
  const afterOffer = nonNegative(afterLines - offerDiscount);
  const billDiscount = Math.min(Math.max(0, options.billDiscount ?? 0), afterOffer);
  const taxableAmount = nonNegative(afterOffer - billDiscount);

  const taxPercent = Math.max(0, options.taxPercent ?? 0);
  const taxAmount = percentOf(taxableAmount, taxPercent);
  const total = taxableAmount + taxAmount;

  return {
    subtotal,
    itemDiscount,
    offerDiscount,
    billDiscount,
    taxableAmount,
    taxPercent,
    taxAmount,
    total,
  };
}

/** Total of only the service lines (used for employee commission). */
export function serviceRevenueOf(lines: BillLineDraft[]): Paise {
  return sumPaise(lines.filter((line) => line.itemType === 'SERVICE' || line.itemType === 'COMBO').map(lineTotal));
}

/** Total of only the product lines. */
export function productRevenueOf(lines: BillLineDraft[]): Paise {
  return sumPaise(lines.filter((line) => line.itemType === 'PRODUCT').map(lineTotal));
}

export interface StatusInput {
  total: Paise;
  paid: Paise;
  refunded?: Paise;
  cancelled?: boolean;
}

/**
 * Derives the bill status from money movement.
 * A cancelled bill always reports CANCELLED, even if payments were recorded.
 */
export function deriveBillStatus({ total, paid, refunded = 0, cancelled = false }: StatusInput): BillStatus {
  if (cancelled) return 'CANCELLED';
  if (refunded > 0) {
    return refunded >= paid ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  }
  if (paid >= total) return 'PAID';
  if (paid > 0) return 'PARTIALLY_PAID';
  return 'PENDING';
}

/**
 * Outstanding balance. Refunds reverse money already collected; they never create
 * a fresh receivable for the customer.
 */
export function balanceDue(total: Paise, paid: Paise, cancelled = false): Paise {
  if (cancelled) return 0;
  return nonNegative(total - paid);
}

/** Clamps a payment so it cannot exceed the outstanding balance. */
export function maxAdditionalPayment(total: Paise, paid: Paise): Paise {
  return nonNegative(total - paid);
}

/**
 * Splits an order total into suggested split-payment rows. Keeps every paise:
 * the final row absorbs the rounding remainder.
 */
export function splitAmount(total: Paise, ways: number): Paise[] {
  const count = Math.max(1, Math.floor(ways));
  const base = Math.floor(total / count);
  const parts = Array.from({ length: count }, () => base);
  parts[count - 1] += total - base * count;
  return parts;
}

/** Builds a bill number: PREFIX-YYYY-NNNNN, continuing the highest existing sequence. */
export function nextBillNumber(prefix: string, year: number, existing: string[]): string {
  const safePrefix = (prefix || 'ZN').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pattern = new RegExp(`^${safePrefix}-${year}-(\\d+)$`);
  let highest = 0;
  for (const number of existing) {
    const match = pattern.exec(number);
    if (match) highest = Math.max(highest, Number.parseInt(match[1], 10));
  }
  return `${safePrefix}-${year}-${String(highest + 1).padStart(5, '0')}`;
}

/** Rounding helper used by the receipt and dashboard: never show negative zero. */
export function displayTotal(total: Paise): Paise {
  return total === 0 ? 0 : total;
}
