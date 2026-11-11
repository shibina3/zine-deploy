import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, CloudUpload, PackageX, ReceiptText, Sparkles, Users } from 'lucide-react';
import type { Appointment, Bill, BridalBooking, EmployeeLeave, Settings } from '@/types';
import type { StockLevel } from '@/modules/inventory/logic';
import { APPOINTMENT_STATUS, BILL_STATUS } from '@/utils/constants';
import { cn } from '@/utils/cn';
import { formatDate, formatTime } from '@/utils/date';
import { formatINR, formatNumber } from '@/utils/money';
import { backupOverdue } from '@/services/backup/backupService';
import { StatusPill } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card, SectionCard } from '@/components/common/Card';
import { EmptyState } from '@/components/common/PageHeader';

export function AppointmentsPanel({
  appointments,
  completed,
}: {
  appointments: Appointment[];
  completed: number;
}) {
  return (
    <SectionCard
      title="Today’s appointments"
      subtitle={`${appointments.length} booked · ${completed} completed`}
      icon={<CalendarDays className="h-4 w-4" />}
      action={
        <Link
          to="/calendar"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-wine-700 hover:text-wine-600"
        >
          Open calendar <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      }
      bodyClassName="pt-2"
    >
      {appointments.length === 0 ? (
        <EmptyState
          compact
          icon={<CalendarDays className="h-5 w-5" />}
          title="No appointments today"
          description="A quiet day so far. Add a booking or start a walk-in bill."
          action={
            <Link to="/calendar">
              <Button size="sm" variant="secondary">
                Add appointment
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {appointments.slice(0, 6).map((appointment) => (
            <li key={appointment.id} className="flex items-center gap-3 py-2.5">
              <div className="w-14 shrink-0 text-right">
                <p className="text-[12.5px] font-semibold tabular-nums text-ink-800">
                  {formatTime(appointment.startAt)}
                </p>
                <p className="text-[10px] uppercase tracking-[0.08em] text-ink-400">
                  {formatTime(appointment.endAt)}
                </p>
              </div>
              <div className="h-8 w-px bg-ink-100" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink-900">{appointment.customerName}</p>
                <p className="truncate text-[11.5px] text-ink-500">
                  {appointment.serviceNames.join(' · ')} · {appointment.employeeName}
                </p>
              </div>
              <StatusPill meta={APPOINTMENT_STATUS[appointment.status]} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function LowStockPanel({ levels }: { levels: StockLevel[] }) {
  return (
    <SectionCard
      title="Low stock"
      subtitle="Products at or below minimum"
      icon={<PackageX className="h-4 w-4" />}
      action={
        <Link to="/inventory/alerts" className="text-[12.5px] font-medium text-wine-700 hover:text-wine-600">
          View all
        </Link>
      }
    >
      {levels.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-ink-400">Stock levels look healthy.</p>
      ) : (
        <ul className="space-y-3">
          {levels.map((level) => {
            const ratio = level.product.minStock
              ? Math.min(100, Math.round((level.stock / level.product.minStock) * 100))
              : 0;
            return (
              <li key={level.product.id}>
                <div className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="truncate font-medium text-ink-800">{level.product.name}</span>
                  <span className="shrink-0 tabular-nums text-ink-500">
                    {formatNumber(level.stock)} / {formatNumber(level.product.minStock)} {level.product.unit}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={cn('h-full rounded-full', ratio < 40 ? 'bg-rose-500' : 'bg-gold-400')}
                    style={{ width: `${Math.max(6, ratio)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

export function BridalPanel({ bookings }: { bookings: BridalBooking[] }) {
  return (
    <SectionCard
      title="Upcoming bridal"
      subtitle="One booking can fill a whole day"
      icon={<Sparkles className="h-4 w-4" />}
      action={
        <Link to="/calendar/bridal" className="text-[12.5px] font-medium text-wine-700 hover:text-wine-600">
          Manage
        </Link>
      }
    >
      {bookings.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-ink-400">No bridal bookings scheduled.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              to="/calendar/bridal"
              className="block rounded-xl border border-ink-200/70 bg-white/60 p-3 transition-colors hover:border-gold-300 hover:bg-gold-50/40"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-medium text-ink-900">{booking.customerName}</p>
                <span className="rounded-full bg-wine-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-wine-700">
                  {formatDate(booking.eventDate, 'd MMM')}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11.5px] text-ink-500">
                {booking.eventType} · {booking.location || 'Location TBD'}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11.5px]">
                <span className="text-ink-500">Advance {formatINR(booking.advance)}</span>
                <span className="font-semibold text-ink-800">
                  Balance {formatINR(Math.max(0, booking.packagePrice - booking.advance))}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function TeamPanel({
  leaves,
  employeeCount,
}: {
  leaves: EmployeeLeave[];
  employeeCount: number;
}) {
  return (
    <SectionCard
      title="Team availability"
      subtitle={`${employeeCount} active employees`}
      icon={<Users className="h-4 w-4" />}
      action={
        <Link to="/employees/leave" className="text-[12.5px] font-medium text-wine-700 hover:text-wine-600">
          Leave
        </Link>
      }
    >
      {leaves.length === 0 ? (
        <p className="py-5 text-center text-[12.5px] text-ink-400">Everyone is available today.</p>
      ) : (
        <ul className="space-y-2.5">
          {leaves.map((leave) => (
            <li key={leave.id} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="truncate font-medium text-ink-800">{leave.employeeName}</span>
              <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-gold-800">
                {leave.paid ? 'Paid leave' : 'Unpaid leave'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function BackupPanel({ settings }: { settings: Settings }) {
  const overdue = backupOverdue(settings.lastBackupAt, settings.backupReminderHours);
  return (
    <Card
      className={cn(
        'overflow-hidden p-5',
        overdue ? 'border-gold-300/70 bg-gold-50/50' : 'border-sage-200/80 bg-sage-50/40',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            overdue ? 'bg-gold-400 text-ink-950' : 'bg-sage-600 text-white',
          )}
        >
          <CloudUpload className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink-900">
            {overdue ? 'Backup recommended' : 'Your data is backed up'}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
            {settings.lastBackupAt
              ? `Last backup ${formatDate(settings.lastBackupAt, 'd MMM, h:mm a')}.`
              : 'No backup has been taken on this device yet.'}
          </p>
          <Link to="/settings/backup">
            <Button size="sm" variant={overdue ? 'primary' : 'secondary'} className="mt-2.5">
              {overdue ? 'Back up now' : 'Manage backups'}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function RecentBillsPanel({ bills }: { bills: Bill[] }) {
  return (
    <SectionCard
      title="Recent bills"
      subtitle="The latest activity at the counter"
      icon={<ReceiptText className="h-4 w-4" />}
      action={
        <Link to="/billing" className="text-[12.5px] font-medium text-wine-700 hover:text-wine-600">
          All bills
        </Link>
      }
      bodyClassName="px-0 pb-0 pt-1"
    >
      <ul className="divide-y divide-ink-100">
        {bills.slice(0, 6).map((bill) => (
          <li key={bill.id} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink-900">{bill.customerName}</p>
              <p className="truncate text-[11.5px] text-ink-500">
                {bill.billNumber} · {bill.employeeName} · {formatDate(bill.billDate, 'd MMM, h:mm a')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-semibold tabular-nums text-ink-900">{formatINR(bill.total)}</p>
              {bill.balance > 0 && (
                <p className="text-[11px] tabular-nums text-rose-600">Due {formatINR(bill.balance)}</p>
              )}
            </div>
            <StatusPill meta={BILL_STATUS[bill.status]} />
          </li>
        ))}
        {!bills.length && (
          <li className="px-5">
            <EmptyState
              compact
              icon={<ReceiptText className="h-5 w-5" />}
              title="No bills yet"
              description="Create your first bill to see today’s totals come alive."
              action={
                <Link to="/billing/new">
                  <Button size="sm">Create bill</Button>
                </Link>
              }
            />
          </li>
        )}
      </ul>
    </SectionCard>
  );
}

