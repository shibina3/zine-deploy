/**
 * Single source of truth for IndexedDB table names and indexes.
 * Backup/restore also reads this list, so a new table only needs to be added here.
 */

export const DB_NAME = 'zine-salon';

export const SCHEMA_VERSION = 1;

export const TABLE_INDEXES: Record<string, string> = {
  settings: 'id',
  users: 'id, &username, role, employeeId, isActive',
  customers: 'id, phone, name, createdAt',
  employees: 'id, name, phone, isActive',
  employeeLeaves: 'id, employeeId, startDate, endDate, status',
  services: 'id, name, category, isActive',
  serviceRecipes: 'id, serviceId, productId',
  products: 'id, &sku, name, category, isActive',
  suppliers: 'id, name, phone',
  stockMovements: 'id, productId, type, occurredAt, referenceId',
  appointments: 'id, employeeId, customerId, startAt, status, bridalBookingId',
  calendarBlocks: 'id, scope, employeeId, startAt, endAt',
  bridalBookings: 'id, customerId, eventDate, status',
  offers: 'id, name, type, isActive, validFrom, validTo',
  offerServices: 'id, offerId, serviceId',
  bills: 'id, &billNumber, customerId, employeeId, billDate, status',
  billItems: 'id, billId, itemType, refId',
  payments: 'id, billId, paidAt, method',
  refunds: 'id, billId, refundedAt',
  expenses: 'id, category, date, createdAt',
  expenseCategories: 'id, &name',
  incomes: 'id, source, date',
  salaryRecords: 'id, employeeId, salaryMonth, [employeeId+salaryMonth], status',
  salaryPayments: 'id, salaryRecordId, employeeId, paidAt',
  salaryAdvances: 'id, employeeId, date, settledInRecordId',
  auditLogs: 'id, action, entityType, entityId, userId, createdAt',
  backupHistory: 'id, createdAt, method, status',
};

/** Every store that participates in a backup snapshot. */
export const BACKUP_TABLES = Object.keys(TABLE_INDEXES);

/** Stores that hold credentials and must be excluded from CSV/JSON exports. */
export const SENSITIVE_TABLES = ['users'];
