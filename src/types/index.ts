/**
 * Zine domain model.
 *
 * Conventions:
 *  - All money is stored as integer **paise** (₹1 = 100 paise). Never floats.
 *  - Timestamps are epoch milliseconds (number) unless a field name ends in `Date`,
 *    which is an ISO `YYYY-MM-DD` calendar date (local business date).
 *  - Every table row has id/createdAt/updatedAt so audit + backup remain uniform.
 */

export type ID = string;
/** Integer paise. ₹1,500 === 150000 */
export type Paise = number;
export type Epoch = number;
/** ISO calendar date, `YYYY-MM-DD` */
export type DateString = string;
/** `HH:mm` 24h clock */
export type TimeString = string;
/** `YYYY-MM` payroll month */
export type MonthString = string;

export interface BaseEntity {
  id: ID;
  createdAt: Epoch;
  updatedAt: Epoch;
  createdBy?: ID;
  updatedBy?: ID;
}

export type Role = 'OWNER' | 'EMPLOYEE';

export type Permission =
  | 'billing.write'
  | 'customers.write'
  | 'appointments.write'
  | 'inventory.write'
  | 'offers.write'
  | 'reports.view'
  | 'finance.view'
  | 'employees.view'
  | 'payroll.manage'
  | 'settings.manage';

export const ALL_PERMISSIONS: Permission[] = [
  'billing.write',
  'customers.write',
  'appointments.write',
  'inventory.write',
  'offers.write',
  'reports.view',
  'finance.view',
  'employees.view',
  'payroll.manage',
  'settings.manage',
];

export const DEFAULT_EMPLOYEE_PERMISSIONS: Permission[] = [
  'billing.write',
  'customers.write',
  'appointments.write',
];

export interface BusinessHours {
  closed: boolean;
  open: TimeString;
  close: TimeString;
}

export interface Settings extends BaseEntity {
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  currency: 'INR';
  /** Default tax percentage applied to new bills (0 disables tax). */
  taxPercent: number;
  /** Prefix for generated bill numbers, e.g. `ZN` -> ZN-2026-00001 */
  receiptPrefix: string;
  receiptFooter: string;
  receiptWidth: '58' | '80' | 'A4';
  showTaxOnReceipt: boolean;
  /** Index 0 = Sunday … 6 = Saturday */
  businessHours: BusinessHours[];
  lockAfterMinutes: number;
  backupReminderHours: number;
  googleClientId: string;
  driveFolderName: string;
  setupComplete: boolean;
  lastBackupAt?: Epoch;
  taxLabel: string;
}

export interface User extends BaseEntity {
  username: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
  iterations: number;
  role: Role;
  employeeId?: ID;
  isActive: boolean;
  permissions: Permission[];
  lastLoginAt?: number;
}

export interface Customer extends BaseEntity {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  /** Cached lifetime spend in paise, maintained on bill creation. */
  totalSpend: number;
  lastVisitAt?: Epoch;
}

export type SalaryType = 'FIXED' | 'FIXED_PLUS_COMMISSION' | 'COMMISSION';

export interface Employee extends BaseEntity {
  name: string;
  phone: string;
  email?: string;
  designation: string;
  joinedAt: DateString;
  isActive: boolean;
  notes?: string;
  salaryType: SalaryType;
  fixedSalary: Paise;
  /** Basis points: 500 === 5% */
  commissionRateBps: number;
  /** Used to derive per-day salary for unpaid leave deduction. */
  workingDaysPerMonth: number;
}

export type LeaveType = 'PAID' | 'UNPAID' | 'SICK' | 'CASUAL' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface EmployeeLeave extends BaseEntity {
  employeeId: ID;
  employeeName: string;
  startDate: DateString;
  endDate: DateString;
  type: LeaveType;
  paid: boolean;
  reason: string;
  status: LeaveStatus;
  approvedBy?: ID;
  approvedByName?: string;
  approvedAt?: Epoch;
  decisionNote?: string;
}

export interface Service extends BaseEntity {
  name: string;
  category: string;
  description?: string;
  price: Paise;
  durationMinutes: number;
  isActive: boolean;
}

export interface ServiceRecipe extends BaseEntity {
  serviceId: ID;
  productId: ID;
  productName: string;
  /** Quantity in the product's unit (e.g. 20 for 20 ml) */
  quantity: number;
  unit: string;
}

export interface Supplier extends BaseEntity {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  category: string;
  supplierId?: ID;
  unit: string;
  purchasePrice: Paise;
  sellingPrice: Paise;
  /** Cached stock derived from the movement ledger. */
  stockCached: number;
  minStock: number;
  expiryDate?: DateString;
  isActive: boolean;
}

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'SERVICE_CONSUMPTION'
  | 'DAMAGE'
  | 'EXPIRY'
  | 'CORRECTION'
  | 'RETURN'
  | 'CANCELLATION_REVERSAL';

export interface StockMovement extends BaseEntity {
  productId: ID;
  productName: string;
  type: StockMovementType;
  /** Signed: positive = inward, negative = outward. */
  quantity: number;
  unitCost?: Paise;
  supplierId?: ID;
  invoiceRef?: string;
  referenceType?: 'BILL' | 'PURCHASE' | 'MANUAL' | 'BILL_CANCEL';
  referenceId?: ID;
  note?: string;
  occurredAt: Epoch;
  createdByName?: string;
}

export type AppointmentStatus =
  | 'ENQUIRY'
  | 'TENTATIVE'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Appointment extends BaseEntity {
  customerId: ID;
  customerName: string;
  customerPhone: string;
  serviceIds: ID[];
  serviceNames: string[];
  employeeId: ID;
  employeeName: string;
  startAt: Epoch;
  endAt: Epoch;
  estimatedTotal: Paise;
  advance: Paise;
  notes?: string;
  status: AppointmentStatus;
  source: 'APPOINTMENT' | 'BRIDAL';
  bridalBookingId?: ID;
  /** Owner-only override of a scheduling conflict. */
  conflictOverride?: string;
}

export type BlockScope = 'SALON' | 'EMPLOYEE';

export interface CalendarBlock extends BaseEntity {
  scope: BlockScope;
  employeeId?: ID;
  employeeName?: string;
  startAt: Epoch;
  endAt: Epoch;
  reason: string;
  /** Set when the block was created for a bridal booking. */
  bridalBookingId?: ID;
}

export type BridalStatus =
  | 'ENQUIRY'
  | 'QUOTATION'
  | 'TENTATIVE'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BridalBooking extends BaseEntity {
  customerId: ID;
  customerName: string;
  customerPhone: string;
  eventType: string;
  eventDate: DateString;
  startTime: TimeString;
  endTime: TimeString;
  location: string;
  offerId?: ID;
  serviceIds: ID[];
  serviceNames: string[];
  employeeIds: ID[];
  employeeNames: string[];
  trialDate?: DateString;
  packagePrice: Paise;
  advance: Paise;
  specialRequirements?: string;
  notes?: string;
  status: BridalStatus;
  appointmentId?: ID;
}

export type OfferType = 'PERCENTAGE' | 'FIXED' | 'COMBO' | 'BRIDAL' | 'PROMO';

export interface Offer extends BaseEntity {
  name: string;
  description?: string;
  type: OfferType;
  /** Canonical list of service ids in the offer (mirrored into offerServices). */
  serviceIds: ID[];
  originalPrice: Paise;
  offerPrice: Paise;
  discountPercent?: number;
  validFrom?: DateString;
  validTo?: DateString;
  conditions?: string;
  isActive: boolean;
}

export interface OfferService extends BaseEntity {
  offerId: ID;
  serviceId: ID;
  quantity: number;
}

export type BillStatus =
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'PENDING'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type ItemType = 'SERVICE' | 'PRODUCT' | 'COMBO' | 'CUSTOM';

export interface Bill extends BaseEntity {
  billNumber: string;
  customerId: ID;
  customerName: string;
  customerPhone: string;
  employeeId: ID;
  employeeName: string;
  billDate: Epoch;
  subtotal: Paise;
  itemDiscount: Paise;
  billDiscount: Paise;
  offerDiscount: Paise;
  taxableAmount: Paise;
  taxPercent: number;
  taxAmount: Paise;
  total: Paise;
  paid: Paise;
  refunded: Paise;
  balance: Paise;
  status: BillStatus;
  offerId?: ID;
  offerName?: string;
  notes?: string;
  appointmentId?: ID;
  bridalBookingId?: ID;
  cancelReason?: string;
  cancelledAt?: Epoch;
  cancelledBy?: ID;
  cancellationApprovedBy?: ID;
}

export interface BillItem extends BaseEntity {
  billId: ID;
  itemType: ItemType;
  refId?: ID;
  name: string;
  category?: string;
  quantity: number;
  unitPrice: Paise;
  discount: Paise;
  lineTotal: Paise;
  employeeId?: ID;
  employeeName?: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'OTHER';

export interface Payment extends BaseEntity {
  billId: ID;
  amount: Paise;
  method: PaymentMethod;
  reference?: string;
  paidAt: Epoch;
  note?: string;
  kind: 'BILL' | 'ADVANCE';
  createdByName?: string;
}

export interface Refund extends BaseEntity {
  billId: ID;
  billNumber: string;
  amount: Paise;
  method: PaymentMethod;
  reason: string;
  refundedAt: Epoch;
  approvedBy?: ID;
  approvedByName?: string;
  createdByName?: string;
}

export interface ExpenseCategory extends BaseEntity {
  name: string;
  isSystem: boolean;
}

export interface Expense extends BaseEntity {
  category: string;
  description: string;
  amount: Paise;
  date: DateString;
  method: PaymentMethod;
  supplierId?: ID;
  invoiceRef?: string;
  createdByName?: string;
}

export type IncomeSource = 'SERVICE' | 'PRODUCT' | 'BRIDAL' | 'OTHER';

export interface IncomeEntry extends BaseEntity {
  source: IncomeSource;
  description: string;
  amount: Paise;
  date: DateString;
  method: PaymentMethod;
  reference?: string;
  createdByName?: string;
}

export type PayrollStatus = 'DRAFT' | 'FINALISED' | 'PARTIALLY_PAID' | 'PAID';

export interface SalaryRecord extends BaseEntity {
  employeeId: ID;
  employeeName: string;
  salaryMonth: MonthString;
  fixedSalary: Paise;
  serviceRevenue: Paise;
  commissionRateBps: number;
  commission: Paise;
  incentives: Paise;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  perDaySalary: Paise;
  unpaidLeaveDeduction: Paise;
  advanceDeduction: Paise;
  otherAdjustments: Paise;
  gross: Paise;
  netPayable: Paise;
  paid: Paise;
  balance: Paise;
  status: PayrollStatus;
  note?: string;
  finalisedAt?: Epoch;
}

export interface SalaryPayment extends BaseEntity {
  salaryRecordId: ID;
  employeeId: ID;
  amount: Paise;
  method: PaymentMethod;
  paidAt: Epoch;
  note?: string;
  createdByName?: string;
}

export interface SalaryAdvance extends BaseEntity {
  employeeId: ID;
  employeeName: string;
  amount: Paise;
  date: DateString;
  method: PaymentMethod;
  note?: string;
  settledInRecordId?: ID;
  settledAt?: Epoch;
}

export type AuditAction =
  | 'BILL_CREATE'
  | 'BILL_CANCEL'
  | 'REFUND_CREATE'
  | 'PAYMENT_CREATE'
  | 'PAYMENT_CORRECTION'
  | 'SALARY_FINALISE'
  | 'SALARY_PAY'
  | 'SALARY_ADJUST'
  | 'ADVANCE_CREATE'
  | 'STOCK_ADJUST'
  | 'USER_CREATE'
  | 'USER_DEACTIVATE'
  | 'USER_UPDATE'
  | 'LEAVE_CREATE'
  | 'LEAVE_DECISION'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  | 'SETTINGS_UPDATE'
  | 'OFFER_SAVE'
  | 'APPOINTMENT_CREATE'
  | 'APPOINTMENT_OVERRIDE'
  | 'APPOINTMENT_CANCEL'
  | 'BRIDAL_SAVE'
  | 'BLOCK_CREATE'
  | 'LOGIN'
  | 'LOGIN_FAILED';

export interface AuditLog extends BaseEntity {
  action: AuditAction;
  entityType: string;
  entityId?: ID;
  userId?: ID;
  userName?: string;
  reason?: string;
  previousValue?: string;
  newValue?: string;
}

export interface BackupRecord extends BaseEntity {
  method: 'DRIVE' | 'DOWNLOAD';
  filename: string;
  sizeBytes: number;
  recordCounts: Record<string, number>;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
  driveFileId?: string;
}

export interface DatabaseSnapshot {
  app: 'zine';
  formatVersion: number;
  schemaVersion: number;
  createdAt: Epoch;
  businessName: string;
  recordCounts: Record<string, number>;
  data: Record<string, unknown[]>;
}
