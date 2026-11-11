import type {
  AppointmentStatus,
  BillStatus,
  BridalStatus,
  BusinessHours,
  LeaveStatus,
  OfferType,
  PayrollStatus,
  Permission,
  SalaryType,
  Settings,
  StockMovementType,
} from '@/types';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'wine';

export const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  success: 'bg-sage-100 text-sage-700 ring-sage-200',
  warning: 'bg-gold-100 text-gold-800 ring-gold-200',
  danger: 'bg-rose-100 text-rose-700 ring-rose-200',
  info: 'bg-sky-100 text-sky-700 ring-sky-200',
  gold: 'bg-gold-500/15 text-gold-800 ring-gold-300/60',
  wine: 'bg-wine-100 text-wine-700 ring-wine-200',
};

export interface StatusMeta {
  label: string;
  tone: Tone;
}

export const BILL_STATUS: Record<BillStatus, StatusMeta> = {
  PAID: { label: 'Paid', tone: 'success' },
  PARTIALLY_PAID: { label: 'Partially paid', tone: 'warning' },
  PENDING: { label: 'Pending', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  REFUNDED: { label: 'Refunded', tone: 'info' },
  PARTIALLY_REFUNDED: { label: 'Partially refunded', tone: 'info' },
};

export const APPOINTMENT_STATUS: Record<AppointmentStatus, StatusMeta> = {
  ENQUIRY: { label: 'Enquiry', tone: 'neutral' },
  TENTATIVE: { label: 'Tentative', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  NO_SHOW: { label: 'No show', tone: 'neutral' },
};

export const BRIDAL_STATUS: Record<BridalStatus, StatusMeta> = {
  ENQUIRY: { label: 'Enquiry', tone: 'neutral' },
  QUOTATION: { label: 'Quotation sent', tone: 'warning' },
  TENTATIVE: { label: 'Tentative', tone: 'gold' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export const LEAVE_STATUS: Record<LeaveStatus, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const PAYROLL_STATUS: Record<PayrollStatus, StatusMeta> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  FINALISED: { label: 'Finalised', tone: 'gold' },
  PARTIALLY_PAID: { label: 'Partially paid', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
};

export const SALARY_TYPE_LABEL: Record<SalaryType, string> = {
  FIXED: 'Fixed salary',
  FIXED_PLUS_COMMISSION: 'Fixed + commission',
  COMMISSION: 'Commission only',
};

export const OFFER_TYPE_LABEL: Record<OfferType, string> = {
  PERCENTAGE: 'Percentage discount',
  FIXED: 'Fixed amount off',
  COMBO: 'Service combo',
  BRIDAL: 'Bridal package',
  PROMO: 'Limited-period promotion',
};

export const STOCK_MOVEMENT_LABEL: Record<StockMovementType, string> = {
  PURCHASE: 'Purchase',
  SALE: 'Product sale',
  SERVICE_CONSUMPTION: 'Service consumption',
  DAMAGE: 'Damaged',
  EXPIRY: 'Expired',
  CORRECTION: 'Correction',
  RETURN: 'Return',
  CANCELLATION_REVERSAL: 'Bill cancelled',
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  'billing.write': 'Create bills & take payments',
  'customers.write': 'Add & edit customers',
  'appointments.write': 'Manage appointments',
  'inventory.write': 'Manage stock',
  'offers.write': 'Manage offers',
  'reports.view': 'View reports',
  'finance.view': 'View income & expenses',
  'employees.view': 'View employee profiles',
  'payroll.manage': 'Manage salary & payroll',
  'settings.manage': 'Change settings',
};

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const SERVICE_CATEGORIES = [
  'Hair',
  'Skin',
  'Bridal',
  'Makeup',
  'Nails',
  'Spa',
  'Threading',
  'Waxing',
  'Other',
];

export const PRODUCT_CATEGORIES = [
  'Hair care',
  'Skin care',
  'Nail care',
  'Makeup',
  'Tools',
  'Consumables',
  'Other',
];

export const UNITS = ['ml', 'g', 'piece', 'packet', 'bottle', 'kit'];

export const DESIGNATIONS = [
  'Senior Stylist',
  'Stylist',
  'Beautician',
  'Makeup Artist',
  'Nail Technician',
  'Receptionist',
  'Assistant',
];

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DEFAULT_BUSINESS_HOURS = (): BusinessHours[] =>
  WEEKDAYS.map((_, index) => ({
    closed: index === 0,
    open: '09:30',
    close: '20:00',
  }));

export const EXPENSE_CATEGORY_SEED = [
  'Product purchases',
  'Employee salaries',
  'Rent',
  'Electricity',
  'Internet',
  'Maintenance',
  'Marketing',
  'Equipment',
  'Miscellaneous',
];

export const DEFAULT_SETTINGS = (): Omit<Settings, 'id' | 'createdAt' | 'updatedAt'> => ({
  businessName: 'Zine Beauty Parlour',
  tagline: 'Hair · Skin · Bridal',
  address: '',
  phone: '',
  email: '',
  gstin: '',
  currency: 'INR',
  taxPercent: 0,
  receiptPrefix: 'ZN',
  receiptFooter: 'Thank you for visiting Zine!',
  receiptWidth: '80',
  showTaxOnReceipt: true,
  businessHours: DEFAULT_BUSINESS_HOURS(),
  lockAfterMinutes: 15,
  backupReminderHours: 24,
  googleClientId: '',
  driveFolderName: 'Zine Backups',
  setupComplete: false,
  taxLabel: 'GST',
});
