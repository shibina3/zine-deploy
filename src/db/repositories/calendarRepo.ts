import { db } from '@/db/database';
import type {
  Appointment,
  AppointmentStatus,
  BridalBooking,
  BridalStatus,
  CalendarBlock,
  Epoch,
  Paise,
  TimeString,
} from '@/types';
import { newId } from '@/utils/id';
import { combineDateTime, dayRange, todayISO } from '@/utils/date';
import { sumPaise } from '@/utils/money';
import { getActor, actorIsOwner } from '@/services/actor';
import { logAudit } from './auditRepo';
import { getSettings } from './settingsRepo';
import { findConflicts, type ScheduleConflict } from '@/modules/calendar/logic';

export class ConflictError extends Error {
  conflicts: ScheduleConflict[];
  constructor(conflicts: ScheduleConflict[]) {
    super(conflicts.map((conflict) => conflict.message).join(' '));
    this.name = 'ConflictError';
    this.conflicts = conflicts;
  }
}

export interface AppointmentInput {
  id?: string;
  customerId: string;
  serviceIds: string[];
  employeeId: string;
  startAt: Epoch;
  endAt?: Epoch;
  estimatedTotal?: Paise;
  advance?: Paise;
  notes?: string;
  status?: AppointmentStatus;
  bridalBookingId?: string;
  overrideReason?: string;
}

/** Collects everything the conflict checker needs for a proposed slot. */
export async function checkConflicts(input: {
  startAt: Epoch;
  endAt: Epoch;
  employeeId: string;
  ignoreAppointmentId?: string;
  allowClosedSalon?: boolean;
}): Promise<ScheduleConflict[]> {
  const [blocks, leaves, appointments, settings] = await Promise.all([
    db.calendarBlocks.toArray(),
    db.employeeLeaves.where('status').equals('APPROVED').toArray(),
    db.appointments.toArray(),
    getSettings(),
  ]);

  return findConflicts({
    startAt: input.startAt,
    endAt: input.endAt,
    employeeId: input.employeeId,
    blocks,
    leaves,
    appointments,
    businessHours: settings.businessHours,
    ignoreAppointmentId: input.ignoreAppointmentId,
    allowClosedSalon: input.allowClosedSalon,
  });
}

export async function saveAppointment(input: AppointmentInput): Promise<Appointment> {
  if (!input.customerId) throw new Error('Select a customer.');
  if (!input.employeeId) throw new Error('Assign an employee.');
  if (!input.serviceIds.length) throw new Error('Select at least one service.');

  const [customer, employee, services] = await Promise.all([
    db.customers.get(input.customerId),
    db.employees.get(input.employeeId),
    db.services.bulkGet(input.serviceIds),
  ]);
  if (!customer) throw new Error('Customer not found.');
  if (!employee) throw new Error('Employee not found.');

  const validServices = services.filter((service): service is NonNullable<typeof service> => Boolean(service));
  const duration = validServices.reduce((total, service) => total + service.durationMinutes, 0) || 30;
  const endAt = input.endAt && input.endAt > input.startAt ? input.endAt : input.startAt + duration * 60_000;

  const conflicts = await checkConflicts({
    startAt: input.startAt,
    endAt,
    employeeId: input.employeeId,
    ignoreAppointmentId: input.id,
  });

  if (conflicts.length) {
    if (!input.overrideReason?.trim()) throw new ConflictError(conflicts);
    if (!actorIsOwner()) throw new Error('Only the owner can override a scheduling conflict.');
  }

  const actor = getActor();
  const now = Date.now();
  const estimatedTotal =
    input.estimatedTotal ?? sumPaise(validServices.map((service) => service.price));

  const appointment: Appointment = {
    id: input.id ?? newId(),
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    serviceIds: input.serviceIds,
    serviceNames: validServices.map((service) => service.name),
    employeeId: employee.id,
    employeeName: employee.name,
    startAt: input.startAt,
    endAt,
    estimatedTotal,
    advance: input.advance ?? 0,
    notes: input.notes?.trim() || undefined,
    status: input.status ?? 'CONFIRMED',
    source: 'APPOINTMENT',
    bridalBookingId: input.bridalBookingId,
    conflictOverride: conflicts.length ? input.overrideReason?.trim() : undefined,
  };

  if (input.id) {
    const existing = await db.appointments.get(input.id);
    if (!existing) throw new Error('Appointment not found.');
    appointment.createdAt = existing.createdAt;
    appointment.source = existing.source;
    appointment.bridalBookingId = existing.bridalBookingId;
    await db.appointments.put(appointment);
  } else {
    await db.appointments.add(appointment);
  }

  await logAudit({
    action: conflicts.length ? 'APPOINTMENT_OVERRIDE' : 'APPOINTMENT_CREATE',
    entityType: 'appointment',
    entityId: appointment.id,
    reason: conflicts.length ? input.overrideReason : undefined,
    newValue: {
      startAt: appointment.startAt,
      customer: customer.name,
      employee: employee.name,
      conflicts: conflicts.map((conflict) => conflict.kind),
    },
  });

  return appointment;
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  await db.appointments.update(id, { status, updatedAt: Date.now() });
  if (status === 'CANCELLED') {
    await logAudit({
      action: 'APPOINTMENT_CANCEL',
      entityType: 'appointment',
      entityId: id,
      newValue: { status },
    });
  }
}

export async function listAppointments(): Promise<Appointment[]> {
  return db.appointments.orderBy('startAt').toArray();
}

export async function appointmentsForDay(dateISO: string): Promise<Appointment[]> {
  const { from, to } = dayRange(dateISO);
  const rows = await db.appointments.where('startAt').between(from, to, true, true).toArray();
  return rows.sort((a, b) => a.startAt - b.startAt);
}

export async function upcomingAppointments(fromISO = todayISO()): Promise<Appointment[]> {
  const from = combineDateTime(fromISO, '00:00');
  const rows = await db.appointments.where('startAt').aboveOrEqual(from).toArray();
  return rows
    .filter((row) => row.status !== 'CANCELLED' && row.status !== 'NO_SHOW')
    .sort((a, b) => a.startAt - b.startAt);
}

export async function listBlocks(): Promise<CalendarBlock[]> {
  return db.calendarBlocks.orderBy('startAt').toArray();
}

export async function saveBlock(input: {
  id?: string;
  scope: CalendarBlock['scope'];
  employeeId?: string;
  employeeName?: string;
  startAt: Epoch;
  endAt: Epoch;
  reason: string;
}): Promise<CalendarBlock> {
  if (input.endAt <= input.startAt) throw new Error('The block end must be after the start.');
  if (!input.reason.trim()) throw new Error('Add a reason for blocking the calendar.');
  if (input.scope === 'EMPLOYEE' && !input.employeeId) throw new Error('Choose the employee to block.');

  const now = Date.now();
  const existing = input.id ? await db.calendarBlocks.get(input.id) : undefined;
  const block: CalendarBlock = {
    id: input.id ?? newId(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: getActor().id,
    scope: input.scope,
    employeeId: input.scope === 'EMPLOYEE' ? input.employeeId : undefined,
    employeeName: input.scope === 'EMPLOYEE' ? input.employeeName : undefined,
    startAt: input.startAt,
    endAt: input.endAt,
    reason: input.reason.trim(),
    bridalBookingId: existing?.bridalBookingId,
  };
  await db.calendarBlocks.put(block);
  await logAudit({
    action: 'BLOCK_CREATE',
    entityType: 'calendarBlock',
    entityId: block.id,
    reason: block.reason,
    newValue: { scope: block.scope, startAt: block.startAt, endAt: block.endAt },
  });
  return block;
}

export async function deleteBlock(id: string): Promise<void> {
  await db.calendarBlocks.delete(id);
}

export interface BridalInput {
  id?: string;
  customerId: string;
  eventType: string;
  eventDate: string;
  startTime: TimeString;
  endTime: TimeString;
  location: string;
  offerId?: string;
  serviceIds: string[];
  employeeIds: string[];
  trialDate?: string;
  packagePrice: Paise;
  advance: Paise;
  specialRequirements?: string;
  notes?: string;
  status: BridalStatus;
  /** Reserve the whole salon for the event. */
  blockSalon?: boolean;
}

const BRIDAL_TO_APPOINTMENT: Record<BridalStatus, AppointmentStatus> = {
  ENQUIRY: 'ENQUIRY',
  QUOTATION: 'ENQUIRY',
  TENTATIVE: 'TENTATIVE',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export async function listBridalBookings(): Promise<BridalBooking[]> {
  return db.bridalBookings.orderBy('eventDate').toArray();
}

/**
 * Saves a bridal booking and keeps its calendar appointment + salon block in
 * step, so the event always shows on the main calendar.
 */
export async function saveBridalBooking(input: BridalInput): Promise<BridalBooking> {
  if (!input.customerId) throw new Error('Select a customer.');
  if (!input.serviceIds.length) throw new Error('Select at least one service or package.');
  if (input.endTime <= input.startTime) throw new Error('Event end time must be after the start time.');
  if (input.advance > input.packagePrice) throw new Error('Advance cannot be more than the package price.');

  const [customer, services, employees] = await Promise.all([
    db.customers.get(input.customerId),
    db.services.bulkGet(input.serviceIds),
    db.employees.bulkGet(input.employeeIds),
  ]);
  if (!customer) throw new Error('Customer not found.');

  const validServices = services.filter((service): service is NonNullable<typeof service> => Boolean(service));
  const validEmployees = employees.filter((employee): employee is NonNullable<typeof employee> =>
    Boolean(employee),
  );
  const now = Date.now();
  const actor = getActor();
  const bookingId = input.id ?? newId();
  const existing = input.id ? await db.bridalBookings.get(input.id) : undefined;

  const startAt = combineDateTime(input.eventDate, input.startTime);
  const endAt = combineDateTime(input.eventDate, input.endTime);

  const booking: BridalBooking = {
    id: bookingId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: actor.id,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    eventType: input.eventType.trim() || 'Bridal',
    eventDate: input.eventDate,
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location.trim(),
    offerId: input.offerId,
    serviceIds: input.serviceIds,
    serviceNames: validServices.map((service) => service.name),
    employeeIds: input.employeeIds,
    employeeNames: validEmployees.map((employee) => employee.name),
    trialDate: input.trialDate || undefined,
    packagePrice: Math.round(input.packagePrice),
    advance: Math.round(input.advance),
    specialRequirements: input.specialRequirements?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    status: input.status,
    appointmentId: existing?.appointmentId,
  };

  await persistBridalBooking({ booking, input, startAt, endAt, now, actorId: actor.id });
  return booking;
}

async function persistBridalBooking(args: {
  booking: BridalBooking;
  input: BridalInput;
  startAt: Epoch;
  endAt: Epoch;
  now: number;
  actorId?: string;
}): Promise<void> {
  const { booking, input, startAt, endAt, now, actorId } = args;

  await db.transaction('rw', [db.bridalBookings, db.appointments, db.calendarBlocks], async () => {
    await db.bridalBookings.put(booking);

    if (input.employeeIds.length) {
      const appointmentId = booking.appointmentId ?? newId();
      const existingAppointment = await db.appointments.get(appointmentId);
      await db.appointments.put({
        id: appointmentId,
        createdAt: existingAppointment?.createdAt ?? now,
        updatedAt: now,
        createdBy: actorId,
        customerId: booking.customerId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        serviceIds: booking.serviceIds,
        serviceNames: booking.serviceNames,
        employeeId: booking.employeeIds[0],
        employeeName: booking.employeeNames.join(', '),
        startAt,
        endAt,
        estimatedTotal: booking.packagePrice,
        advance: booking.advance,
        notes: `Bridal ${booking.eventType}`,
        status: BRIDAL_TO_APPOINTMENT[booking.status],
        source: 'BRIDAL',
        bridalBookingId: booking.id,
        conflictOverride: existingAppointment?.conflictOverride,
      });
      if (booking.appointmentId !== appointmentId) {
        booking.appointmentId = appointmentId;
        await db.bridalBookings.update(booking.id, { appointmentId });
      }
    }

    const existingBlock = await db.calendarBlocks
      .filter((block) => block.bridalBookingId === booking.id)
      .first();

    if (input.blockSalon) {
      await db.calendarBlocks.put({
        id: existingBlock?.id ?? newId(),
        createdAt: existingBlock?.createdAt ?? now,
        updatedAt: now,
        createdBy: actorId,
        scope: 'SALON',
        startAt,
        endAt,
        reason: `Bridal booking — ${booking.customerName}`,
        bridalBookingId: booking.id,
      });
    } else if (existingBlock) {
      await db.calendarBlocks.delete(existingBlock.id);
    }
  });

  await logAudit({
    action: 'BRIDAL_SAVE',
    entityType: 'bridalBooking',
    entityId: booking.id,
    newValue: {
      eventDate: booking.eventDate,
      packagePrice: booking.packagePrice,
      advance: booking.advance,
      status: booking.status,
    },
  });
}

export async function setBridalStatus(id: string, status: BridalStatus): Promise<void> {
  const booking = await db.bridalBookings.get(id);
  if (!booking) throw new Error('Bridal booking not found.');
  const now = Date.now();
  await db.bridalBookings.update(id, { status, updatedAt: now });
  if (booking.appointmentId) {
    await db.appointments.update(booking.appointmentId, {
      status: BRIDAL_TO_APPOINTMENT[status],
      updatedAt: now,
    });
  }
  if (status === 'CANCELLED') {
    const block = await db.calendarBlocks.filter((row) => row.bridalBookingId === id).first();
    if (block) await db.calendarBlocks.delete(block.id);
  }
}

