import { db } from '@/db/database';
import type { Offer, OfferType, Paise } from '@/types';
import { newId } from '@/utils/id';
import { sumPaise } from '@/utils/money';
import { logAudit } from './auditRepo';

export interface OfferInput {
  id?: string;
  name: string;
  description?: string;
  type: OfferType;
  serviceIds: string[];
  offerPrice: Paise;
  discountPercent?: number;
  validFrom?: string;
  validTo?: string;
  conditions?: string;
  isActive: boolean;
}

export async function listOffers(includeInactive = true): Promise<Offer[]> {
  const offers = await db.offers.orderBy('name').toArray();
  return includeInactive ? offers : offers.filter((offer) => offer.isActive);
}

export async function saveOffer(input: OfferInput): Promise<Offer> {
  const name = input.name.trim();
  if (!name) throw new Error('Offer name is required.');
  if (!input.serviceIds.length) throw new Error('Select at least one service for this offer.');
  if (input.offerPrice < 0) throw new Error('Offer price cannot be negative.');
  if (input.validFrom && input.validTo && input.validFrom > input.validTo) {
    throw new Error('The offer end date must be after the start date.');
  }

  const services = await db.services.bulkGet(input.serviceIds);
  const originalPrice = sumPaise(services.map((service) => service?.price ?? 0));
  const now = Date.now();

  const offer: Offer = {
    id: input.id ?? newId(),
    createdAt: now,
    updatedAt: now,
    name,
    description: input.description?.trim() || undefined,
    type: input.type,
    serviceIds: input.serviceIds,
    originalPrice,
    offerPrice: Math.round(input.offerPrice),
    discountPercent: input.discountPercent,
    validFrom: input.validFrom || undefined,
    validTo: input.validTo || undefined,
    conditions: input.conditions?.trim() || undefined,
    isActive: input.isActive,
  };

  await db.transaction('rw', db.offers, db.offerServices, async () => {
    if (input.id) {
      const existing = await db.offers.get(input.id);
      if (existing) offer.createdAt = existing.createdAt;
    }
    await db.offers.put(offer);
    await db.offerServices.where('offerId').equals(offer.id).delete();
    await db.offerServices.bulkAdd(
      input.serviceIds.map((serviceId) => ({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        offerId: offer.id,
        serviceId,
        quantity: 1,
      })),
    );
  });

  await logAudit({
    action: 'OFFER_SAVE',
    entityType: 'offer',
    entityId: offer.id,
    newValue: { name: offer.name, offerPrice: offer.offerPrice, serviceIds: offer.serviceIds },
  });
  return offer;
}

export async function setOfferActive(id: string, isActive: boolean): Promise<void> {
  await db.offers.update(id, { isActive, updatedAt: Date.now() });
}
