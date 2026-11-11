import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { setActor } from '@/services/actor';
import { ensureSettings } from '@/db/repositories/settingsRepo';
import { saveCustomer } from '@/db/repositories/customerRepo';
import { saveEmployee } from '@/db/repositories/employeeRepo';
import { saveService } from '@/db/repositories/serviceRepo';
import { createBill } from '@/db/repositories/billingRepo';
import {
  addSalaryPayment,
  createAdvance,
  finaliseSalary,
  generateSalaryRecord,
} from '@/db/repositories/payrollRepo';
import { currentMonth } from '@/utils/date';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await ensureSettings();
  setActor({ id: 'owner', name: 'Owner', role: 'OWNER' });
});

async function seed() {
  const customer = await saveCustomer({ name: 'Ritu Sharma', phone: '9900112266' });
  const employee = await saveEmployee({
    name: 'Priya Shetty',
    phone: '9845012303',
    designation: 'Makeup Artist',
    joinedAt: '2024-07-19',
    salaryType: 'FIXED_PLUS_COMMISSION',
    fixedSalary: 1_800_000,
    commissionRateBps: 500,
    workingDaysPerMonth: 26,
  });
  const service = await saveService({
    name: 'Party Makeup',
    category: 'Makeup',
    price: 300_000,
    durationMinutes: 90,
  });
  await createBill({
    customerId: customer.id,
    employeeId: employee.id,
    lines: [
      {
        itemType: 'SERVICE',
        refId: service.id,
        name: service.name,
        quantity: 1,
        unitPrice: 300_000,
        discount: 0,
      },
    ],
    taxPercent: 0,
    payments: [{ amount: 300_000, method: 'UPI' }],
  });
  return { employee };
}

describe('payroll workflow', () => {
  it('generates a draft with commission and advance deductions', async () => {
    const { employee } = await seed();
    await createAdvance({
      employeeId: employee.id,
      amount: 20_000,
      method: 'CASH',
      date: new Date().toISOString().slice(0, 10),
    });

    const record = await generateSalaryRecord({
      employeeId: employee.id,
      salaryMonth: currentMonth(),
    });

    expect(record.fixedSalary).toBe(1_800_000);
    expect(record.serviceRevenue).toBe(300_000);
    expect(record.commission).toBe(15_000);
    expect(record.advanceDeduction).toBe(20_000);
    expect(record.gross).toBe(1_815_000);
    expect(record.netPayable).toBe(1_795_000);
    expect(record.status).toBe('DRAFT');

    const advances = await db.salaryAdvances.toArray();
    expect(advances[0].settledInRecordId).toBe(record.id);
  });

  it('preserves finalised payroll and records payments as expenses', async () => {
    const { employee } = await seed();
    const record = await generateSalaryRecord({
      employeeId: employee.id,
      salaryMonth: currentMonth(),
    });

    await finaliseSalary(record.id);
    await expect(
      generateSalaryRecord({ employeeId: employee.id, salaryMonth: currentMonth() }),
    ).rejects.toThrow(/finalised/i);

    await expect(
      addSalaryPayment(record.id, { amount: 2_000_000, method: 'CASH' }),
    ).rejects.toThrow();

    await addSalaryPayment(record.id, { amount: 500_000, method: 'CASH' });

    const stored = await db.salaryRecords.get(record.id);
    expect(stored?.paid).toBe(500_000);
    expect(stored?.balance).toBe(record.netPayable - 500_000);
    expect(stored?.status).toBe('PARTIALLY_PAID');

    const expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].category).toBe('Employee salaries');
    expect(expenses[0].amount).toBe(500_000);

    await addSalaryPayment(record.id, { amount: record.netPayable - 500_000, method: 'UPI' });
    const fullyPaid = await db.salaryRecords.get(record.id);
    expect(fullyPaid?.status).toBe('PAID');
    expect(fullyPaid?.balance).toBe(0);
  });

  it('excludes cancelled bills from commissionable revenue', async () => {
    const { employee } = await seed();
    const bills = await db.bills.toArray();
    await db.bills.update(bills[0].id, { status: 'CANCELLED' });

    const record = await generateSalaryRecord({
      employeeId: employee.id,
      salaryMonth: currentMonth(),
    });
    expect(record.serviceRevenue).toBe(0);
    expect(record.commission).toBe(0);
  });
});
