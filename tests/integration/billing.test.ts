import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { setActor } from '@/services/actor';
import { ensureSettings } from '@/db/repositories/settingsRepo';
import { saveCustomer } from '@/db/repositories/customerRepo';
import { saveEmployee } from '@/db/repositories/employeeRepo';
import { saveRecipe, saveService } from '@/db/repositories/serviceRepo';
import { recordPurchase, saveProduct } from '@/db/repositories/inventoryRepo';
import { addPayment, createBill, createRefund } from '@/db/repositories/billingRepo';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await ensureSettings();
  setActor({ id: 'owner', name: 'Owner', role: 'OWNER' });
});

export async function seedSalon() {
  const customer = await saveCustomer({ name: 'Sneha Kulkarni', phone: '9900112233' });
  const employee = await saveEmployee({
    name: 'Anita Rao',
    phone: '9845012301',
    designation: 'Senior Stylist',
    joinedAt: '2025-01-01',
    salaryType: 'FIXED_PLUS_COMMISSION',
    fixedSalary: 1_800_000,
    commissionRateBps: 500,
    workingDaysPerMonth: 26,
  });
  const service = await saveService({
    name: 'Hair Spa',
    category: 'Hair',
    price: 100_000,
    durationMinutes: 60,
  });
  const product = await saveProduct({
    name: 'Hair Spa Cream',
    category: 'Hair care',
    unit: 'ml',
    purchasePrice: 5_000,
    sellingPrice: 8_000,
    minStock: 2,
  });
  await recordPurchase({ productId: product.id, quantity: 10, unitCost: 5_000 });
  await saveRecipe({
    serviceId: service.id,
    productId: product.id,
    productName: product.name,
    quantity: 2,
    unit: 'ml',
  });
  return { customer, employee, service, product };
}

export const serviceLine = (serviceId: string, name: string) => ({
  itemType: 'SERVICE' as const,
  refId: serviceId,
  name,
  quantity: 1,
  unitPrice: 100_000,
  discount: 0,
});

describe('billing transaction', () => {
  it('creates a bill with items, payments and stock movements atomically', async () => {
    const { customer, employee, service, product } = await seedSalon();

    const { bill, items } = await createBill({
      customerId: customer.id,
      employeeId: employee.id,
      lines: [
        {
          itemType: 'SERVICE',
          refId: service.id,
          name: service.name,
          category: service.category,
          quantity: 1,
          unitPrice: 100_000,
          discount: 0,
        },
        {
          itemType: 'PRODUCT',
          refId: product.id,
          name: product.name,
          category: product.category,
          quantity: 2,
          unitPrice: 8_000,
          discount: 0,
        },
      ],
      taxPercent: 0,
      payments: [{ amount: 60_000, method: 'CASH' }],
    });

    expect(bill.billNumber).toMatch(/^ZN-\d{4}-00001$/);
    expect(bill.total).toBe(116_000);
    expect(bill.paid).toBe(60_000);
    expect(bill.balance).toBe(56_000);
    expect(bill.status).toBe('PARTIALLY_PAID');
    expect(items).toHaveLength(2);

    const stored = await db.products.get(product.id);
    expect(stored?.stockCached).toBe(6);

    const movements = await db.stockMovements.where('referenceId').equals(bill.id).toArray();
    expect(movements.map((movement) => movement.type).sort()).toEqual([
      'SALE',
      'SERVICE_CONSUMPTION',
    ]);

    const updatedCustomer = await db.customers.get(customer.id);
    expect(updatedCustomer?.totalSpend).toBe(116_000);
    expect(await db.bills.count()).toBe(1);
  });

  it('records additional payments and settles the bill', async () => {
    const { customer, employee, service } = await seedSalon();
    const { bill } = await createBill({
      customerId: customer.id,
      employeeId: employee.id,
      lines: [serviceLine(service.id, service.name)],
      taxPercent: 0,
      payments: [{ amount: 40_000, method: 'UPI' }],
    });

    const updated = await addPayment(bill.id, { amount: 60_000, method: 'CASH' });
    expect(updated.paid).toBe(100_000);
    expect(updated.balance).toBe(0);
    expect(updated.status).toBe('PAID');

    const payments = await db.payments.where('billId').equals(bill.id).toArray();
    expect(payments).toHaveLength(2);
  });

  it('records refunds separately without changing the paid amount', async () => {
    const { customer, employee, service } = await seedSalon();
    const { bill } = await createBill({
      customerId: customer.id,
      employeeId: employee.id,
      lines: [serviceLine(service.id, service.name)],
      taxPercent: 0,
      payments: [{ amount: 100_000, method: 'CARD' }],
    });

    const refund = await createRefund(bill.id, {
      amount: 30_000,
      method: 'CASH',
      reason: 'Service issue',
    });
    expect(refund.amount).toBe(30_000);

    const stored = await db.bills.get(bill.id);
    expect(stored?.paid).toBe(100_000);
    expect(stored?.refunded).toBe(30_000);
    expect(stored?.status).toBe('PARTIALLY_REFUNDED');

    await expect(
      createRefund(bill.id, { amount: 500_000, method: 'CASH', reason: 'Too much' }),
    ).rejects.toThrow();
  });
});
