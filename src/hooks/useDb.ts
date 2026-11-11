import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type {
  Appointment,
  AuditLog,
  BackupRecord,
  Bill,
  BridalBooking,
  CalendarBlock,
  Customer,
  Employee,
  EmployeeLeave,
  Expense,
  ExpenseCategory,
  IncomeEntry,
  Offer,
  Payment,
  Product,
  Refund,
  SalaryAdvance,
  SalaryPayment,
  SalaryRecord,
  Service,
  ServiceRecipe,
  Settings,
  StockMovement,
  Supplier,
  User,
} from '@/types';

/**
 * Live IndexedDB queries. Dexie re-runs each query when the underlying tables
 * change, which keeps every screen in sync without manual refetching.
 */

const EMPTY: never[] = [];

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get('app'), []);
}

export function useCustomers(): Customer[] {
  return (useLiveQuery(() => db.customers.orderBy('name').toArray(), [], EMPTY) as Customer[]) ?? [];
}

export function useServices(includeInactive = false): Service[] {
  return (
    (useLiveQuery(
      async () => {
        const rows = await db.services.orderBy('name').toArray();
        return includeInactive ? rows : rows.filter((service) => service.isActive);
      },
      [includeInactive],
      EMPTY,
    ) as Service[]) ?? []
  );
}

export function useEmployees(includeInactive = false): Employee[] {
  return (
    (useLiveQuery(
      async () => {
        const rows = await db.employees.orderBy('name').toArray();
        return includeInactive ? rows : rows.filter((employee) => employee.isActive);
      },
      [includeInactive],
      EMPTY,
    ) as Employee[]) ?? []
  );
}

export function useLeaves(): EmployeeLeave[] {
  return (
    (useLiveQuery(() => db.employeeLeaves.orderBy('startDate').reverse().toArray(), [], EMPTY) as EmployeeLeave[]) ??
    []
  );
}

export function useProducts(includeInactive = false): Product[] {
  return (
    (useLiveQuery(
      async () => {
        const rows = await db.products.orderBy('name').toArray();
        return includeInactive ? rows : rows.filter((product) => product.isActive);
      },
      [includeInactive],
      EMPTY,
    ) as Product[]) ?? []
  );
}

export function useSuppliers(): Supplier[] {
  return (useLiveQuery(() => db.suppliers.orderBy('name').toArray(), [], EMPTY) as Supplier[]) ?? [];
}

export function useStockMovements(limit = 400): StockMovement[] {
  return (
    (useLiveQuery(
      () => db.stockMovements.orderBy('occurredAt').reverse().limit(limit).toArray(),
      [limit],
      EMPTY,
    ) as StockMovement[]) ?? []
  );
}

export function useRecipes(): ServiceRecipe[] {
  return (useLiveQuery(() => db.serviceRecipes.toArray(), [], EMPTY) as ServiceRecipe[]) ?? [];
}

export function useOffers(): Offer[] {
  return (useLiveQuery(() => db.offers.orderBy('name').toArray(), [], EMPTY) as Offer[]) ?? [];
}

export function useBills(): Bill[] {
  return (useLiveQuery(() => db.bills.orderBy('billDate').reverse().toArray(), [], EMPTY) as Bill[]) ?? [];
}

export function usePayments(limit = 1000): Payment[] {
  return (
    (useLiveQuery(
      () => db.payments.orderBy('paidAt').reverse().limit(limit).toArray(),
      [limit],
      EMPTY,
    ) as Payment[]) ?? []
  );
}

export function useRefunds(): Refund[] {
  return (useLiveQuery(() => db.refunds.orderBy('refundedAt').reverse().toArray(), [], EMPTY) as Refund[]) ?? [];
}

export function useAppointments(): Appointment[] {
  return (useLiveQuery(() => db.appointments.orderBy('startAt').toArray(), [], EMPTY) as Appointment[]) ?? [];
}

export function useBlocks(): CalendarBlock[] {
  return (useLiveQuery(() => db.calendarBlocks.orderBy('startAt').toArray(), [], EMPTY) as CalendarBlock[]) ?? [];
}

export function useBridalBookings(): BridalBooking[] {
  return (
    (useLiveQuery(() => db.bridalBookings.orderBy('eventDate').toArray(), [], EMPTY) as BridalBooking[]) ?? []
  );
}

export function useExpenses(): Expense[] {
  return (useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray(), [], EMPTY) as Expense[]) ?? [];
}

export function useExpenseCategories(): ExpenseCategory[] {
  return (
    (useLiveQuery(() => db.expenseCategories.orderBy('name').toArray(), [], EMPTY) as ExpenseCategory[]) ?? []
  );
}

export function useIncomes(): IncomeEntry[] {
  return (useLiveQuery(() => db.incomes.orderBy('date').reverse().toArray(), [], EMPTY) as IncomeEntry[]) ?? [];
}

export function useSalaryRecords(): SalaryRecord[] {
  return (
    (useLiveQuery(() => db.salaryRecords.orderBy('salaryMonth').reverse().toArray(), [], EMPTY) as SalaryRecord[]) ??
    []
  );
}

export function useSalaryPayments(): SalaryPayment[] {
  return (
    (useLiveQuery(() => db.salaryPayments.orderBy('paidAt').reverse().toArray(), [], EMPTY) as SalaryPayment[]) ?? []
  );
}

export function useSalaryAdvances(): SalaryAdvance[] {
  return (
    (useLiveQuery(() => db.salaryAdvances.orderBy('date').reverse().toArray(), [], EMPTY) as SalaryAdvance[]) ?? []
  );
}

export function useBillItemsAll(): import('@/types').BillItem[] {
  return (
    (useLiveQuery(() => db.billItems.toArray(), [], EMPTY) as import('@/types').BillItem[]) ?? []
  );
}

export function useUsers(): User[] {
  return (useLiveQuery(() => db.users.orderBy('username').toArray(), [], EMPTY) as User[]) ?? [];
}

export function useBackups(limit = 20): BackupRecord[] {
  return (
    (useLiveQuery(
      () => db.backupHistory.orderBy('createdAt').reverse().limit(limit).toArray(),
      [limit],
      EMPTY,
    ) as BackupRecord[]) ?? []
  );
}

export function useAuditLogs(limit = 150): AuditLog[] {
  return (
    (useLiveQuery(
      () => db.auditLogs.orderBy('createdAt').reverse().limit(limit).toArray(),
      [limit],
      EMPTY,
    ) as AuditLog[]) ?? []
  );
}

export interface BillDetail {
  bill: Bill;
  items: import('@/types').BillItem[];
  payments: Payment[];
  refunds: Refund[];
}

export function useBillDetail(billId: string | null): BillDetail | null | undefined {
  return useLiveQuery(async () => {
    if (!billId) return null;
    const bill = await db.bills.get(billId);
    if (!bill) return null;
    const [items, payments, refunds] = await Promise.all([
      db.billItems.where('billId').equals(billId).toArray(),
      db.payments.where('billId').equals(billId).toArray(),
      db.refunds.where('billId').equals(billId).toArray(),
    ]);
    return { bill, items, payments, refunds };
  }, [billId]);
}

export function useCustomerBills(customerId?: string): Bill[] {
  return (
    (useLiveQuery(
      async () => {
        if (!customerId) return [];
        const rows = await db.bills.where('customerId').equals(customerId).toArray();
        return rows.sort((a, b) => b.billDate - a.billDate);
      },
      [customerId],
      EMPTY,
    ) as Bill[]) ?? []
  );
}

export function useCustomerAppointments(customerId?: string): Appointment[] {
  return (
    (useLiveQuery(
      async () => {
        if (!customerId) return [];
        const rows = await db.appointments.where('customerId').equals(customerId).toArray();
        return rows.sort((a, b) => b.startAt - a.startAt);
      },
      [customerId],
      EMPTY,
    ) as Appointment[]) ?? []
  );
}

export function useServiceRecipes(serviceId?: string): ServiceRecipe[] {
  return (
    (useLiveQuery(
      async () => {
        if (!serviceId) return [];
        return db.serviceRecipes.where('serviceId').equals(serviceId).toArray();
      },
      [serviceId],
      EMPTY,
    ) as ServiceRecipe[]) ?? []
  );
}

