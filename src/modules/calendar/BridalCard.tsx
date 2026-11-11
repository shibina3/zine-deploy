import { Link } from 'react-router-dom';
import { MapPin, ReceiptText, Sparkles } from 'lucide-react';
import type { BridalBooking, BridalStatus } from '@/types';
import { setBridalStatus } from '@/db/repositories/calendarRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { BRIDAL_STATUS } from '@/utils/constants';
import { formatDate } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { StatusPill } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Select } from '@/components/common/Field';

export function BridalCard({
  booking,
  onEdit,
}: {
  booking: BridalBooking;
  onEdit: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-ink-100 bg-ink-50/40 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-ink-950 text-cream">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-gold-300">
              {formatDate(booking.eventDate, 'MMM')}
            </span>
            <span className="font-display text-lg leading-none">{formatDate(booking.eventDate, 'd')}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-[16px] font-medium text-ink-900">
              {booking.customerName}
            </p>
            <p className="text-[11.5px] text-ink-500">
              {booking.eventType} · {booking.startTime}–{booking.endTime}
            </p>
          </div>
        </div>
        <StatusPill meta={BRIDAL_STATUS[booking.status]} />
      </div>

      <div className="space-y-1.5 px-4 py-3">
        {booking.location && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-ink-500">
            <MapPin className="h-3 w-3" /> {booking.location}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-[11.5px] text-ink-500">
          <Sparkles className="h-3 w-3" /> {booking.serviceNames.join(' · ') || 'Bridal package'}
        </p>
        <p className="text-[11.5px] text-ink-500">
          Team: {booking.employeeNames.join(', ') || 'Not assigned'}
          {booking.trialDate ? ` · Trial ${formatDate(booking.trialDate, 'd MMM')}` : ''}
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <Mini label="Package" value={formatINR(booking.packagePrice)} />
          <Mini label="Advance" value={formatINR(booking.advance)} />
          <Mini
            label="Balance"
            value={formatINR(Math.max(0, booking.packagePrice - booking.advance))}
            tone="wine"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-4 py-2.5">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          Edit
        </Button>
        <Link to={`/billing/new?customer=${booking.customerId}`}>
          <Button size="sm" variant="ghost" leadingIcon={<ReceiptText className="h-3.5 w-3.5" />}>
            Bill
          </Button>
        </Link>
        <div className="ml-auto w-[150px]">
          <Select
            value={booking.status}
            onChange={async (event) => {
              const next = event.target.value as BridalStatus;
              try {
                await setBridalStatus(booking.id, next);
                notifySuccess('Booking updated', BRIDAL_STATUS[next].label);
              } catch (error) {
                notifyError('Could not update booking', error instanceof Error ? error.message : undefined);
              }
            }}
            className="[&>select]:h-8 [&>select]:text-[11.5px]"
          >
            {(Object.keys(BRIDAL_STATUS) as BridalStatus[]).map((value) => (
              <option key={value} value={value}>
                {BRIDAL_STATUS[value].label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Card>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'wine' }) {
  return (
    <div className="rounded-lg bg-ink-50/70 px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p
        className={
          tone === 'wine'
            ? 'text-[12px] font-semibold tabular-nums text-wine-700'
            : 'text-[12px] font-semibold tabular-nums text-ink-800'
        }
      >
        {value}
      </p>
    </div>
  );
}
