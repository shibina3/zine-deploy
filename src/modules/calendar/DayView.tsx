import { Link } from 'react-router-dom';
import { CalendarDays, Plus, ReceiptText } from 'lucide-react';
import type { Appointment, CalendarBlock } from '@/types';
import { APPOINTMENT_STATUS } from '@/utils/constants';
import { cn } from '@/utils/cn';
import { dateFromEpoch, formatDate, formatTime, isToday } from '@/utils/date';
import { StatusPill } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/PageHeader';

export function DayView({
  dateISO,
  appointments,
  blocks,
  onSelect,
  onNew,
}: {
  dateISO: string;
  appointments: Appointment[];
  blocks: CalendarBlock[];
  onSelect: (appointment: Appointment) => void;
  onNew: () => void;
}) {
  const dayBlocks = blocks.filter(
    (block) => dateFromEpoch(block.startAt) <= dateISO && dateFromEpoch(block.endAt) >= dateISO,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-700">
              {isToday(dateISO) ? 'Today' : formatDate(dateISO, 'EEEE')}
            </p>
            <p className="font-display text-lg text-ink-900">{formatDate(dateISO, 'd MMMM yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-ink-500">{appointments.length} booked</span>
            <Button size="sm" leadingIcon={<Plus className="h-3.5 w-3.5" />} onClick={onNew}>
              Add
            </Button>
          </div>
        </div>

        {appointments.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarDays className="h-5 w-5" />}
            title="Nothing booked"
            description="A quiet day. Add an appointment or record a walk-in bill."
            action={
              <Button size="sm" variant="secondary" onClick={onNew}>
                Add appointment
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-16 shrink-0 text-right">
                  <p className="text-[12.5px] font-semibold tabular-nums text-ink-800">
                    {formatTime(appointment.startAt)}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-ink-400">
                    {formatTime(appointment.endAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    'h-10 w-1 rounded-full',
                    appointment.status === 'COMPLETED'
                      ? 'bg-sage-400'
                      : appointment.status === 'CANCELLED'
                        ? 'bg-ink-200'
                        : 'bg-wine-400',
                  )}
                />
                <button onClick={() => onSelect(appointment)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[13px] font-medium text-ink-900">
                    {appointment.customerName}
                  </p>
                  <p className="truncate text-[11.5px] text-ink-500">
                    {appointment.serviceNames.join(' · ') || 'Service'} · {appointment.employeeName}
                  </p>
                  {appointment.conflictOverride && (
                    <p className="mt-0.5 text-[10.5px] font-medium text-gold-700">
                      Override: {appointment.conflictOverride}
                    </p>
                  )}
                </button>
                <StatusPill meta={APPOINTMENT_STATUS[appointment.status]} />
                <Link to={`/billing/new?appointment=${appointment.id}`} className="hidden sm:block">
                  <Button size="sm" variant="ghost" leadingIcon={<ReceiptText className="h-3.5 w-3.5" />}>
                    Bill
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="space-y-3">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Blocked periods</p>
          {dayBlocks.length === 0 ? (
            <p className="mt-2 text-[12px] text-ink-400">Salon is open all day.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {dayBlocks.map((block) => (
                <li key={block.id} className="rounded-lg bg-ink-50 px-2.5 py-2">
                  <p className="text-[12px] font-medium text-ink-800">
                    {block.scope === 'SALON' ? 'Salon blocked' : block.employeeName}
                  </p>
                  <p className="text-[11px] leading-snug text-ink-500">
                    {formatTime(block.startAt)}–{formatTime(block.endAt)} · {block.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/calendar/blocks" className="mt-2 inline-block text-[11.5px] font-medium text-wine-700">
            Manage blocks
          </Link>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Day summary</p>
          <div className="mt-2 space-y-1.5 text-[12px]">
            <SummaryLine label="Confirmed" value={appointments.filter((a) => a.status === 'CONFIRMED').length} />
            <SummaryLine label="Completed" value={appointments.filter((a) => a.status === 'COMPLETED').length} />
            <SummaryLine label="Tentative" value={appointments.filter((a) => a.status === 'TENTATIVE').length} />
            <SummaryLine label="Cancelled" value={appointments.filter((a) => a.status === 'CANCELLED').length} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold tabular-nums text-ink-800">{value}</span>
    </div>
  );
}
