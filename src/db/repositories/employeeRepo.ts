import { db } from '@/db/database';
import type { DateString, Employee, EmployeeLeave, LeaveStatus, LeaveType, Paise, SalaryType } from '@/types';
import { newId } from '@/utils/id';
import { monthBounds } from '@/utils/misc';
import { logAudit } from './auditRepo';

export interface EmployeeInput {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  designation: string;
  joinedAt: DateString;
  notes?: string;
  salaryType: SalaryType;
  fixedSalary: Paise;
  commissionRateBps: number;
  workingDaysPerMonth: number;
}

export async function listEmployees(includeInactive = false): Promise<Employee[]> {
  const employees = await db.employees.orderBy('name').toArray();
  return includeInactive ? employees : employees.filter((employee) => employee.isActive);
}

export async function getEmployee(id: string): Promise<Employee | undefined> {
  return db.employees.get(id);
}

export async function saveEmployee(input: EmployeeInput): Promise<Employee> {
  const name = input.name.trim();
  if (!name) throw new Error('Employee name is required.');

  const now = Date.now();
  const base = {
    name,
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    designation: input.designation,
    joinedAt: input.joinedAt,
    notes: input.notes?.trim() || undefined,
    salaryType: input.salaryType,
    fixedSalary: Math.max(0, Math.round(input.fixedSalary)),
    commissionRateBps: Math.max(0, Math.min(10_000, Math.round(input.commissionRateBps))),
    workingDaysPerMonth: Math.max(1, Math.round(input.workingDaysPerMonth)),
  };

  if (input.id) {
    const existing = await db.employees.get(input.id);
    if (!existing) throw new Error('Employee not found.');
    const updated: Employee = { ...existing, ...base, updatedAt: now };
    await db.employees.put(updated);
    return updated;
  }

  const employee: Employee = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    isActive: true,
    ...base,
  };
  await db.employees.add(employee);
  return employee;
}

export async function setEmployeeActive(id: string, isActive: boolean): Promise<void> {
  await db.employees.update(id, { isActive, updatedAt: Date.now() });
}

/** Leave records, newest first. */
export async function listLeaves(
  filter: { status?: LeaveStatus; employeeId?: string } = {},
): Promise<EmployeeLeave[]> {
  let leaves = await db.employeeLeaves.orderBy('startDate').reverse().toArray();
  if (filter.status) leaves = leaves.filter((leave) => leave.status === filter.status);
  if (filter.employeeId) leaves = leaves.filter((leave) => leave.employeeId === filter.employeeId);
  return leaves;
}

export interface LeaveInput {
  employeeId: string;
  startDate: DateString;
  endDate: DateString;
  type: LeaveType;
  paid: boolean;
  reason: string;
}

export async function requestLeave(input: LeaveInput): Promise<EmployeeLeave> {
  if (!input.employeeId) throw new Error('Choose an employee.');
  if (input.endDate < input.startDate) throw new Error('Leave end date cannot be before the start date.');
  if (!input.reason.trim()) throw new Error('Add a short reason for the leave.');

  const employee = await db.employees.get(input.employeeId);
  if (!employee) throw new Error('Employee not found.');

  const now = Date.now();
  const leave: EmployeeLeave = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    employeeId: employee.id,
    employeeName: employee.name,
    startDate: input.startDate,
    endDate: input.endDate,
    type: input.type,
    paid: input.paid,
    reason: input.reason.trim(),
    status: 'PENDING',
  };
  await db.employeeLeaves.add(leave);
  await logAudit({ action: 'LEAVE_CREATE', entityType: 'leave', entityId: leave.id, newValue: leave });
  return leave;
}

export async function decideLeave(
  id: string,
  decision: Extract<LeaveStatus, 'APPROVED' | 'REJECTED'>,
  note?: string,
): Promise<void> {
  const leave = await db.employeeLeaves.get(id);
  if (!leave) throw new Error('Leave request not found.');
  const now = Date.now();
  await db.employeeLeaves.update(id, {
    status: decision,
    approvedAt: decision === 'APPROVED' ? now : undefined,
    approvedByName: decision === 'APPROVED' ? 'Owner' : undefined,
    decisionNote: note?.trim() || undefined,
    updatedAt: now,
  });
  await logAudit({
    action: 'LEAVE_DECISION',
    entityType: 'leave',
    entityId: id,
    reason: note,
    previousValue: { status: leave.status },
    newValue: { status: decision },
  });
}

export async function cancelLeave(id: string): Promise<void> {
  await db.employeeLeaves.update(id, { status: 'CANCELLED', updatedAt: Date.now() });
}

/** Approved leave covering a specific calendar date. */
export async function approvedLeavesOn(dateISO: string): Promise<EmployeeLeave[]> {
  const leaves = await db.employeeLeaves.where('status').equals('APPROVED').toArray();
  return leaves.filter((leave) => leave.startDate <= dateISO && dateISO <= leave.endDate);
}

export async function upcomingLeaves(fromISO: DateString): Promise<EmployeeLeave[]> {
  const leaves = await db.employeeLeaves.toArray();
  return leaves
    .filter((leave) => leave.status !== 'CANCELLED' && leave.status !== 'REJECTED' && leave.endDate >= fromISO)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Approved leaves clipped to a payroll month, used by payroll generation. */
export async function approvedLeavesForMonth(
  employeeId: string,
  salaryMonth: string,
): Promise<EmployeeLeave[]> {
  const { start, end } = monthBounds(salaryMonth);
  return db.employeeLeaves
    .where('employeeId')
    .equals(employeeId)
    .filter((leave) => leave.status === 'APPROVED' && !(leave.endDate < start || leave.startDate > end))
    .toArray();
}
