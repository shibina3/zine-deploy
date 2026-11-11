import { describe, expect, it } from 'vitest';
import type { Offer, Service } from '@/types';
import {
  effectiveOfferPrice,
  isOfferActive,
  menuPriceFor,
  offerSavings,
  validateOffer,
} from '@/modules/offers/logic';

const service = (id: string, price: number): Service => ({
  id,
  createdAt: 0,
  updatedAt: 0,
  name: `Service ${id}`,
  category: 'Hair',
  price,
  durationMinutes: 60,
  isActive: true,
});

const services = [service('s1', 100_000), service('s2', 80_000)];

const offer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 'o1',
  createdAt: 0,
  updatedAt: 0,
  name: 'Hair Combo',
  type: 'COMBO',
  serviceIds: ['s1', 's2'],
  originalPrice: 180_000,
  offerPrice: 149_900,
  isActive: true,
  ...overrides,
});

describe('offers and combos', () => {
  it('sums the normal menu price of included services', () => {
    expect(menuPriceFor(offer(), services)).toBe(180_000);
  });

  it('uses the package price for combos and saves the difference', () => {
    expect(effectiveOfferPrice(offer(), services)).toBe(149_900);
    expect(offerSavings(offer(), services)).toBe(30_100);
  });

  it('applies percentage discounts to the menu total', () => {
    const percent = offer({ type: 'PERCENTAGE', discountPercent: 20, offerPrice: 0 });
    expect(effectiveOfferPrice(percent, services)).toBe(144_000);
  });

  it('subtracts fixed discounts', () => {
    const fixed = offer({ type: 'FIXED', offerPrice: 25_000 });
    expect(effectiveOfferPrice(fixed, services)).toBe(155_000);
  });

  it('never returns a negative price', () => {
    const fixed = offer({ type: 'FIXED', offerPrice: 999_999 });
    expect(effectiveOfferPrice(fixed, services)).toBe(0);
  });

  it('respects validity dates and active state', () => {
    expect(isOfferActive(offer({ validFrom: '2026-11-01', validTo: '2026-11-30' }), '2026-11-10')).toBe(true);
    expect(isOfferActive(offer({ validTo: '2026-11-09' }), '2026-11-10')).toBe(false);
    expect(isOfferActive(offer({ validFrom: '2026-11-11' }), '2026-11-10')).toBe(false);
    expect(isOfferActive(offer({ isActive: false }), '2026-11-10')).toBe(false);
  });

  it('flags invalid offers with reasons', () => {
    const result = validateOffer(
      offer({ name: '', serviceIds: [], validFrom: '2026-12-01', validTo: '2026-11-01' }),
      services,
      '2026-11-10',
    );
    expect(result.valid).toBe(false);
    expect(result.problems.length).toBeGreaterThanOrEqual(3);
  });

  it('accepts a valid active offer', () => {
    expect(validateOffer(offer(), services, '2026-11-10').valid).toBe(true);
  });
});
