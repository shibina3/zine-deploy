import { describe, expect, it } from 'vitest';
import type { Appointment, BusinessHours, CalendarBlock, EmployeeLeave } from '@/types';
import { findConflicts, isOnLeave, overlaps } from '@/modules/calendar/logic';
import { combineDateTime } from '@/utils/date';

const HOURS: BusinessHours[] = Array.from({ length: 7 }, () => ({
  closed: false,
  open: '09:00',
  close: '20:00',
}));

const day = '2026-11-10';
const at = (time: string) => combineDateTime(day, time);

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    createdAt: 0,
    updatedAt: 0,
    customerId: 'c1',
    customerName: 'Sneha',
    customerPhone: '99000',
    serviceIds: ['s1'],
    serviceNames: ['Hair Spa'],
    employeeId: 'e1',
    employeeName: 'Anita',
    startAt: at('11:00'),
    endAt: at('12:00'),
    estimatedTotal: 100000,
    advance: 0,
    status: 'CONFIRMED',
    source: 'APPOINTMENT',
    ...overrides,
  };
}

const base = {
  employeeId: 'e1',
  blocks: [] as CalendarBlock[],
  leaves: [] as EmployeeLeave[],
  appointments: [] as Appointment[],
  businessHours: HOURS,
};

describe('interval overlaps', () => {
  it('detects overlapping ranges', () => {
    expect(
      overlaps({ startAt: at('10:00'), endAt: at('11:30') }, { startAt: at('11:00'), endAt: at('12:00') }),
    ).toBe(true);
  });

  it('treats touching ranges as free', () => {
    expect(
      overlaps({ startAt: at('10:00'), endAt: at('11:00') }, { startAt: at('11:00'), endAt: at('12:00') }),
    ).toBe(false);
  });

  it('ignores zero-length intervals', () => {
    expect(
      overlaps({ startAt: at('10:00'), endAt: at('10:00') }, { startAt: at('09:00'), endAt: at('12:00') }),
    ).toBe(false);
  });
});

describe('conflict detection', () => {
  it('accepts a free slot inside business hours', () => {
    expect(findConflicts({ ...base, startAt: at('11:00'), endAt: at('12:00') })).toEqual([]);
  });

  it('rejects a slot outside business hours', () => {
    const conflicts = findConflicts({ ...base, startAt: at('08:00'), endAt: at('09:00') });
    expect(conflicts.map((conflict) => conflict.kind)).toContain('OUTSIDE_HOURS');
  });

  it('rejects an invalid range', () => {
    const conflicts = findConflicts({ ...base, startAt: at('12:00'), endAt: at('11:00') });
    expect(conflicts[0].kind).toBe('INVALID_TIME');
  });

  it('rejects a salon block', () => {
    const blocks: CalendarBlock[] = [
      {
        id: 'b1',
        createdAt: 0,
        updatedAt: 0,
        scope: 'SALON',
        startAt: at('09:00'),
        endAt: at('15:00'),
        reason: 'Bridal event',
      },
    ];
    const conflicts = findConflicts({ ...base, blocks, startAt: at('11:00'), endAt: at('12:00') });
    expect(conflicts.map((conflict) => conflict.kind)).toContain('SALON_BLOCK');
  });

  it('ignores blocks for a different employee', () => {
    const blocks: CalendarBlock[] = [
      {
        id: 'b2',
        createdAt: 0,
        updatedAt: 0,
        scope: 'EMPLOYEE',
        employeeId: 'e2',
        startAt: at('09:00'),
        endAt: at('15:00'),
        reason: 'Training',
      },
    ];
    expect(findConflicts({ ...base, blocks, startAt: at('11:00'), endAt: at('12:00') })).toEqual([]);
  });

  it('rejects approved leave for the employee', () => {
    const leaves: EmployeeLeave[] = [
      {
        id: 'l1',
        createdAt: 0,
        updatedAt: 0,
        employeeId: 'e1',
        employeeName: 'Anita',
        startDate: day,
        endDate: day,
        type: 'CASUAL',
        paid: false,
        reason: 'Family function',
        status: 'APPROVED',
      },
    ];
    const conflicts = findConflicts({ ...base, leaves, startAt: at('11:00'), endAt: at('12:00') });
    expect(conflicts.map((conflict) => conflict.kind)).toContain('LEAVE');
  });

  it('ignores pending leave', () => {
    const leaves: EmployeeLeave[] = [
      {
        id: 'l2',
        createdAt: 0,
        updatedAt: 0,
        employeeId: 'e1',
        employeeName: 'Anita',
        startDate: day,
        endDate: day,
        type: 'CASUAL',
        paid: false,
        reason: 'Pending request',
        status: 'PENDING',
      },
    ];
    expect(findConflicts({ ...base, leaves, startAt: at('11:00'), endAt: at('12:00') })).toEqual([]);
  });

  it('detects double bookings for the same employee', () => {
    const conflicts = findConflicts({
      ...base,
      appointments: [appointment()],
      startAt: at('11:30'),
      endAt: at('12:30'),
    });
    expect(conflicts.map((conflict) => conflict.kind)).toContain('OVERLAP');
  });

  it('allows editing the same appointment without a false overlap', () => {
    const conflicts = findConflicts({
      ...base,
      appointments: [appointment()],
      ignoreAppointmentId: 'a1',
      startAt: at('11:00'),
      endAt: at('12:00'),
    });
    expect(conflicts).toEqual([]);
  });

  it('ignores cancelled appointments', () => {
    const conflicts = findConflicts({
      ...base,
      appointments: [appointment({ status: 'CANCELLED' })],
      startAt: at('11:00'),
      endAt: at('12:00'),
    });
    expect(conflicts).toEqual([]);
  });

  it('flags a closed salon day', () => {
    const closed = HOURS.map((hours, index) => ({ ...hours, closed: index === 2 }));
    const conflicts = findConflicts({
      ...base,
      businessHours: closed,
      startAt: at('11:00'),
      endAt: at('12:00'),
    });
    expect(conflicts.map((conflict) => conflict.kind)).toContain('CLOSED');
  });

  it('checks approved leave across a date range', () => {
    const leave = {
      status: 'APPROVED',
      startDate: '2026-11-09',
      endDate: '2026-11-12',
    } as EmployeeLeave;
    expect(isOnLeave(leave, '2026-11-10')).toBe(true);
    expect(isOnLeave(leave, '2026-11-13')).toBe(false);
    expect(isOnLeave({ ...leave, status: 'PENDING' }, '2026-11-10')).toBe(false);
  });
});
