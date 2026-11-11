import type {
  Bill,
  BillItem,
  DateString,
  Epoch,
  Expense,
  Paise,
  Payment,
  Refund,
  StockMovement,
} from '@/types';
import { formatDate, toISODate } from '@/utils/date';
import { nonNegative, percentOf, sumPaise } from '@/utils/money';

/**
 * Report aggregation. Sales, collections and refunds stay separate because the
 * salon owner needs to see cash received, not only value billed.
 */

export function isBillActive(bill: Bill): boolean {
  return bill.status !== 'CANCELLED';
}

export interface PeriodSummary {
  sales: Paise;
  collections: Paise;
  refunds: Paise;
  expenses: Paise;
  billCount: number;
  averageBill: Paise;
  outstanding: Paise;
  pendingBills: number;
  taxCollected: Paise;
}

function inRange(value: Epoch, from: Epoch, to: Epoch): boolean {
  return value >= from && value <= to;
}

export interface PeriodInput {
  bills: Bill[];
  payments: Payment[];
  refunds: Refund[];
  expenses: Expense[];
  from: Epoch;
  to: Epoch;
}

export function summarisePeriod({ bills, payments, refunds, expenses, from, to }: PeriodInput): PeriodSummary {
  const periodBills = bills.filter((bill) => isBillActive(bill) && inRange(bill.billDate, from, to));
  const periodPayments = payments.filter((payment) => inRange(payment.paidAt, from, to));
  const periodRefunds = refunds.filter((refund) => inRange(refund.refundedAt, from, to));
  const fromISO = toISODate(new Date(from));
  const toISO = toISODate(new Date(to));
  const periodExpenses = expenses.filter((expense) => expense.date >= fromISO && expense.date <= toISO);

  const sales = sumPaise(periodBills.map((bill) => bill.total));
  const collections = sumPaise(periodPayments.map((payment) => payment.amount));
  const refunded = sumPaise(periodRefunds.map((refund) => refund.amount));
  const spend = sumPaise(periodExpenses.map((expense) => expense.amount));

  const unpaid = bills.filter((bill) => isBillActive(bill) && bill.balance > 0);

  return {
    sales,
    collections,
    refunds: refunded,
    expenses: spend,
    billCount: periodBills.length,
    averageBill: periodBills.length ? Math.round(sales / periodBills.length) : 0,
    outstanding: sumPaise(unpaid.map((bill) => bill.balance)),
    pendingBills: unpaid.length,
    taxCollected: sumPaise(periodBills.map((bill) => bill.taxAmount)),
  };
}

export interface DailyPoint {
  date: DateString;
  label: string;
  sales: Paise;
  collections: Paise;
  expenses: Paise;
}

/** Daily sales/collections/expenses series used by the dashboard chart. */
export function buildDailySeries(
  days: DateString[],
  bills: Bill[],
  payments: Payment[],
  expenses: Expense[],
): DailyPoint[] {
  return days.map((date) => {
    const dayStart = new Date(`${date}T00:00:00`).getTime();
    const dayEnd = new Date(`${date}T23:59:59.999`).getTime();
    const sales = sumPaise(
      bills
        .filter((bill) => isBillActive(bill) && inRange(bill.billDate, dayStart, dayEnd))
        .map((bill) => bill.total),
    );
    const collections = sumPaise(
      payments.filter((payment) => inRange(payment.paidAt, dayStart, dayEnd)).map((payment) => payment.amount),
    );
    const spend = sumPaise(expenses.filter((expense) => expense.date === date).map((expense) => expense.amount));
    return {
      date,
      label: formatDate(date, 'd MMM'),
      sales,
      collections,
      expenses: spend,
    };
  });
}

/**
 * Management-only profit estimate.
 * Product purchases are a cash expense; the value of goods actually consumed is
 * counted as cost of goods sold. Callers pass expenses *excluding* purchases and
 * COGS separately so stock is never double counted.
 */
export function estimateProfit({
  netSales,
  operatingExpenses,
  cogs,
}: {
  netSales: Paise;
  operatingExpenses: Paise;
  cogs: Paise;
}): Paise {
  return netSales - operatingExpenses - cogs;
}

/** Cost of goods consumed between two epochs, from stock movements. */
export function cogsFromMovements(movements: StockMovement[], from: Epoch, to: Epoch): Paise {
  return sumPaise(
    movements
      .filter(
        (movement) =>
          inRange(movement.occurredAt, from, to) &&
          (movement.type === 'SALE' || movement.type === 'SERVICE_CONSUMPTION') &&
          movement.quantity < 0,
      )
      .map((movement) => Math.abs(movement.quantity) * (movement.unitCost ?? 0)),
  );
}

export interface EmployeeSalesRow {
  employeeId: string;
  employeeName: string;
  revenue: Paise;
  bills: number;
}

export function salesByEmployee(bills: Bill[]): EmployeeSalesRow[] {
  const map = new Map<string, EmployeeSalesRow>();
  for (const bill of bills) {
    if (!isBillActive(bill)) continue;
    const row = map.get(bill.employeeId) ?? {
      employeeId: bill.employeeId,
      employeeName: bill.employeeName,
      revenue: 0,
      bills: 0,
    };
    row.revenue += bill.total;
    row.bills += 1;
    map.set(bill.employeeId, row);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export interface ServiceSalesRow {
  name: string;
  revenue: Paise;
  quantity: number;
}

export function salesByItem(items: BillItem[]): ServiceSalesRow[] {
  const map = new Map<string, ServiceSalesRow>();
  for (const item of items) {
    const row = map.get(item.name) ?? { name: item.name, revenue: 0, quantity: 0 };
    row.revenue += item.lineTotal;
    row.quantity += item.quantity;
    map.set(item.name, row);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

/** Payment method split for a collections report. */
export function collectionsByMethod(payments: Payment[]): Array<{ method: string; amount: Paise }> {
  const map = new Map<string, Paise>();
  for (const payment of payments) {
    map.set(payment.method, (map.get(payment.method) ?? 0) + payment.amount);
  }
  return Array.from(map.entries()).map(([method, amount]) => ({ method, amount }));
}

/** Tax amount for a taxable base. */
export function taxFor(base: Paise, taxPercent: number): Paise {
  return percentOf(nonNegative(base), taxPercent);
}

