import { describe, expect, it } from 'vitest';
import {
  balanceDue,
  computeTotals,
  deriveBillStatus,
  discountFromPercent,
  lineTotal,
  nextBillNumber,
  serviceRevenueOf,
  splitAmount,
  type BillLineDraft,
} from '@/modules/billing/logic';

const line = (overrides: Partial<BillLineDraft> = {}): BillLineDraft => ({
  itemType: 'SERVICE',
  name: 'Hair Spa',
  quantity: 1,
  unitPrice: 100_000,
  discount: 0,
  ...overrides,
});

describe('billing totals', () => {
  it('sums lines and applies no discounts', () => {
    const totals = computeTotals([line(), line({ name: 'Facial', unitPrice: 80_000 })]);
    expect(totals.subtotal).toBe(180_000);
    expect(totals.total).toBe(180_000);
    expect(totals.taxAmount).toBe(0);
  });

  it('applies line, offer and bill discounts in order', () => {
    const totals = computeTotals([line({ discount: 10_000 })], {
      offerDiscount: 5_000,
      billDiscount: 5_000,
      taxPercent: 18,
    });
    expect(totals.subtotal).toBe(100_000);
    expect(totals.itemDiscount).toBe(10_000);
    expect(totals.offerDiscount).toBe(5_000);
    expect(totals.billDiscount).toBe(5_000);
    expect(totals.taxableAmount).toBe(80_000);
    expect(totals.taxAmount).toBe(14_400);
    expect(totals.total).toBe(94_400);
  });

  it('never lets a discount push a bill below zero', () => {
    const totals = computeTotals([line({ unitPrice: 1_000, discount: 5_000 })], {
      offerDiscount: 10_000,
      billDiscount: 10_000,
      taxPercent: 18,
    });
    expect(totals.itemDiscount).toBe(1_000);
    expect(totals.offerDiscount).toBe(0);
    expect(totals.billDiscount).toBe(0);
    expect(totals.total).toBe(0);
  });

  it('rounds tax to the nearest paise', () => {
    const totals = computeTotals([line({ unitPrice: 33_333 })], { taxPercent: 18 });
    expect(totals.taxAmount).toBe(6_000);
  });

  it('caps a line discount at the line value', () => {
    expect(lineTotal(line({ quantity: 2, discount: 999_999 }))).toBe(0);
  });

  it('computes a percentage discount from the gross line', () => {
    expect(discountFromPercent({ quantity: 3, unitPrice: 10_000 }, 10)).toBe(3_000);
  });

  it('separates service revenue from product revenue', () => {
    const revenue = serviceRevenueOf([
      line(),
      line({ itemType: 'PRODUCT', name: 'Serum', unitPrice: 50_000 }),
      line({ itemType: 'COMBO', name: 'Combo', unitPrice: 199_900 }),
    ]);
    expect(revenue).toBe(299_900);
  });
});

describe('bill status and balance', () => {
  it('marks an unpaid bill pending', () => {
    expect(deriveBillStatus({ total: 100_000, paid: 0 })).toBe('PENDING');
    expect(balanceDue(100_000, 0)).toBe(100_000);
  });

  it('marks partial payments', () => {
    expect(deriveBillStatus({ total: 100_000, paid: 40_000 })).toBe('PARTIALLY_PAID');
    expect(balanceDue(100_000, 40_000)).toBe(60_000);
  });

  it('marks paid bills and zero balance', () => {
    expect(deriveBillStatus({ total: 100_000, paid: 100_000 })).toBe('PAID');
    expect(balanceDue(100_000, 100_000)).toBe(0);
  });

  it('handles refunds without creating fresh dues', () => {
    expect(deriveBillStatus({ total: 100_000, paid: 100_000, refunded: 30_000 })).toBe(
      'PARTIALLY_REFUNDED',
    );
    expect(deriveBillStatus({ total: 100_000, paid: 100_000, refunded: 100_000 })).toBe('REFUNDED');
    expect(balanceDue(100_000, 100_000)).toBe(0);
  });

  it('cancelled bills always report cancelled and no balance', () => {
    expect(deriveBillStatus({ total: 100_000, paid: 100_000, cancelled: true })).toBe('CANCELLED');
    expect(balanceDue(100_000, 100_000, true)).toBe(0);
  });
});

describe('bill numbers', () => {
  it('starts at 00001', () => {
    expect(nextBillNumber('ZN', 2026, [])).toBe('ZN-2026-00001');
  });

  it('continues after the highest existing number', () => {
    expect(nextBillNumber('ZN', 2026, ['ZN-2026-00009', 'ZN-2025-00040'])).toBe('ZN-2026-00010');
  });

  it('ignores malformed numbers and sanitises the prefix', () => {
    expect(nextBillNumber('z n', 2026, ['ZN-2026-abc', 'XX-2026-00001'])).toBe('ZN-2026-00001');
  });
});

describe('split payments', () => {
  it('keeps every paise when splitting', () => {
    const parts = splitAmount(100_000, 3);
    expect(parts).toEqual([33_333, 33_333, 33_334]);
    expect(parts.reduce((total, part) => total + part, 0)).toBe(100_000);
  });
});
