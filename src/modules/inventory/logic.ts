import type { Paise, Product, ServiceRecipe, StockMovement, StockMovementType } from '@/types';
import { nonNegative } from '@/utils/money';

/**
 * Inventory ledger maths. Current stock is always derivable from movements,
 * which is what makes reconciliation possible.
 */

export function isInward(type: StockMovementType): boolean {
  return type === 'PURCHASE' || type === 'RETURN' || type === 'CANCELLATION_REVERSAL' || type === 'CORRECTION';
}

/** Movement quantity with the sign applied (positive = stock in). */
export function signedQuantity(type: StockMovementType, quantity: number): number {
  const magnitude = Math.abs(quantity);
  return isInward(type) ? magnitude : -magnitude;
}

export function ledgerStock(movements: Array<Pick<StockMovement, 'quantity'>>): number {
  return movements.reduce((total, movement) => total + movement.quantity, 0);
}

export function stockFor(productId: string, movements: StockMovement[]): number {
  return ledgerStock(movements.filter((movement) => movement.productId === productId));
}

export function movementsFor(productId: string, movements: StockMovement[]): StockMovement[] {
  return movements
    .filter((movement) => movement.productId === productId)
    .sort((a, b) => a.occurredAt - b.occurredAt);
}

export interface StockLevel {
  product: Product;
  stock: number;
  shortfall: number;
}

/** Products at or below their minimum threshold, worst first. */
export function lowStockProducts(products: Product[], movements: StockMovement[]): StockLevel[] {
  return products
    .filter((product) => product.isActive)
    .map((product) => {
      const stock = stockFor(product.id, movements);
      return { product, stock, shortfall: Math.max(0, product.minStock - stock) };
    })
    .filter((level) => level.stock <= level.product.minStock)
    .sort((a, b) => b.shortfall - a.shortfall);
}

/** Value of stock on hand at purchase cost. */
export function stockValue(products: Product[], movements: StockMovement[]): Paise {
  return products.reduce((total, product) => {
    const stock = stockFor(product.id, movements);
    return total + Math.max(0, stock) * product.purchasePrice;
  }, 0);
}

export interface StockMismatch {
  product: Product;
  cached: number;
  ledger: number;
}

/** Compares the cached quantity against the movement ledger. */
export function reconcileStock(products: Product[], movements: StockMovement[]): StockMismatch[] {
  return products
    .map((product) => ({ product, cached: product.stockCached, ledger: stockFor(product.id, movements) }))
    .filter((row) => row.cached !== row.ledger);
}

export interface ConsumptionPlanItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

/**
 * Converts bill service lines into product consumption using configured recipes.
 * Quantities are multiplied by the billed service quantity.
 */
export function planServiceConsumption(
  serviceLines: Array<{ refId?: string; quantity: number }>,
  recipes: ServiceRecipe[],
): ConsumptionPlanItem[] {
  const plan = new Map<string, ConsumptionPlanItem>();

  for (const line of serviceLines) {
    if (!line.refId) continue;
    const matches = recipes.filter((recipe) => recipe.serviceId === line.refId);
    for (const recipe of matches) {
      const quantity = Math.max(0, recipe.quantity) * Math.max(0, line.quantity);
      if (!quantity) continue;
      const existing = plan.get(recipe.productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        plan.set(recipe.productId, {
          productId: recipe.productId,
          productName: recipe.productName,
          quantity,
          unit: recipe.unit,
        });
      }
    }
  }

  return Array.from(plan.values());
}

/** Prevent a manual outward movement from pushing stock below zero. */
export function clampOutward(currentStock: number, requested: number): number {
  return Math.min(nonNegative(requested), nonNegative(currentStock));
}
