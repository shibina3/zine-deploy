import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { setActor } from '@/services/actor';
import { ensureSettings } from '@/db/repositories/settingsRepo';
import { saveCustomer } from '@/db/repositories/customerRepo';
import { saveEmployee } from '@/db/repositories/employeeRepo';
import { saveService } from '@/db/repositories/serviceRepo';
import { recordPurchase, saveProduct } from '@/db/repositories/inventoryRepo';
import { cancelBill, createBill } from '@/db/repositories/billingRepo';
import { createInitialOwner, createUser, login } from '@/services/auth/authService';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await ensureSettings();
  setActor({ id: 'owner', name: 'Owner', role: 'OWNER' });
});

async function seed() {
  const customer = await saveCustomer({ name: 'Divya Menon', phone: '9900112244' });
  const employee = await saveEmployee({
    name: 'Meera Nair',
    phone: '9845012302',
    designation: 'Beautician',
    joinedAt: '2025-02-01',
    salaryType: 'FIXED',
    fixedSalary: 1_500_000,
    commissionRateBps: 0,
    workingDaysPerMonth: 26,
  });
  const service = await saveService({ name: 'Facial', category: 'Skin', price: 120_000, durationMinutes: 60 });
  const product = await saveProduct({
    name: 'Face Mask',
    category: 'Skin care',
    unit: 'ml',
    purchasePrice: 5_500,
    sellingPrice: 8_500,
    minStock: 2,
  });
  await recordPurchase({ productId: product.id, quantity: 4, unitCost: 5_500 });
  return { customer, employee, service, product };
}

describe('bill cancellation', () => {
  it('preserves the bill, reverses stock and keeps payments', async () => {
    const { customer, employee, service, product } = await seed();
    const { bill } = await createBill({
      customerId: customer.id,
      employeeId: employee.id,
      lines: [
        {
          itemType: 'SERVICE',
          refId: service.id,
          name: service.name,
          quantity: 1,
          unitPrice: 120_000,
          discount: 0,
        },
        {
          itemType: 'PRODUCT',
          refId: product.id,
          name: product.name,
          quantity: 2,
          unitPrice: 8_500,
          discount: 0,
        },
      ],
      taxPercent: 0,
      payments: [{ amount: 137_000, method: 'UPI' }],
    });

    expect((await db.products.get(product.id))?.stockCached).toBe(2);

    await cancelBill(bill.id, 'Duplicate bill created by mistake');

    const stored = await db.bills.get(bill.id);
    expect(stored?.status).toBe('CANCELLED');
    expect(stored?.balance).toBe(0);
    expect(stored?.cancelReason).toBe('Duplicate bill created by mistake');
    expect(stored?.cancelledAt).toBeTruthy();

    expect((await db.products.get(product.id))?.stockCached).toBe(4);
    expect(await db.payments.where('billId').equals(bill.id).count()).toBe(1);
    expect((await db.customers.get(customer.id))?.totalSpend).toBe(0);

    const reversals = await db.stockMovements
      .where('referenceId')
      .equals(bill.id)
      .filter((movement) => movement.type === 'CANCELLATION_REVERSAL')
      .toArray();
    expect(reversals).toHaveLength(1);
  });

  it('requires a reason and refuses double cancellation', async () => {
    const { customer, employee, service } = await seed();
    const { bill } = await createBill({
      customerId: customer.id,
      employeeId: employee.id,
      lines: [
        {
          itemType: 'SERVICE',
          refId: service.id,
          name: service.name,
          quantity: 1,
          unitPrice: 120_000,
          discount: 0,
        },
      ],
      taxPercent: 0,
      payments: [],
    });

    await expect(cancelBill(bill.id, 'no')).rejects.toThrow();
    await cancelBill(bill.id, 'Customer left without service');
    await expect(cancelBill(bill.id, 'Again')).rejects.toThrow();
  });
});

describe('authentication', () => {
  it('creates an owner, hashes the password and signs in', async () => {
    await db.users.clear();
    const owner = await createInitialOwner({
      username: 'Owner',
      password: 'salon1234',
      displayName: 'Anita',
    });

    expect(owner.username).toBe('owner');
    expect(owner.passwordHash).not.toContain('salon1234');
    expect(owner.passwordSalt).toBeTruthy();
    expect(owner.iterations).toBeGreaterThan(100_000);

    const wrong = await login('owner', 'wrongpass');
    expect(wrong.ok).toBe(false);

    const success = await login('OWNER', 'salon1234');
    expect(success.ok).toBe(true);

    const audits = await db.auditLogs.toArray();
    expect(audits.some((audit) => audit.action === 'LOGIN')).toBe(true);
    expect(audits.some((audit) => audit.action === 'LOGIN_FAILED')).toBe(true);
  });

  it('creates employee accounts with restricted permissions and rejects duplicates', async () => {
    await db.users.clear();
    await createInitialOwner({ username: 'owner', password: 'salon1234', displayName: 'Owner' });
    const employee = await createUser({
      username: 'meera',
      password: 'meera1234',
      displayName: 'Meera Nair',
      role: 'EMPLOYEE',
    });

    expect(employee.role).toBe('EMPLOYEE');
    expect(employee.permissions).toContain('billing.write');
    expect(employee.permissions).not.toContain('payroll.manage');

    await expect(
      createUser({ username: 'meera', password: 'another123', displayName: 'X', role: 'EMPLOYEE' }),
    ).rejects.toThrow();

    await expect(
      createUser({ username: 'short', password: 'abc', displayName: 'X', role: 'EMPLOYEE' }),
    ).rejects.toThrow();
  });
});
