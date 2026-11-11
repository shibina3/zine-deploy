import type { Permission } from '@/types';
import {
  BadgePercent,
  CalendarDays,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Sparkles,
  UserCog,
  Users,
  Wallet,
  Blocks,
  Heart,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  /** Employees need this permission; owners always have access. */
  permission?: Permission;
  exact?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
  ownerOnly?: boolean;
  permission?: Permission;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, exact: true, ownerOnly: true }],
  },
  {
    label: 'Billing',
    items: [
      { label: 'New bill', to: '/billing/new', icon: ReceiptText, permission: 'billing.write' },
      { label: 'All bills', to: '/billing', icon: ReceiptText, permission: 'billing.write' },
      { label: 'Payments', to: '/payments', icon: Wallet, permission: 'billing.write' },
      { label: 'Refunds', to: '/refunds', icon: ReceiptText, ownerOnly: true },
    ],
  },
  {
    label: 'Calendar',
    items: [
      { label: 'Appointments', to: '/calendar', icon: CalendarDays, permission: 'appointments.write' },
      { label: 'Bridal bookings', to: '/calendar/bridal', icon: Heart, permission: 'appointments.write' },
      { label: 'Blocked dates', to: '/calendar/blocks', icon: Blocks, permission: 'appointments.write' },
    ],
  },
  {
    items: [{ label: 'Customers', to: '/customers', icon: Users, permission: 'customers.write' }],
  },
  {
    items: [
      { label: 'Services', to: '/services', icon: Sparkles },
      { label: 'Offers & combos', to: '/offers', icon: BadgePercent, permission: 'offers.write' },
    ],
  },
  {
    label: 'Inventory',
    permission: 'inventory.write',
    items: [
      { label: 'Products', to: '/inventory', icon: Package },
      { label: 'Stock inward', to: '/inventory/inward', icon: Package },
      { label: 'Stock outward', to: '/inventory/outward', icon: Package },
      { label: 'Suppliers', to: '/inventory/suppliers', icon: Package },
      { label: 'Stock alerts', to: '/inventory/alerts', icon: Package },
    ],
  },
  {
    label: 'Team',
    items: [
      { label: 'Employee profiles', to: '/employees', icon: UserCog, permission: 'employees.view' },
      { label: 'Leave management', to: '/employees/leave', icon: UserCog, permission: 'employees.view' },
      { label: 'Salary & payroll', to: '/employees/payroll', icon: Wallet, permission: 'payroll.manage' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Income', to: '/finance/income', icon: Wallet, permission: 'finance.view' },
      { label: 'Expenses', to: '/finance/expenses', icon: Wallet, permission: 'finance.view' },
      { label: 'Reports', to: '/finance/reports', icon: Wallet, permission: 'reports.view' },
    ],
  },
  {
    items: [{ label: 'Settings', to: '/settings', icon: Settings, permission: 'settings.manage' }],
  },
];

const TITLES: Array<[string, string]> = [
  ['/billing/new', 'New bill'],
  ['/billing', 'Bills'],
  ['/payments', 'Payments'],
  ['/refunds', 'Refunds'],
  ['/calendar/bridal', 'Bridal bookings'],
  ['/calendar/blocks', 'Blocked dates'],
  ['/calendar', 'Appointments'],
  ['/customers', 'Customers'],
  ['/services', 'Services'],
  ['/offers', 'Offers & combos'],
  ['/inventory/inward', 'Stock inward'],
  ['/inventory/outward', 'Stock outward'],
  ['/inventory/suppliers', 'Suppliers'],
  ['/inventory/alerts', 'Stock alerts'],
  ['/inventory', 'Products'],
  ['/employees/leave', 'Leave management'],
  ['/employees/payroll', 'Salary & payroll'],
  ['/employees', 'Employees'],
  ['/finance/income', 'Income'],
  ['/finance/expenses', 'Expenses'],
  ['/finance/reports', 'Reports'],
  ['/settings', 'Settings'],
];

export function pageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const match = TITLES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return match?.[1] ?? 'Zine';
}
