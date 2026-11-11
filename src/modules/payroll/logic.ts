import type { Paise, SalaryType } from '@/types';
import { bpsOf, nonNegative } from '@/utils/money';
import { daysBetweenInclusive } from '@/utils/date';

/**
 * Payroll maths.
 *
 * Salary = fixed + commission + incentives − unpaid-leave deduction
 *          − salary advances settled this month ± other adjustments.
 * Paid leave never reduces salary; only unpaid leave does.
 */

export interface PayrollInput {
  salaryType: SalaryType;
  fixedSalary: Paise;
  commissionRateBps: number;
  /** Revenue from service lines attributed to this employee in the month. */
  serviceRevenue: Paise;
  incentives?: Paise;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  workingDaysPerMonth?: number;
  /** Explicit per-day rate; otherwise derived from fixed salary. */
  perDaySalary?: Paise;
  advanceDeduction?: Paise;
  otherAdjustments?: Paise;
}

export interface PayrollResult {
  fixedSalary: Paise;
  commission: Paise;
  incentives: Paise;
  perDaySalary: Paise;
  unpaidLeaveDeduction: Paise;
  advanceDeduction: Paise;
  otherAdjustments: Paise;
  gross: Paise;
  netPayable: Paise;
}

export function computePayroll(input: PayrollInput): PayrollResult {
  const workingDays = input.workingDaysPerMonth && input.workingDaysPerMonth > 0 ? input.workingDaysPerMonth : 26;
  const fixedSalary =
    input.salaryType === 'COMMISSION' ? 0 : Math.max(0, input.fixedSalary ?? 0);

  const perDaySalary =
    input.perDaySalary && input.perDaySalary > 0
      ? input.perDaySalary
      : Math.round(fixedSalary / workingDays);

  const commission =
    input.salaryType === 'FIXED'
      ? 0
      : bpsOf(Math.max(0, input.serviceRevenue ?? 0), Math.max(0, input.commissionRateBps ?? 0));

  const incentives = Math.max(0, input.incentives ?? 0);
  const unpaidLeaveDays = Math.max(0, input.unpaidLeaveDays ?? 0);
  const unpaidLeaveDeduction = Math.round(perDaySalary * unpaidLeaveDays);
  const advanceDeduction = Math.max(0, input.advanceDeduction ?? 0);
  const otherAdjustments = input.otherAdjustments ?? 0;

  const gross = fixedSalary + commission + incentives;
  const netPayable = Math.max(
    0,
    gross - unpaidLeaveDeduction - advanceDeduction + otherAdjustments,
  );

  return {
    fixedSalary,
    commission,
    incentives,
    perDaySalary,
    unpaidLeaveDeduction,
    advanceDeduction,
    otherAdjustments,
    gross,
    netPayable,
  };
}

/** Outstanding after a payment. */
export function salaryBalance(netPayable: Paise, paid: Paise): Paise {
  return nonNegative(netPayable - paid);
}

export interface LeaveSlice {
  startDate: string;
  endDate: string;
  paid: boolean;
}

export interface MonthLeaveTally {
  paidLeaveDays: number;
  unpaidLeaveDays: number;
}

/**
 * Counts approved leave days that fall inside a payroll month, clipping
 * leaves that start or end outside the month.
 */
export function tallyLeaveDays(leaves: LeaveSlice[], monthStart: string, monthEnd: string): MonthLeaveTally {
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  for (const leave of leaves) {
    const from = leave.startDate > monthStart ? leave.startDate : monthStart;
    const to = leave.endDate < monthEnd ? leave.endDate : monthEnd;
    if (from > to) continue;
    const days = daysBetweenInclusive(from, to);
    if (leave.paid) paidLeaveDays += days;
    else unpaidLeaveDays += days;
  }

  return { paidLeaveDays, unpaidLeaveDays };
}

/** Payroll status from net payable and amounts paid. */
export function payrollStatus(netPayable: Paise, paid: Paise): 'FINALISED' | 'PARTIALLY_PAID' | 'PAID' {
  if (paid <= 0) return 'FINALISED';
  if (paid >= netPayable) return 'PAID';
  return 'PARTIALLY_PAID';
}
