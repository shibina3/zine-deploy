import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Search, Sparkles } from 'lucide-react';
import type { Appointment, ID, Paise } from '@/types';
import {
  ConflictError,
  checkConflicts,
  saveAppointment,
} from '@/db/repositories/calendarRepo';
import { useCustomers, useEmployees, useServices } from '@/hooks/useDb';
import { useIsOwner } from '@/stores/authStore';
import type { ScheduleConflict } from '@/modules/calendar/logic';
import { combineDateTime, dateFromEpoch, formatDuration, formatTime, timeFromEpoch } from '@/utils/date';
import { formatINR, sumPaise } from '@/utils/money';
import { APPOINTMENT_STATUS } from '@/utils/constants';
import { cn } from '@/utils/cn';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Avatar } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function AppointmentDialog({
  open,
  appointment,
  presetDate,
  onClose,
}: {
  open: boolean;
  appointment: Appointment | null;
  presetDate: string;
  onClose: () => void;
}) {
  const customers = useCustomers();
  const services = useServices();
  const employees = useEmployees();
  const owner = useIsOwner();

  const [customerId, setCustomerId] = useState('');
  const [serviceIds, setServiceIds] = useState<ID[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(presetDate);
  const [time, setTime] = useState('11:00');
  const [advance, setAdvance] = useState<Paise>(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Appointment['status']>('CONFIRMED');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [overrideReason, setOverrideReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerId(appointment?.customerId ?? '');
    setServiceIds(appointment?.serviceIds ?? []);
    setEmployeeId(appointment?.employeeId ?? employees[0]?.id ?? '');
    setDate(appointment ? dateFromEpoch(appointment.startAt) : presetDate);
    setTime(appointment ? timeFromEpoch(appointment.startAt) : '11:00');
    setAdvance(appointment?.advance ?? 0);
    setNotes(appointment?.notes ?? '');
    setStatus(appointment?.status ?? 'CONFIRMED');
    setQuery('');
    setError('');
    setConflicts([]);
    setOverrideReason('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment?.id, presetDate]);

  const selectedServices = useMemo(
    () => services.filter((service) => serviceIds.includes(service.id)),
    [services, serviceIds],
  );
  const duration = selectedServices.reduce((total, service) => total + service.durationMinutes, 0) || 30;
  const estimated = sumPaise(selectedServices.map((service) => service.price));

  const customerMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers.slice(0, 5);
    const digits = term.replace(/\D/g, '');
    return customers
      .filter(
        (row) =>
          row.name.toLowerCase().includes(term) ||
          (digits.length > 0 && row.phone.replace(/\D/g, '').includes(digits)),
      )
      .slice(0, 5);
  }, [customers, query]);

  const customer = customers.find((row) => row.id === customerId);

  const submit = async (reason?: string) => {
    setError('');
    if (!customerId) return setError('Select a customer.');
    if (!serviceIds.length) return setError('Select at least one service.');
    if (!employeeId) return setError('Assign an employee.');

    const startAt = combineDateTime(date, time);
    setBusy(true);
    try {
      const checks = await checkConflicts({
        startAt,
        endAt: startAt + duration * 60_000,
        employeeId,
        ignoreAppointmentId: appointment?.id,
      });
      if (checks.length && !reason) {
        setConflicts(checks);
        return;
      }
      await saveAppointment({
        id: appointment?.id,
        customerId,
        serviceIds,
        employeeId,
        startAt,
        endAt: startAt + duration * 60_000,
        estimatedTotal: estimated,
        advance,
        notes,
        status,
        overrideReason: reason,
      });
      notifySuccess(appointment ? 'Appointment updated' : 'Appointment booked', reason ? 'Conflict override recorded.' : undefined);
      onClose();
    } catch (caught) {
      if (caught instanceof ConflictError) {
        setConflicts(caught.conflicts);
      } else {
        const message = caught instanceof Error ? caught.message : 'Could not save the appointment.';
        setError(message);
        notifyError('Could not save appointment', message);
      }
    } finally {
      setBusy(false);
    }
  };

  const endLabel = time ? formatTime(combineDateTime(date, time) + duration * 60_000) : '—';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={appointment ? 'Edit appointment' : 'New appointment'}
      description="Conflicts with leave, blocks or another booking are detected before saving."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit(conflicts.length ? overrideReason : undefined)}
            loading={busy}
            variant={conflicts.length ? 'danger' : 'primary'}
            disabled={conflicts.length > 0 && (!owner || overrideReason.trim().length < 3)}
          >
            {conflicts.length ? 'Override & save' : appointment ? 'Save changes' : 'Book appointment'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label mb-1.5 block">Customer</label>
          {customer ? (
            <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2">
              <Avatar name={customer.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink-900">{customer.name}</p>
                <p className="text-[11px] text-ink-500">{customer.phone}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setCustomerId('')}>
                Change
              </Button>
            </div>
          ) : (
            <div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer by name or phone…"
                leading={<Search className="h-4 w-4" />}
                autoFocus
              />
              <div className="mt-2 overflow-hidden rounded-xl border border-ink-200">
                <ul className="max-h-44 overflow-y-auto">
                  {customerMatches.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerId(row.id);
                          setQuery('');
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gold-50/60"
                      >
                        <Avatar name={row.name} size="xs" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-ink-800">
                            {row.name}
                          </span>
                          <span className="block text-[10.5px] text-ink-500">{row.phone}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {customerMatches.length === 0 && (
                    <li className="px-3 py-3 text-center text-[12px] text-ink-400">
                      No customer found. Add one from Customers first.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label mb-1.5 block">Services</label>
          <div className="flex flex-wrap gap-1.5">
            {services.map((service) => {
              const active = serviceIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() =>
                    setServiceIds((ids) =>
                      ids.includes(service.id)
                        ? ids.filter((id) => id !== service.id)
                        : [...ids, service.id],
                    )
                  }
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                    active
                      ? 'border-ink-900 bg-ink-900 text-cream'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
                  )}
                >
                  {active && <Check className="h-3 w-3 text-gold-300" />}
                  {service.name}
                  <span className={active ? 'text-gold-300/80' : 'text-ink-400'}>
                    {formatINR(service.price)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-400">
            {selectedServices.length
              ? `${formatDuration(duration)} · estimated ${formatINR(estimated)}`
              : 'Pick the services for this appointment.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Employee" required>
            <Select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">Select…</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" required>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Start time" required>
            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Advance collected" hint="Adjusted when you bill.">
            <MoneyInput value={advance} onChange={setAdvance} />
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as Appointment['status'])}
            >
              {(['ENQUIRY', 'TENTATIVE', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] as const).map((value) => (
                <option key={value} value={value}>
                  {APPOINTMENT_STATUS[value].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ends at">
            <div className="flex h-10 items-center rounded-xl border border-ink-200 bg-ink-50 px-3 text-[13px] tabular-nums text-ink-700">
              {endLabel}
            </div>
          </Field>
        </div>

        <Field label="Notes (optional)">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Parking, preferred products, running late…"
          />
        </Field>

        {conflicts.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4" /> Scheduling conflict
            </p>
            <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-rose-700">
              {conflicts.map((conflict) => (
                <li key={conflict.kind}>• {conflict.message}</li>
              ))}
            </ul>
            {owner ? (
              <div className="mt-3">
                <Field label="Override reason" hint="Required — recorded in the audit trail.">
                  <Input
                    value={overrideReason}
                    onChange={(event) => setOverrideReason(event.target.value)}
                    placeholder="Bridal party requested this slot"
                  />
                </Field>
              </div>
            ) : (
              <p className="mt-2 text-[11.5px] font-medium text-rose-700">
                Only the owner can override a conflict. Choose another time or employee.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">
            {error}
          </p>
        )}

        <p className="flex items-center gap-1.5 text-[11px] text-ink-400">
          <Sparkles className="h-3 w-3" /> Approved leave and salon blocks are checked automatically.
        </p>
      </div>
    </Modal>
  );
}
