import { db } from '@/db/database';
import type {
  DateString,
  MonthString,
  Paise,
  PaymentMethod,
  SalaryAdvance,
  SalaryPayment,
  SalaryRecord,
} from '@/types';
import { newId } from '@/utils/id';
import { monthBounds } from '@/utils/misc';
import { sumPaise } from '@/utils/money';
import { combineDateTime, dateFromEpoch } from '@/utils/date';
import { getActor } from '@/services/actor';
import { logAudit } from './auditRepo';
import { approvedLeavesForMonth } from './employeeRepo';
import { computePayroll, payrollStatus, tallyLeaveDays } from '@/modules/payroll/logic';

export async function listSalaryRecords(): Promise<SalaryRecord[]> {
  return db.salaryRecords.orderBy('salaryMonth').reverse().toArray();
}

export async function salaryRecordFor(
  employeeId: string,
  salaryMonth: MonthString,
): Promise<SalaryRecord | undefined> {
  return db.salaryRecords.where('[employeeId+salaryMonth]').equals([employeeId, salaryMonth]).first();
}

export async function listSalaryPayments(): Promise<SalaryPayment[]> {
  return db.salaryPayments.orderBy('paidAt').reverse().toArray();
}

export async function listAdvances(): Promise<SalaryAdvance[]> {
  return db.salaryAdvances.orderBy('date').reverse().toArray();
}

export async function unsettledAdvances(employeeId: string): Promise<SalaryAdvance[]> {
  const rows = await db.salaryAdvances.where('employeeId').equals(employeeId).toArray();
  return rows.filter((advance) => !advance.settledInRecordId);
}

async function serviceRevenueFor(employeeId: string, from: number, to: number): Promise<Paise> {
  const bills = await db.bills.where('billDate').between(from, to, true, true).toArray();
  const activeIds = new Set(
    bills
      .filter((bill) => bill.status !== 'CANCELLED' && bill.employeeId === employeeId)
      .map((bill) => bill.id),
  );
  if (!activeIds.size) return 0;
  const items = await db.billItems.toArray();
  return sumPaise(
    items
      .filter((item) => activeIds.has(item.billId) && (item.itemType === 'SERVICE' || item.itemType === 'COMBO'))
      .map((item) => item.lineTotal),
  );
}

/**
 * Generates (or regenerates) a draft salary record for an employee and month.
 * Finalised records are immutable — corrections must be adjustment entries.
 */
export async function generateSalaryRecord(input: {
  employeeId: string;
  salaryMonth: MonthString;
  incentives?: Paise;
  otherAdjustments?: Paise;
  note?: string;
  includeAdvances?: boolean;
}): Promise<SalaryRecord> {
  const employee = await db.employees.get(input.employeeId);
  if (!employee) throw new Error('Employee not found.');

  const existing = await salaryRecordFor(input.employeeId, input.salaryMonth);
  if (existing && existing.status !== 'DRAFT') {
    throw new Error('This payroll is already finalised. Record an adjustment instead of regenerating.');
  }

  const bounds = monthBounds(input.salaryMonth);
  const from = combineDateTime(bounds.start, '00:00');
  const to = combineDateTime(bounds.end, '23:59');
  const serviceRevenue = await serviceRevenueFor(input.employeeId, from, to);

  const leaves = await approvedLeavesForMonth(input.employeeId, input.salaryMonth);
  const tally = tallyLeaveDays(
    leaves.map((leave) => ({ startDate: leave.startDate, endDate: leave.endDate, paid: leave.paid })),
    bounds.start,
    bounds.end,
  );

  const advances = await unsettledAdvances(input.employeeId);
  const advanceDeduction =
    input.includeAdvances === false ? 0 : sumPaise(advances.map((row) => row.amount));

  const result = computePayroll({
    salaryType: employee.salaryType,
    fixedSalary: employee.fixedSalary,
    commissionRateBps: employee.commissionRateBps,
    serviceRevenue,
    incentives: input.incentives ?? 0,
    paidLeaveDays: tally.paidLeaveDays,
    unpaidLeaveDays: tally.unpaidLeaveDays,
    workingDaysPerMonth: employee.workingDaysPerMonth,
    advanceDeduction,
    otherAdjustments: input.otherAdjustments ?? 0,
  });

  const actor = getActor();
  const now = Date.now();
  const record: SalaryRecord = {
    id: existing?.id ?? newId(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: actor.id,
    employeeId: employee.id,
    employeeName: employee.name,
    salaryMonth: input.salaryMonth,
    fixedSalary: result.fixedSalary,
    serviceRevenue,
    commissionRateBps: employee.commissionRateBps,
    commission: result.commission,
    incentives: result.incentives,
    paidLeaveDays: tally.paidLeaveDays,
    unpaidLeaveDays: tally.unpaidLeaveDays,
    perDaySalary: result.perDaySalary,
    unpaidLeaveDeduction: result.unpaidLeaveDeduction,
    advanceDeduction: result.advanceDeduction,
    otherAdjustments: result.otherAdjustments,
    gross: result.gross,
    netPayable: result.netPayable,
    paid: existing?.paid ?? 0,
    balance: Math.max(0, result.netPayable - (existing?.paid ?? 0)),
    status: 'DRAFT',
    note: input.note?.trim() || undefined,
  };

  await db.transaction('rw', [db.salaryRecords, db.salaryAdvances], async () => {
    await db.salaryRecords.put(record);
    if (input.includeAdvances !== false) {
      for (const advance of advances) {
        await db.salaryAdvances.update(advance.id, {
          settledInRecordId: record.id,
          settledAt: now,
          updatedAt: now,
        });
      }
    }
  });

  return record;
}

export async function updateSalaryDraft(
  recordId: string,
  patch: { incentives?: Paise; otherAdjustments?: Paise; note?: string },
): Promise<void> {
  const record = await db.salaryRecords.get(recordId);
  if (!record) throw new Error('Salary record not found.');
  if (record.status !== 'DRAFT') throw new Error('Only draft payroll can be edited.');

  const incentives = patch.incentives ?? record.incentives;
  const otherAdjustments = patch.otherAdjustments ?? record.otherAdjustments;
  const gross = record.fixedSalary + record.commission + incentives;
  const netPayable = Math.max(
    0,
    gross - record.unpaidLeaveDeduction - record.advanceDeduction + otherAdjustments,
  );

  await db.salaryRecords.update(recordId, {
    incentives,
    otherAdjustments,
    gross,
    netPayable,
    balance: Math.max(0, netPayable - record.paid),
    note: patch.note?.trim() || undefined,
    updatedAt: Date.now(),
  });
}

/** Freezes a salary record. Later corrections become adjustment entries. */
export async function finaliseSalary(recordId: string): Promise<void> {
  const record = await db.salaryRecords.get(recordId);
  if (!record) throw new Error('Salary record not found.');
  if (record.status !== 'DRAFT') throw new Error('This payroll is already finalised.');
  const now = Date.now();
  await db.salaryRecords.update(recordId, { status: 'FINALISED', finalisedAt: now, updatedAt: now });
  await logAudit({
    action: 'SALARY_FINALISE',
    entityType: 'salaryRecord',
    entityId: recordId,
    newValue: { employee: record.employeeName, month: record.salaryMonth, netPayable: record.netPayable },
  });
}

/** Records a full or partial salary payment and books it as a salary expense. */
export async function addSalaryPayment(
  recordId: string,
  input: { amount: Paise; method: PaymentMethod; note?: string; date?: DateString },
): Promise<void> {
  if (!input.amount || input.amount <= 0) throw new Error('Payment amount must be greater than zero.');
  const actor = getActor();
  const now = Date.now();

  await db.transaction('rw', [db.salaryRecords, db.salaryPayments, db.expenses], async () => {
    const record = await db.salaryRecords.get(recordId);
    if (!record) throw new Error('Salary record not found.');
    const outstanding = Math.max(0, record.netPayable - record.paid);
    if (outstanding <= 0) throw new Error('This salary is already fully paid.');
    if (Math.round(input.amount) > outstanding) {
      throw new Error('Payment cannot be more than the outstanding salary.');
    }
    const amount = Math.round(input.amount);

    await db.salaryPayments.add({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      salaryRecordId: recordId,
      employeeId: record.employeeId,
      amount,
      method: input.method,
      paidAt: now,
      note: input.note?.trim() || undefined,
      createdByName: actor.name,
    });

    const paid = record.paid + amount;
    await db.salaryRecords.update(recordId, {
      paid,
      balance: Math.max(0, record.netPayable - paid),
      status: payrollStatus(record.netPayable, paid),
      finalisedAt: record.finalisedAt ?? now,
      updatedAt: now,
    });

    await db.expenses.add({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      category: 'Employee salaries',
      description: `Salary — ${record.employeeName} (${record.salaryMonth})`,
      amount,
      date: input.date ?? dateFromEpoch(now),
      method: input.method,
      createdByName: actor.name,
    });
  });

  await logAudit({
    action: 'SALARY_PAY',
    entityType: 'salaryRecord',
    entityId: recordId,
    newValue: { amount: input.amount, method: input.method },
  });
}

export async function createAdvance(input: {
  employeeId: string;
  amount: Paise;
  method: PaymentMethod;
  date: DateString;
  note?: string;
}): Promise<void> {
  if (!input.amount || input.amount <= 0) throw new Error('Advance amount must be greater than zero.');
  const employee = await db.employees.get(input.employeeId);
  if (!employee) throw new Error('Employee not found.');
  const actor = getActor();
  const now = Date.now();
  const advanceId = newId();

  await db.salaryAdvances.add({
    id: advanceId,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    employeeId: employee.id,
    employeeName: employee.name,
    amount: Math.round(input.amount),
    date: input.date,
    method: input.method,
    note: input.note?.trim() || undefined,
  });

  await logAudit({
    action: 'ADVANCE_CREATE',
    entityType: 'salaryAdvance',
    entityId: advanceId,
    newValue: { employee: employee.name, amount: input.amount, date: input.date },
  });
}
