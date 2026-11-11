import type { Offer, Paise, Service } from '@/types';
import { nonNegative, percentOf, sumPaise } from '@/utils/money';
import { todayISO } from '@/utils/date';

/** Offer validity and pricing helpers (pure). */

export function isOfferActive(offer: Offer, dateISO = todayISO()): boolean {
  if (!offer.isActive) return false;
  if (offer.validFrom && dateISO < offer.validFrom) return false;
  if (offer.validTo && dateISO > offer.validTo) return false;
  return true;
}

export function offerServices(offer: Offer, services: Service[]): Service[] {
  return services.filter((service) => offer.serviceIds.includes(service.id));
}

/** Sum of the normal (menu) price of the services in an offer. */
export function menuPriceFor(offer: Offer, services: Service[]): Paise {
  return sumPaise(offerServices(offer, services).map((service) => service.price));
}

/**
 * Effective selling price of an offer.
 *  - COMBO / BRIDAL packages use the configured package price.
 *  - PERCENTAGE / PROMO apply the percentage to the selected services.
 *  - FIXED subtracts a fixed rupee amount from the menu total.
 */
export function effectiveOfferPrice(offer: Offer, services: Service[]): Paise {
  if (offer.type === 'COMBO' || offer.type === 'BRIDAL') {
    return nonNegative(offer.offerPrice);
  }
  const menuTotal = menuPriceFor(offer, services);
  if (offer.type === 'PERCENTAGE' || offer.type === 'PROMO') {
    const percent = offer.discountPercent ?? discountPercentFrom(offer, menuTotal);
    return nonNegative(menuTotal - percentOf(menuTotal, percent));
  }
  return nonNegative(menuTotal - offer.offerPrice);
}

/** Derives a percentage from the configured prices when not stored explicitly. */
export function discountPercentFrom(offer: Offer, menuTotal?: Paise): number {
  if (typeof offer.discountPercent === 'number') return offer.discountPercent;
  const total = menuTotal ?? offer.originalPrice;
  if (!total) return 0;
  return Math.round(((total - offer.offerPrice) / total) * 1000) / 10;
}

/** Savings against the normal menu price. */
export function offerSavings(offer: Offer, services: Service[]): Paise {
  const menuTotal = menuPriceFor(offer, services);
  return nonNegative(menuTotal - effectiveOfferPrice(offer, services));
}

export interface OfferValidation {
  valid: boolean;
  problems: string[];
}

export function validateOffer(offer: Offer, services: Service[], dateISO = todayISO()): OfferValidation {
  const problems: string[] = [];
  if (!offer.name.trim()) problems.push('Offer needs a name.');
  if (!offer.serviceIds.length) problems.push('Select at least one service.');
  if (offer.offerPrice < 0) problems.push('Offer price cannot be negative.');
  if (offer.validFrom && offer.validTo && offer.validFrom > offer.validTo) {
    problems.push('Validity start date is after the end date.');
  }
  const menuTotal = menuPriceFor(offer, services);
  if (menuTotal > 0 && offer.offerPrice > menuTotal) {
    problems.push('Offer price is higher than the normal menu price.');
  }
  if (!isOfferActive(offer, dateISO)) problems.push('Offer is not active for today.');
  return { valid: problems.length === 0, problems };
}

/** Short label used in the billing dropdown, e.g. `Hair Care Combo · ₹1,499`. */
export function offerTypeHint(offer: Offer): string {
  switch (offer.type) {
    case 'PERCENTAGE':
      return `${offer.discountPercent ?? 0}% off`;
    case 'FIXED':
      return `${offer.offerPrice / 100} off`;
    case 'COMBO':
      return 'Combo';
    case 'BRIDAL':
      return 'Bridal package';
    default:
      return 'Promotion';
  }
}
