import { db } from '@/db/database';
import type { Paise, Product, StockMovement, StockMovementType, Supplier } from '@/types';
import { newId } from '@/utils/id';
import { signedQuantity } from '@/modules/inventory/logic';
import { getActor } from '@/services/actor';
import { logAudit } from './auditRepo';

export interface ProductInput {
  id?: string;
  name: string;
  sku?: string;
  category: string;
  supplierId?: string;
  unit: string;
  purchasePrice: Paise;
  sellingPrice: Paise;
  minStock: number;
  expiryDate?: string;
  isActive?: boolean;
  openingStock?: number;
}

export async function listProducts(includeInactive = false): Promise<Product[]> {
  const products = await db.products.orderBy('name').toArray();
  return includeInactive ? products : products.filter((product) => product.isActive);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return db.products.get(id);
}

function generateSku(name: string): string {
  const base =
    name
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'PRD';
  return `${base}-${newId().slice(0, 6).toUpperCase()}`;
}

export async function saveProduct(input: ProductInput): Promise<Product> {
  const name = input.name.trim();
  if (!name) throw new Error('Product name is required.');
  if (input.sellingPrice < 0 || input.purchasePrice < 0) throw new Error('Prices cannot be negative.');

  const now = Date.now();
  const sku = input.sku?.trim() || generateSku(name);

  if (input.id) {
    const existing = await db.products.get(input.id);
    if (!existing) throw new Error('Product not found.');
    const updated: Product = {
      ...existing,
      name,
      sku,
      category: input.category,
      supplierId: input.supplierId,
      unit: input.unit,
      purchasePrice: Math.round(input.purchasePrice),
      sellingPrice: Math.round(input.sellingPrice),
      minStock: Math.max(0, Math.round(input.minStock)),
      expiryDate: input.expiryDate || undefined,
      isActive: input.isActive ?? existing.isActive,
      updatedAt: now,
    };
    await db.products.put(updated);
    return updated;
  }

  const product: Product = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name,
    sku,
    category: input.category,
    supplierId: input.supplierId,
    unit: input.unit,
    purchasePrice: Math.round(input.purchasePrice),
    sellingPrice: Math.round(input.sellingPrice),
    stockCached: 0,
    minStock: Math.max(0, Math.round(input.minStock)),
    expiryDate: input.expiryDate || undefined,
    isActive: input.isActive ?? true,
  };
  await db.products.add(product);

  if (input.openingStock && input.openingStock > 0) {
    await applyMovement({
      productId: product.id,
      type: 'PURCHASE',
      quantity: input.openingStock,
      unitCost: product.purchasePrice,
      referenceType: 'MANUAL',
      note: 'Opening stock',
    });
  }
  return (await db.products.get(product.id)) ?? product;
}

export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  await db.products.update(id, { isActive, updatedAt: Date.now() });
}

export async function listSuppliers(): Promise<Supplier[]> {
  return db.suppliers.orderBy('name').toArray();
}

export async function saveSupplier(input: {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}): Promise<Supplier> {
  const name = input.name.trim();
  if (!name) throw new Error('Supplier name is required.');
  const now = Date.now();
  if (input.id) {
    const existing = await db.suppliers.get(input.id);
    if (!existing) throw new Error('Supplier not found.');
    const updated: Supplier = { ...existing, ...input, name, id: existing.id, updatedAt: now };
    await db.suppliers.put(updated);
    return updated;
  }
  const supplier: Supplier = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    address: input.address?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  };
  await db.suppliers.add(supplier);
  return supplier;
}

export interface MovementInput {
  productId: string;
  type: StockMovementType;
  /** Magnitude for directional types; signed for CORRECTION. */
  quantity: number;
  unitCost?: Paise;
  supplierId?: string;
  invoiceRef?: string;
  referenceType?: 'BILL' | 'PURCHASE' | 'MANUAL' | 'BILL_CANCEL';
  referenceId?: string;
  note?: string;
  occurredAt?: number;
}

/**
 * Applies one stock movement and updates the cached quantity.
 * Must be called inside an ambient Dexie transaction (bill creation does this).
 */
export async function applyMovement(input: MovementInput, now = Date.now()): Promise<StockMovement> {
  const product = await db.products.get(input.productId);
  if (!product) throw new Error('Product not found.');

  const signed =
    input.type === 'CORRECTION' ? Math.round(input.quantity) : signedQuantity(input.type, input.quantity);
  if (!signed) throw new Error('Stock movement quantity cannot be zero.');

  const actor = getActor();
  const movement: StockMovement = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    productId: product.id,
    productName: product.name,
    type: input.type,
    quantity: signed,
    unitCost: input.unitCost ?? product.purchasePrice,
    supplierId: input.supplierId,
    invoiceRef: input.invoiceRef?.trim() || undefined,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    note: input.note?.trim() || undefined,
    occurredAt: input.occurredAt ?? now,
    createdByName: actor.name,
  };

  await db.stockMovements.add(movement);
  await db.products.update(product.id, {
    stockCached: product.stockCached + signed,
    updatedAt: now,
  });
  return movement;
}

/** Public entry point: runs the movement in its own transaction and audits it. */
export async function recordMovement(input: MovementInput): Promise<StockMovement> {
  let movement: StockMovement | undefined;
  await db.transaction('rw', db.stockMovements, db.products, async () => {
    movement = await applyMovement(input);
  });
  if (!movement) throw new Error('Stock movement failed.');

  await logAudit({
    action: 'STOCK_ADJUST',
    entityType: 'product',
    entityId: input.productId,
    reason: input.note,
    newValue: { type: input.type, quantity: movement.quantity, stock: undefined },
  });
  return movement;
}

/** Stock inward with purchase details. */
export async function recordPurchase(input: {
  productId: string;
  quantity: number;
  unitCost: Paise;
  supplierId?: string;
  invoiceRef?: string;
  note?: string;
  occurredAt?: number;
}): Promise<StockMovement> {
  if (input.quantity <= 0) throw new Error('Purchase quantity must be greater than zero.');
  return recordMovement({
    productId: input.productId,
    type: 'PURCHASE',
    quantity: input.quantity,
    unitCost: input.unitCost,
    supplierId: input.supplierId,
    invoiceRef: input.invoiceRef,
    referenceType: 'PURCHASE',
    note: input.note,
    occurredAt: input.occurredAt,
  });
}

export async function listMovements(options: { productId?: string; limit?: number } = {}): Promise<StockMovement[]> {
  const { productId, limit = 300 } = options;
  if (productId) {
    const rows = await db.stockMovements.where('productId').equals(productId).toArray();
    return rows.sort((a, b) => b.occurredAt - a.occurredAt).slice(0, limit);
  }
  const rows = await db.stockMovements.orderBy('occurredAt').reverse().limit(limit).toArray();
  return rows;
}

/** Sets cached stock back to the ledger value. */
export async function reconcileProductStock(productId: string): Promise<number> {
  const movements = await db.stockMovements.where('productId').equals(productId).toArray();
  const ledger = movements.reduce((total, movement) => total + movement.quantity, 0);
  await db.products.update(productId, { stockCached: ledger, updatedAt: Date.now() });
  return ledger;
}

