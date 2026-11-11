import type {
  Appointment,
  AppointmentStatus,
  BusinessHours,
  CalendarBlock,
  EmployeeLeave,
  Epoch,
} from '@/types';
import { combineDateTime, dateFromEpoch, formatTime } from '@/utils/date';
import { WEEKDAYS_SHORT } from '@/utils/constants';

/**
 * Scheduling rules. These functions are deliberately pure so the same rules can
 * run in the browser (warnings) and in tests (guarantees).
 */

export interface Interval {
  startAt: Epoch;
  endAt: Epoch;
}

export type ConflictKind =
  | 'INVALID_TIME'
  | 'CLOSED'
  | 'OUTSIDE_HOURS'
  | 'SALON_BLOCK'
  | 'EMPLOYEE_BLOCK'
  | 'LEAVE'
  | 'OVERLAP';

export interface ScheduleConflict {
  kind: ConflictKind;
  message: string;
  /** Owner override returns true only when at least one conflict exists. */
  blocking: boolean;
}

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['ENQUIRY', 'TENTATIVE', 'CONFIRMED'];

/** Standard half-open interval overlap test. */
export function overlaps(a: Interval, b: Interval): boolean {
  if (a.endAt <= a.startAt || b.endAt <= b.startAt) return false;
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

export function isActiveAppointment(appointment: Appointment): boolean {
  return ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status);
}

export function isOnLeave(leave: EmployeeLeave, dateISO: string): boolean {
  return leave.status === 'APPROVED' && leave.startDate <= dateISO && dateISO <= leave.endDate;
}

export function blockCoversEmployee(block: CalendarBlock, employeeId: string): boolean {
  if (block.scope === 'SALON') return true;
  return block.employeeId === employeeId;
}

export function hoursFor(dateISO: string, businessHours: BusinessHours[]): BusinessHours {
  const weekday = new Date(combineDateTime(dateISO, '12:00')).getDay();
  return businessHours[weekday] ?? { closed: false, open: '09:00', close: '20:00' };
}

export interface ConflictInput {
  startAt: Epoch;
  endAt: Epoch;
  employeeId: string;
  blocks: CalendarBlock[];
  leaves: EmployeeLeave[];
  appointments: Appointment[];
  businessHours: BusinessHours[];
  ignoreAppointmentId?: string;
  /** When true, a closed salon is not treated as a conflict (bridal overrides). */
  allowClosedSalon?: boolean;
}

/**
 * Returns every scheduling problem for a proposed appointment. An empty array
 * means the slot is safe to confirm. Owner overrides are recorded separately.
 */
export function findConflicts(input: ConflictInput): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const { startAt, endAt, employeeId } = input;

  if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
    return [{ kind: 'INVALID_TIME', message: 'End time must be after the start time.', blocking: true }];
  }

  const dateISO = dateFromEpoch(startAt);
  const hours = hoursFor(dateISO, input.businessHours);
  const dayLabel = WEEKDAYS_SHORT[new Date(startAt).getDay()];

  if (hours.closed && !input.allowClosedSalon) {
    conflicts.push({
      kind: 'CLOSED',
      message: `The salon is closed on ${dayLabel}. Create a calendar block or enable an override.`,
      blocking: true,
    });
  } else if (!hours.closed) {
    const openAt = combineDateTime(dateISO, hours.open);
    const closeAt = combineDateTime(dateISO, hours.close);
    if (startAt < openAt || endAt > closeAt) {
      conflicts.push({
        kind: 'OUTSIDE_HOURS',
        message: `Outside business hours (${hours.open}–${hours.close}).`,
        blocking: true,
      });
    }
  }

  for (const block of input.blocks) {
    if (!blockCoversEmployee(block, employeeId)) continue;
    if (!overlaps({ startAt, endAt }, block)) continue;
    conflicts.push({
      kind: block.scope === 'SALON' ? 'SALON_BLOCK' : 'EMPLOYEE_BLOCK',
      message:
        block.scope === 'SALON'
          ? `Salon blocked: ${block.reason} (${formatTime(block.startAt)}–${formatTime(block.endAt)}).`
          : `Employee unavailable: ${block.reason}.`,
      blocking: true,
    });
  }

  for (const leave of input.leaves) {
    if (leave.employeeId !== employeeId) continue;
    if (!isOnLeave(leave, dateISO)) continue;
    conflicts.push({
      kind: 'LEAVE',
      message: `${leave.employeeName} is on approved leave (${leave.startDate} to ${leave.endDate}).`,
      blocking: true,
    });
  }

  for (const appointment of input.appointments) {
    if (appointment.id === input.ignoreAppointmentId) continue;
    if (appointment.employeeId !== employeeId) continue;
    if (!isActiveAppointment(appointment)) continue;
    if (!overlaps({ startAt, endAt }, appointment)) continue;
    conflicts.push({
      kind: 'OVERLAP',
      message: `${appointment.employeeName} already has ${appointment.customerName} at ${formatTime(appointment.startAt)}.`,
      blocking: true,
    });
  }

  return conflicts;
}

/** Appointment duration in minutes, derived from the time range. */
export function appointmentMinutes(startAt: Epoch, endAt: Epoch): number {
  return Math.max(0, Math.round((endAt - startAt) / 60000));
}

/** Sorts appointments for a day agenda. */
export function sortAppointments(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((a, b) => a.startAt - b.startAt);
}

/** Upcoming bridal events (confirmed/tentative), soonest first. */
export function upcomingBridal<T extends { eventDate: string; status: string }>(bookings: T[], todayISO: string): T[] {
  return bookings
    .filter((booking) => booking.eventDate >= todayISO && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED')
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}
