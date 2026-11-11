import { db } from '@/db/database';
import type { Paise, Service, ServiceRecipe } from '@/types';
import { newId } from '@/utils/id';

export interface ServiceInput {
  id?: string;
  name: string;
  category: string;
  description?: string;
  price: Paise;
  durationMinutes: number;
  isActive?: boolean;
}

export async function listServices(includeInactive = false): Promise<Service[]> {
  const services = await db.services.orderBy('name').toArray();
  return includeInactive ? services : services.filter((service) => service.isActive);
}

export async function saveService(input: ServiceInput): Promise<Service> {
  const name = input.name.trim();
  if (!name) throw new Error('Service name is required.');
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error('Price must be a positive amount.');

  const now = Date.now();
  if (input.id) {
    const existing = await db.services.get(input.id);
    if (!existing) throw new Error('Service not found.');
    const updated: Service = {
      ...existing,
      name,
      category: input.category || 'Other',
      description: input.description?.trim() || undefined,
      price: Math.round(input.price),
      durationMinutes: Math.max(5, Math.round(input.durationMinutes)),
      isActive: input.isActive ?? existing.isActive,
      updatedAt: now,
    };
    await db.services.put(updated);
    return updated;
  }

  const service: Service = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name,
    category: input.category || 'Other',
    description: input.description?.trim() || undefined,
    price: Math.round(input.price),
    durationMinutes: Math.max(5, Math.round(input.durationMinutes)),
    isActive: input.isActive ?? true,
  };
  await db.services.add(service);
  return service;
}

export async function setServiceActive(id: string, isActive: boolean): Promise<void> {
  await db.services.update(id, { isActive, updatedAt: Date.now() });
}

export async function serviceById(id: string): Promise<Service | undefined> {
  return db.services.get(id);
}

/** Distinct categories already used, so the form can suggest them. */
export async function serviceCategories(): Promise<string[]> {
  const services = await db.services.toArray();
  return Array.from(new Set(services.map((service) => service.category))).sort();
}

export async function recipesForService(serviceId: string): Promise<ServiceRecipe[]> {
  return db.serviceRecipes.where('serviceId').equals(serviceId).toArray();
}

export async function allRecipes(): Promise<ServiceRecipe[]> {
  return db.serviceRecipes.toArray();
}

export async function saveRecipe(input: {
  id?: string;
  serviceId: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}): Promise<ServiceRecipe> {
  if (input.quantity <= 0) throw new Error('Consumption quantity must be greater than zero.');
  const now = Date.now();
  const record: ServiceRecipe = {
    id: input.id ?? newId(),
    createdAt: now,
    updatedAt: now,
    serviceId: input.serviceId,
    productId: input.productId,
    productName: input.productName,
    quantity: input.quantity,
    unit: input.unit,
  };
  await db.serviceRecipes.put(record);
  return record;
}

export async function deleteRecipe(id: string): Promise<void> {
  await db.serviceRecipes.delete(id);
}
