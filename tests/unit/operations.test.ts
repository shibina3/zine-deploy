import { describe, expect, it } from 'vitest';
import type { Product, ServiceRecipe, StockMovement } from '@/types';
import { computePayroll, payrollStatus, tallyLeaveDays } from '@/modules/payroll/logic';
import {
  lowStockProducts,
  planServiceConsumption,
  reconcileStock,
  stockFor,
  stockValue,
} from '@/modules/inventory/logic';

describe('payroll calculations', () => {
  it('adds fixed salary, commission and incentives, then deducts unpaid leave and advances', () => {
    const result = computePayroll({
      salaryType: 'FIXED_PLUS_COMMISSION',
      fixedSalary: 1_800_000,
      commissionRateBps: 500,
      serviceRevenue: 1_000_000,
      incentives: 10_000,
      paidLeaveDays: 4,
      unpaidLeaveDays: 2,
      workingDaysPerMonth: 26,
      advanceDeduction: 200_000,
    });

    expect(result.perDaySalary).toBe(69_231);
    expect(result.commission).toBe(50_000);
    expect(result.gross).toBe(1_860_000);
    expect(result.unpaidLeaveDeduction).toBe(138_462);
    expect(result.netPayable).toBe(1_521_538);
  });

  it('never deducts salary for paid leave', () => {
    const paid = computePayroll({
      salaryType: 'FIXED',
      fixedSalary: 1_000_000,
      commissionRateBps: 0,
      serviceRevenue: 0,
      paidLeaveDays: 6,
      unpaidLeaveDays: 0,
      workingDaysPerMonth: 26,
    });
    expect(paid.unpaidLeaveDeduction).toBe(0);
    expect(paid.netPayable).toBe(1_000_000);
  });

  it('supports commission-only salaries', () => {
    const result = computePayroll({
      salaryType: 'COMMISSION',
      fixedSalary: 900_000,
      commissionRateBps: 1000,
      serviceRevenue: 500_000,
      workingDaysPerMonth: 26,
    });
    expect(result.fixedSalary).toBe(0);
    expect(result.commission).toBe(50_000);
    expect(result.netPayable).toBe(50_000);
  });

  it('never returns a negative net payable', () => {
    const result = computePayroll({
      salaryType: 'FIXED',
      fixedSalary: 100_000,
      commissionRateBps: 0,
      serviceRevenue: 0,
      unpaidLeaveDays: 30,
      advanceDeduction: 500_000,
      workingDaysPerMonth: 26,
    });
    expect(result.netPayable).toBe(0);
  });

  it('clips leave days to the payroll month', () => {
    const tally = tallyLeaveDays(
      [
        { startDate: '2026-10-29', endDate: '2026-11-02', paid: false },
        { startDate: '2026-11-20', endDate: '2026-12-03', paid: true },
      ],
      '2026-11-01',
      '2026-11-30',
    );
    expect(tally.unpaidLeaveDays).toBe(2);
    expect(tally.paidLeaveDays).toBe(11);
  });

  it('derives payroll status from payments', () => {
    expect(payrollStatus(100_000, 0)).toBe('FINALISED');
    expect(payrollStatus(100_000, 40_000)).toBe('PARTIALLY_PAID');
    expect(payrollStatus(100_000, 100_000)).toBe('PAID');
  });
});

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  createdAt: 0,
  updatedAt: 0,
  name: 'Shampoo',
  sku: 'SH-1',
  category: 'Hair care',
  unit: 'ml',
  purchasePrice: 100,
  sellingPrice: 200,
  stockCached: 10,
  minStock: 5,
  isActive: true,
  ...overrides,
});

const movement = (quantity: number, productId = 'p1'): StockMovement => ({
  id: `m-${Math.random()}`,
  createdAt: 0,
  updatedAt: 0,
  productId,
  productName: 'Shampoo',
  type: quantity >= 0 ? 'PURCHASE' : 'SALE',
  quantity,
  occurredAt: 0,
});

describe('inventory ledger', () => {
  it('derives stock from signed movements', () => {
    expect(stockFor('p1', [movement(10), movement(-3), movement(-2)])).toBe(5);
  });

  it('reports products at or below the minimum', () => {
    const low = lowStockProducts([product({ stockCached: 2 })], [movement(2)]);
    expect(low).toHaveLength(1);
    expect(low[0].shortfall).toBe(3);
  });

  it('values stock at purchase cost', () => {
    expect(stockValue([product()], [movement(10)])).toBe(1_000);
  });

  it('finds cached stock that disagrees with the ledger', () => {
    const mismatch = reconcileStock([product({ stockCached: 99 })], [movement(4)]);
    expect(mismatch).toHaveLength(1);
    expect(mismatch[0].ledger).toBe(4);
  });

  it('plans service consumption from recipes, multiplied by quantity', () => {
    const recipes: ServiceRecipe[] = [
      {
        id: 'r1',
        createdAt: 0,
        updatedAt: 0,
        serviceId: 's1',
        productId: 'p1',
        productName: 'Shampoo',
        quantity: 20,
        unit: 'ml',
      },
    ];
    const plan = planServiceConsumption([{ refId: 's1', quantity: 2 }], recipes);
    expect(plan).toHaveLength(1);
    expect(plan[0].quantity).toBe(40);
  });
});
