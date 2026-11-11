import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { BridalBooking, BridalStatus, Paise } from '@/types';
import { saveBridalBooking } from '@/db/repositories/calendarRepo';
import { useCustomers, useEmployees, useOffers, useServices } from '@/hooks/useDb';
import { BRIDAL_STATUS } from '@/utils/constants';
import { formatINR } from '@/utils/money';
import { cn } from '@/utils/cn';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select, Switch, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function BridalDialog({
  open,
  booking,
  onClose,
}: {
  open: boolean;
  booking: BridalBooking | null;
  onClose: () => void;
}) {
  const customers = useCustomers();
  const services = useServices();
  const employees = useEmployees();
  const offers = useOffers();

  const [customerId, setCustomerId] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('15:00');
  const [location, setLocation] = useState('');
  const [offerId, setOfferId] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [trialDate, setTrialDate] = useState('');
  const [packagePrice, setPackagePrice] = useState<Paise>(0);
  const [advance, setAdvance] = useState<Paise>(0);
  const [status, setStatus] = useState<BridalStatus>('TENTATIVE');
  const [blockSalon, setBlockSalon] = useState(true);
  const [requirements, setRequirements] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const bridalOffers = useMemo(
    () => offers.filter((offer) => offer.type === 'BRIDAL' || offer.type === 'COMBO'),
    [offers],
  );

  useEffect(() => {
    if (!open) return;
    setCustomerId(booking?.customerId ?? '');
    setEventType(booking?.eventType ?? 'Wedding');
    setEventDate(booking?.eventDate ?? '');
    setStartTime(booking?.startTime ?? '08:00');
    setEndTime(booking?.endTime ?? '15:00');
    setLocation(booking?.location ?? '');
    setOfferId(booking?.offerId ?? '');
    setServiceIds(booking?.serviceIds ?? []);
    setEmployeeIds(booking?.employeeIds ?? []);
    setTrialDate(booking?.trialDate ?? '');
    setPackagePrice(booking?.packagePrice ?? 0);
    setAdvance(booking?.advance ?? 0);
    setStatus(booking?.status ?? 'TENTATIVE');
    setBlockSalon(booking ? Boolean(booking.employeeIds.length) : true);
    setRequirements(booking?.specialRequirements ?? '');
    setNotes(booking?.notes ?? '');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.id]);

  const applyOffer = (id: string) => {
    setOfferId(id);
    const offer = offers.find((row) => row.id === id);
    if (offer) {
      setServiceIds(offer.serviceIds);
      setPackagePrice(offer.offerPrice);
    }
  };

  const submit = async () => {
    setError('');
    if (!customerId) return setError('Select a customer.');
    if (!eventDate) return setError('Choose the event date.');
    if (!serviceIds.length) return setError('Select at least one service or package.');
    if (packagePrice <= 0) return setError('Set the package price.');
    if (advance > packagePrice) return setError('Advance cannot be more than the package price.');

    setBusy(true);
    try {
      await saveBridalBooking({
        id: booking?.id,
        customerId,
        eventType,
        eventDate,
        startTime,
        endTime,
        location,
        offerId: offerId || undefined,
        serviceIds,
        employeeIds,
        trialDate: trialDate || undefined,
        packagePrice,
        advance,
        specialRequirements: requirements,
        notes,
        status,
        blockSalon,
      });
      notifySuccess(
        booking ? 'Bridal booking updated' : 'Bridal booking created',
        'Visible on the main calendar.',
      );
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save the booking.';
      setError(message);
      notifyError('Could not save booking', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={booking ? 'Edit bridal booking' : 'New bridal booking'}
      description="Long events, advances and trial dates in one place."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {booking ? 'Save changes' : 'Create booking'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer" required>
            <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Select customer…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.phone}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Event type" required>
            <Input
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              placeholder="Wedding / Reception"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Event date" required>
            <Input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
          </Field>
          <Field label="Start time" required>
            <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </Field>
          <Field label="End time" required>
            <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </Field>
        </div>

        <Field label="Venue / location">
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Taj Banquet Hall"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Bridal package offer" hint="Fills services and price.">
            <Select value={offerId} onChange={(event) => applyOffer(event.target.value)}>
              <option value="">Custom package</option>
              {bridalOffers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name} · {formatINR(offer.offerPrice)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Package price" required>
            <MoneyInput value={packagePrice} onChange={setPackagePrice} />
          </Field>
          <Field label="Advance" required hint="Adjusted in billing.">
            <MoneyInput value={advance} onChange={setAdvance} />
          </Field>
        </div>

        <div>
          <label className="label mb-1.5 block">Services included</label>
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
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label mb-1.5 block">Assigned employees</label>
          <div className="flex flex-wrap gap-1.5">
            {employees.map((employee) => {
              const active = employeeIds.includes(employee.id);
              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() =>
                    setEmployeeIds((ids) =>
                      ids.includes(employee.id)
                        ? ids.filter((id) => id !== employee.id)
                        : [...ids, employee.id],
                    )
                  }
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                    active
                      ? 'border-ink-900 bg-ink-900 text-cream'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
                  )}
                >
                  {employee.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Trial date" hint="Optional makeup or hair trial.">
            <Input type="date" value={trialDate} onChange={(event) => setTrialDate(event.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value as BridalStatus)}>
              {(Object.keys(BRIDAL_STATUS) as BridalStatus[]).map((value) => (
                <option key={value} value={value}>
                  {BRIDAL_STATUS[value].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
          <Switch
            checked={blockSalon}
            onChange={setBlockSalon}
            label="Block the salon for this event"
            description="Prevents other appointments from being booked in this window."
          />
        </div>

        <Field label="Special requirements">
          <Textarea
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            placeholder="HD makeup, hair extensions, two outfit changes…"
          />
        </Field>
        <Field label="Internal notes">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

