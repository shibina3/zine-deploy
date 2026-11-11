import Dexie, { type Table } from 'dexie';
import type {
  Appointment,
  AuditLog,
  BackupRecord,
  Bill,
  BillItem,
  BridalBooking,
  CalendarBlock,
  Customer,
  Employee,
  EmployeeLeave,
  Expense,
  ExpenseCategory,
  IncomeEntry,
  Offer,
  OfferService,
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
import { DB_NAME, SCHEMA_VERSION, TABLE_INDEXES } from './schema';

/**
 * The salon's operational database. IndexedDB through Dexie is the V1 source of
 * truth; every write that touches money happens inside a Dexie transaction.
 */
export class ZineDatabase extends Dexie {
  settings!: Table<Settings, string>;
  users!: Table<User, string>;
  customers!: Table<Customer, string>;
  employees!: Table<Employee, string>;
  employeeLeaves!: Table<EmployeeLeave, string>;
  services!: Table<Service, string>;
  serviceRecipes!: Table<ServiceRecipe, string>;
  products!: Table<Product, string>;
  suppliers!: Table<Supplier, string>;
  stockMovements!: Table<StockMovement, string>;
  appointments!: Table<Appointment, string>;
  calendarBlocks!: Table<CalendarBlock, string>;
  bridalBookings!: Table<BridalBooking, string>;
  offers!: Table<Offer, string>;
  offerServices!: Table<OfferService, string>;
  bills!: Table<Bill, string>;
  billItems!: Table<BillItem, string>;
  payments!: Table<Payment, string>;
  refunds!: Table<Refund, string>;
  expenses!: Table<Expense, string>;
  expenseCategories!: Table<ExpenseCategory, string>;
  incomes!: Table<IncomeEntry, string>;
  salaryRecords!: Table<SalaryRecord, string>;
  salaryPayments!: Table<SalaryPayment, string>;
  salaryAdvances!: Table<SalaryAdvance, string>;
  auditLogs!: Table<AuditLog, string>;
  backupHistory!: Table<BackupRecord, string>;

  constructor() {
    super(DB_NAME);
    this.version(SCHEMA_VERSION).stores(TABLE_INDEXES);
  }
}

export const db = new ZineDatabase();

/** Type-safe access to a table by its store name (used by backup/export). */
export function tableByName(name: string): Table<unknown, string> {
  return db.table(name) as Table<unknown, string>;
}
